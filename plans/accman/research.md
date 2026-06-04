# accman — Research

## 项目定位
sub2desk-main 的增强重写版：Rust 后端层直接复用/扩展，前端由 Vue 3 改为 React 18 + TypeScript，新增左右双栏布局、自定义模型映射、后端账号导入三项核心功能。

## 参考代码库
- `D:\code\sub2desk-main` — 当前可运行的 Tauri 2 + Vue 3 实现（完整 Rust 命令层）
- `D:\code\sub2api-main` — sub2api 后端源码（接口规范参考）

---

## 技术栈确认
| 层 | 技术 |
|----|------|
| 桌面容器 | Tauri 2 |
| 前端框架 | React 18 + TypeScript |
| UI 组件 | Tailwind CSS（自带 + CSS 变量主题） |
| 状态管理 | Zustand（轻量，适合 Tauri 场景） |
| 构建工具 | Vite 6 |
| Rust 依赖 | reqwest, serde, keyring, uuid, time（与 sub2desk-main 一致） |

---

## 后端 API 接口清单（sub2api）

### 认证
所有管理接口需 `x-api-key: {adminApiKey}` 请求头。

### 账号接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/accounts` | 列表（分页，支持 platform/status/search/group 过滤） |
| POST | `/api/v1/admin/accounts` | 创建账号（Idempotency-Key 幂等） |
| PUT | `/api/v1/admin/accounts/:id` | 更新账号（credentials 空对象 = 不更新敏感键） |
| DELETE | `/api/v1/admin/accounts/:id` | 删除账号 |
| POST | `/api/v1/admin/accounts/:id/refresh` | 刷新 OAuth token |

### credentials 更新语义（关键）
- `credentials: {}` → 跳过 credentials 更新（`len == 0` 闸门）
- `credentials: {"base_url": "x"}` 不带 api_key → api_key 自动保留（MergePreservingSensitiveCreds）
- `credentials: {"api_key": "sk-new"}` → 覆盖 api_key

### 分组接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/groups/all?platform=openai` | 获取所有分组 |

### 响应格式
```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```
分页响应 data 包含 `{ "items": [...], "total": 100 }`

### 账号列表字段（脱敏后）
```json
{
  "id": 42,
  "name": "demo",
  "platform": "anthropic",
  "type": "apikey",
  "status": "active",
  "priority": 1,
  "credentials": {
    "base_url": "https://api.anthropic.com",
    "model_mapping": { "claude-3-5-sonnet": "claude-3-5-sonnet" }
  },
  "credentials_status": {
    "has_api_key": true,
    "has_access_token": false
  },
  "group_ids": [1, 2]
}
```
**注意**：api_key / access_token 等敏感字段不返回，通过 credentials_status 标识是否已设置。

---

## sub2desk-main Rust 命令复用分析

### 可直接复用（无需修改）
| 命令 | 说明 |
|------|------|
| `load_state` | 加载本地状态 + keyring |
| `save_state` | 保存本地状态（API Key 走 keyring） |
| `fetch_groups` | 获取分组列表 |
| `fetch_models` | 从上游获取模型列表 |
| `test_model` | 发送"你好"测试消息 |
| `submit_profile` | 创建账号（POST） |

### 需要新增
| 命令 | 说明 |
|------|------|
| `list_remote_accounts` | 从后端拉取账号列表（分页） |
| `update_profile` | 更新已有账号（PUT，支持 remoteId） |
| `delete_remote_account` | 删除后端账号（DELETE） |
| `refresh_oauth_account` | 刷新 OAuth token |

### 需要扩展的数据结构
- `Profile` 新增字段：`remoteId?: i64`（关联后端账号 ID）、`syncStatus: "local" | "synced" | "dirty"`
- `ModelItem` 新增字段：`customName?: String`（自定义映射名）
- `AppState` 保持向后兼容（旧版 state.json 可正常加载）

---

## 前端架构设计（React 重写）

