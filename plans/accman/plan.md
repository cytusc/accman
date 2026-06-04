# accman — 执行计划

## 分工模型（/cross-model）
- **Claude**：Tauri Rust 后端层（src-tauri/）、API 接口命令、数据结构、存储层
- **Gemini**：React 前端层（src/）、组件、样式、Zustand store、UI 交互

---

## Phase 0：项目初始化（主进程执行）
**目标**：从 sub2desk-main 克隆出 accman 骨架，替换 Vue → React

### 步骤
1. 复制 `sub2desk-main` 到 `sub2desk`（当前目录）
2. 安装 React 替换 Vue（保留 Tauri 相关依赖）
3. 修改 `tauri.conf.json`：appName → `accman`
4. 清空 src/App.vue → 创建 src/App.tsx 骨架

**验收标准**：`npm run tauri dev` 能启动，显示 "accman" 标题

---

## Phase 1：Rust 后端扩展（Claude 负责）
**目标**：在 sub2desk-main 的 lib.rs 基础上扩展 4 个新命令

### 数据结构扩展
```rust
struct Profile {
  // 原有字段...
  remote_id: Option<i64>,
  sync_status: String,       // "local" | "synced" | "dirty"
  account_type: String,      // "apikey" | "oauth" | "setup-token"
  custom_mappings: Vec<CustomMapping>,
  credentials_status: Option<HashMap<String, bool>>,
}

struct CustomMapping { from: String, to: String }

struct RemoteAccount {
  id: i64, name: String, platform: String,
  account_type: String, status: String,
  credentials: HashMap<String, serde_json::Value>,
  credentials_status: HashMap<String, bool>,
  group_ids: Vec<i64>,
  priority: i32,
}
```

### 新增命令
| 命令 | 签名 | 说明 |
|------|------|------|
| `list_remote_accounts` | `(settings, platform?, page, page_size)` → `PaginatedResult<RemoteAccount>` | 从后端拉取账号列表 |
| `update_profile` | `(settings, profile)` → `SubmitResult` | PUT 更新已有账号（profile.remoteId 非 null） |
| `delete_remote_account` | `(settings, account_id)` → `()` | DELETE 后端账号 |
| `refresh_oauth_account` | `(settings, account_id)` → `()` | POST 刷新 OAuth token |

### submit_profile 扩展
- 有 `remote_id` → 调用 PUT `/api/v1/admin/accounts/:id`
- 无 `remote_id` → 调用 POST `/api/v1/admin/accounts`（现有逻辑）

### model_mapping 构建逻辑
```rust
// enabled models（id→id）+ custom_mappings（from→to）合并
let mut mapping = BTreeMap::new();
for model in enabled_models { mapping.insert(model.id.clone(), model.id.clone()); }
for cm in &profile.custom_mappings { mapping.insert(cm.from.clone(), cm.to.clone()); }
```

**验收标准**：`cargo build` 无报错，Tauri invoke 调用 `list_remote_accounts` 返回正确数据结构

---

## Phase 2：React 前端搭建（Gemini 负责）
**目标**：搭建 React 应用骨架 + Zustand store

### 文件结构
```
src/
├── main.tsx
├── App.tsx
├── store/
│   └── appStore.ts          # Zustand store（全部业务状态）
├── types/
│   └── index.ts             # Profile、Settings、GroupOption 等类型
├── components/
│   ├── TopBar.tsx
│   ├── PlatformFilter.tsx
│   ├── account-list/
│   │   ├── AccountList.tsx
│   │   ├── AccountListItem.tsx
│   │   └── ImportModal.tsx
│   ├── account-detail/
│   │   ├── AccountDetail.tsx
│   │   ├── BasicInfo.tsx
│   │   ├── ApiConfig.tsx
│   │   ├── ModelManager.tsx
│   │   ├── ModelList.tsx
│   │   └── CustomMappingTable.tsx
│   └── settings/
│       └── SettingsModal.tsx
├── hooks/
│   └── useToast.ts
└── styles/
    └── globals.css          # CSS 变量 + 主题
```

