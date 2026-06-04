import { useAppStore } from '../../store/appStore';
import type { Platform } from '../../types';

export default function BasicInfo() {
  const { getActiveProfile, updateActiveProfile, groups, fetchGroups, loading } = useAppStore();
  const profile = getActiveProfile();
  if (!profile) return null;

  const isOAuth = profile.accountType === 'oauth' || profile.accountType === 'setup-token';

  const setPlatform = (platform: Platform) => {
    if (profile.platform === platform) return;
    updateActiveProfile({
      platform,
      groupId: null,
      models: [],
      baseUrl: platform === 'openai' ? 'https://api.openai.com' : 'https://api.anthropic.com',
    });
    useAppStore.getState().fetchGroups(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">基础信息</div>
          <div className="card-sub">{profile.platform === 'openai' ? 'OpenAI' : 'Anthropic'} 账号配置</div>
        </div>
        {profile.remoteId ? (
          <span className="type-badge">#{profile.remoteId} · {profile.accountType}</span>
        ) : (
          <div className="segmented">
            <button className={profile.platform === 'openai' ? 'active' : ''} onClick={() => setPlatform('openai')}>OpenAI</button>
            <button className={profile.platform === 'anthropic' ? 'active' : ''} onClick={() => setPlatform('anthropic')}>Anthropic</button>
          </div>
        )}
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label>账号名称</label>
          <input
            value={profile.accountName}
            onChange={(e) => updateActiveProfile({ accountName: e.target.value })}
            placeholder="留空则发送时自动使用时间戳"
          />
        </div>

        <div className="form-row">
          <label>分组</label>
          <div className="inline-control">
            <select
              value={profile.groupId ?? ''}
              onChange={(e) => updateActiveProfile({ groupId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">选择分组</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={() => fetchGroups(true)} disabled={loading.groups}>
              {loading.groups ? '…' : '刷新'}
            </button>
          </div>
        </div>

        <div className="form-grid form-grid-2">
          <div className="form-row">
            <label>优先级</label>
            <input
              type="number" min="1" step="1"
              value={profile.priority}
              onChange={(e) => updateActiveProfile({ priority: Math.max(1, Number(e.target.value)) })}
            />
          </div>
          <div className="form-row">
            <label>池重试次数</label>
            <input
              type="number" min="1" step="1"
              value={profile.poolModeRetryCount}
              onChange={(e) => updateActiveProfile({ poolModeRetryCount: Math.max(1, Number(e.target.value)) })}
              disabled={!profile.poolMode}
            />
          </div>
        </div>

        <div className="switch-row">
          <span className="switch-label">池模式</span>
          <input
            type="checkbox"
            checked={profile.poolMode}
            onChange={(e) => updateActiveProfile({ poolMode: e.target.checked })}
          />
        </div>

        {isOAuth && profile.remoteId && (
          <div className="oauth-notice">
            🔐 OAuth 账号 — 可编辑基础配置，Token 通过"刷新 Token"按钮更新
          </div>
        )}
      </div>
    </div>
  );
}