### 路由/页面结构
```
App
├── TopBar（品牌 + 设置按钮）
├── PlatformFilter（OpenAI / Anthropic 切换）
├── Main（左右双栏）
│   ├── Left: AccountList
│   │   ├── SearchBar
│   │   ├── AccountListItem（名称、平台图标、分组、状态徽章）
│   │   └── ActionBar（添加、导入、删除）
│   └── Right: AccountDetail
│       ├── BasicInfo（平台标识、池模式、分组选择）
│       ├── ApiConfig（BaseURL、API Key、获取模型按钮）
│       ├── ModelManager
│       │   ├── ModelList（全选、禁用、测试）
│       │   └── CustomMappingTable（手动添加/编辑/删除映射）
│       └── ActionBar（发送按钮）
└── SettingsModal（后端地址、Admin Key、主题）
```

### 状态管理（Zustand）
```typescript
// store/appStore.ts
interface AppStore {
  profiles: Profile[]
  activeProfileId: string
  settings: Settings
  groups: GroupOption[]
  // actions
  addProfile / updateProfile / deleteProfile / selectProfile
  fetchRemoteAccounts / importAccount
  refreshGroups / fetchModels / testModel / submitProfile
}
```

---

## 三项核心新功能实现方案

### 1. 左右双栏布局
- 左栏：`minmax(280px, 340px)`，固定宽度，可滚动账号列表
- 右栏：`1fr`，详细配置面板
- 响应式：`< 768px` 时切换为单栏 + 底部抽屉

### 2. 自定义模型映射
- 每个 Profile 存储 `customMappings: Array<{from: string, to: string}>`
- UI：可编辑表格，支持行内编辑 + 删除
- 提交时合并到 `model_mapping`：自动映射（id → id）+ 自定义映射

### 3. 后端账号导入（方案 C 混合）
- 入口：左侧"导入"按钮 → 弹出账号列表（从 `/api/v1/admin/accounts` 拉取）
- 已导入的账号在列表中显示"已导入"标记（通过 remoteId 比对）
- 导入后 syncStatus = "synced"，修改后 = "dirty"
- api_key 字段：已设置的显示占位符"●●●●●●"（credentials_status.has_api_key = true）

---

## 关键设计决策

### Profile 本地存储结构（扩展版）
```typescript
interface Profile {
  // 原有字段（兼容 sub2desk-main）
  id: string                    // 本地 UUID
  name: string
  accountName: string
  platform: 'openai' | 'anthropic'
  poolMode: boolean
  poolModeRetryCount: number
  priority: number
  groupId: number | null
  baseUrl: string
  apiKey: string                // 本地暂存（不持久化，走 keyring）
  models: ModelItem[]
  lastFetchedAt: string | null
  // 新增字段
  remoteId: number | null       // 后端账号 ID（导入时赋值）
  syncStatus: 'local' | 'synced' | 'dirty'  // 同步状态
  accountType: 'apikey' | 'oauth' | 'setup-token'  // 账号类型
  customMappings: Array<{from: string, to: string}>  // 自定义模型映射
  credentialsStatus: Record<string, boolean> | null  // 从后端导入时的脱敏状态
}
```

### 安全策略
- apiKey 字段：Tauri 环境走 keyring，浏览器预览模式走 sessionStorage（不持久化）
- state.json 不存储任何敏感字段（与 sub2desk-main 一致）
- 导入的后端账号 api_key 字段默认空字符串（用户需手动填写才能提交更新）

---

## 工作量估算

| 模块 | 估计工时 |
|------|---------|
| Tauri 项目初始化（React 替换 Vue） | 0.5h |
| Rust 层扩展（3 个新命令） | 2h |
| React 前端框架搭建（路由、Store） | 1h |
| 左侧账号列表组件 | 2h |
| 右侧详情面板（BasicInfo + ApiConfig） | 2h |
| 模型管理区（ModelList + CustomMapping） | 2h |
| 设置弹窗 | 0.5h |
| 后端导入弹窗 | 1.5h |
| 主题系统（CSS 变量 light/dark） | 0.5h |
| 联调测试 | 1h |
| **合计** | **~13h** |