### Zustand Store 设计
```typescript
// appStore.ts
interface AppStore {
  // 状态
  profiles: Profile[]
  activeProfileId: string
  settings: Settings
  groups: GroupOption[]
  loading: LoadingState
  toasts: Toast[]
  // UI 状态
  settingsOpen: boolean
  importModalOpen: boolean
  platformFilter: 'openai' | 'anthropic' | 'all'
  // Actions（调用 Tauri invoke）
  init: () => Promise<void>
  addProfile: () => void
  updateActiveProfile: (patch: Partial<Profile>) => void
  deleteProfile: (id: string) => void
  selectProfile: (id: string) => void
  fetchGroups: () => Promise<void>
  fetchModels: () => Promise<void>
  testModel: (modelId: string) => Promise<void>
  submitProfile: () => Promise<void>
  listRemoteAccounts: (page: number) => Promise<PaginatedResult<RemoteAccount>>
  importRemoteAccount: (remote: RemoteAccount) => void
  deleteRemoteAccount: (accountId: number) => Promise<void>
  refreshOAuthAccount: (accountId: number) => Promise<void>
  saveSettings: (settings: Settings) => void
}
```

**验收标准**：`npm run dev` 可访问，左右双栏布局渲染，store 初始化无报错

---

## Phase 3：核心功能实现（并行执行）

### 3A：左侧账号列表（Gemini）
- AccountListItem：名称、平台图标（O/A 色块）、分组名、syncStatus 徽章（本地/已同步/待更新）
- 平台筛选：顶部 Tab 切换 OpenAI / Anthropic / 全部
- 操作：添加（新建空 Profile）、删除（带确认弹窗）、导入（打开 ImportModal）

### 3B：右侧详情面板 BasicInfo + ApiConfig（Gemini）
- BasicInfo：平台标识（只读）、账号类型徽章、池模式开关、分组下拉（含刷新）
- ApiConfig：BaseURL 输入、API Key 密码框（show/hide）、"获取模型列表"按钮
- OAuth 账号特殊处理：API Key 字段灰显 + 提示 + "刷新 Token"按钮

### 3C：模型管理区（Gemini）
- ModelList：全选按钮、每行（checkbox + 名称 + 测试按钮 + 禁用按钮）
- CustomMappingTable：可编辑表格（from → to），支持添加行、删除行、行内编辑
- 禁用模型收折到底部，半透明显示

### 3D：导入弹窗（Gemini）
- 从后端拉取账号列表，分页展示
- 每行：名称、平台、状态、credentials_status（has_api_key 图标）、已导入标记
- 点击"导入"→ 创建本地 Profile（baseUrl/modelMapping/groupId 预填，apiKey 留空）

### 3E：设置弹窗（Gemini）
- 后端地址输入框
- Admin API Key 密码框
- 主题选择（日间/夜间）
- "测试连接"按钮（调用 fetch_groups 验证）

---

## Phase 4：集成联调（主进程执行）
1. 前后端 invoke 接口对接验证
2. 主题切换（CSS 变量 data-theme 切换）
3. Toast 通知系统
4. 加载状态（按钮 loading、骨架屏）
5. 键盘快捷键（Escape 关闭弹窗，Ctrl+S 保存）

---

## Phase 5：审查与交付（主进程执行）
1. `cargo clippy` + `cargo test`（unit 标签）
2. TypeScript 类型检查 `vue-tsc --noEmit` → `tsc --noEmit`
3. `npm run build` 成功
4. 功能回归测试清单
5. Git commit（原子化）+ 推送

---

## 风险与约束

| 风险 | 缓解方案 |
|------|---------|
| Rust 层 AppState 向后兼容 | 新字段加 `#[serde(default)]`，旧 state.json 正常加载 |
| sub2api 后端不可用 | 浏览器预览模式 + 本地缓存兜底 |
| 自定义映射与自动映射冲突 | from 相同时自定义优先（BTreeMap 后插覆盖） |
| keyring 在 CI/无桌面环境失败 | 保持 sub2desk-main 的 fallback 逻辑（失败静默返回空） |

---

## 验收清单（完成标准）

- [ ] 左右双栏布局正常渲染
- [ ] 账号列表可按平台筛选
- [ ] 添加/删除本地 Profile 正常
- [ ] 从后端导入账号，remoteId 正确赋值
- [ ] 分组刷新、模型获取、模型测试正常
- [ ] 自定义映射表格可增删改
- [ ] 提交新建账号成功（POST）
- [ ] 提交更新已有账号成功（PUT，空 apiKey 时敏感字段不被清空）
- [ ] OAuth 账号 API Key 字段灰显，刷新 Token 按钮可用
- [ ] 设置面板保存后立即生效
- [ ] 主题切换（light/dark）正常
- [ ] 本地状态在重启后恢复
- [ ] `npm run build` + `cargo build` 均无报错
