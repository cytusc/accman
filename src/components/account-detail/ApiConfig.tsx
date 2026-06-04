import { useState } from 'react';
import { useAppStore } from '../../store/appStore';

export default function ApiConfig() {
  const { getActiveProfile, updateActiveProfile, fetchModels, loading } = useAppStore();
  const profile = getActiveProfile();
  const [showKey, setShowKey] = useState(false);
  if (!profile) return null;

  const isOAuth = profile.accountType === 'oauth' || profile.accountType === 'setup-token';
  const hasRemoteKey = profile.credentialsStatus?.has_api_key || profile.credentialsStatus?.has_access_token;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">API 配置</div>
          <div className="card-sub">上游服务连接信息</div>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label>Base URL</label>
          <input
            value={profile.baseUrl}
            onChange={(e) => updateActiveProfile({ baseUrl: e.target.value.trim() })}
            placeholder="https://api.openai.com"
          />
        </div>

        <div className="form-row">
          <label>
            API Key
            {isOAuth && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>（OAuth 账号无法手动设置 Key）</span>}
          </label>
          {isOAuth && profile.remoteId ? (
            <div className="oauth-notice">
              {hasRemoteKey ? '🔑 后端已设置 Token（OAuth 账号不返回明文）' : '⚠️ 后端未设置 Token'}
            </div>
          ) : (
            <div className="password-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                value={profile.apiKey}
                onChange={(e) => updateActiveProfile({ apiKey: e.target.value.trim() })}
                placeholder={hasRemoteKey ? '●●●●●● 已设置（留空则不更新）' : '上游账号 API Key'}
              />
              <button className="password-toggle" type="button" onClick={() => setShowKey(!showKey)}>
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={fetchModels} disabled={loading.models || isOAuth}>
            {loading.models ? '获取中…' : '获取模型列表'}
          </button>
        </div>

        {profile.lastFetchedAt && (
          <div className="muted" style={{ fontSize: 12 }}>
            上次获取：{new Date(profile.lastFetchedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
