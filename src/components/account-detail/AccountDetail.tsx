import { useAppStore } from '../../store/appStore';
import BasicInfo from './BasicInfo';
import ApiConfig from './ApiConfig';
import ModelManager from './ModelManager';

export default function AccountDetail() {
  const { getActiveProfile, submitProfile, loading, settings } = useAppStore();
  const profile = getActiveProfile();

  if (!profile) {
    return <div className="right-panel"><div className="right-panel-empty">请从左侧选择账号</div></div>;
  }

  const canSubmit = Boolean(
    profile.baseUrl.trim() &&
    settings.backendBaseUrl.trim() &&
    settings.adminApiKey.trim() &&
    profile.groupId &&
    (profile.models.some((m) => m.enabled) || profile.customMappings.length > 0)
  );

  return (
    <div className="right-panel">
      <div className="detail-scroll">
        <BasicInfo />
        <ApiConfig />
        <ModelManager />
      </div>
      <div className="submit-bar">
        <div className="submit-bar-info">
          <strong>{profile.name}</strong>
          <span>
            {profile.platform === 'openai' ? 'OpenAI' : 'Anthropic'} ·{' '}
            {profile.accountType} ·{' '}
            {profile.models.filter((m) => m.enabled).length} 个模型
            {profile.remoteId ? ` · 更新 #${profile.remoteId}` : ' · 新建'}
          </span>
        </div>
        <div className="submit-bar-right">
          {profile.remoteId && profile.accountType === 'oauth' && (
            <button
              onClick={() => useAppStore.getState().refreshOAuthAccount(profile.remoteId!)}
              disabled={loading.refreshing}
              style={{ fontSize: 13 }}
            >
              {loading.refreshing ? '刷新中…' : '刷新 Token'}
            </button>
          )}
          <button
            className="primary"
            onClick={submitProfile}
            disabled={loading.submit || !canSubmit}
            style={{ minWidth: 80 }}
          >
            {loading.submit ? '发送中…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
