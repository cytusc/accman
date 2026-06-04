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

  const missingFields: string[] = [];
  if (!profile.baseUrl.trim()) missingFields.push('Base URL');
  if (!settings.backendBaseUrl.trim()) missingFields.push('后端管理地址');
  if (!settings.adminApiKey.trim()) missingFields.push('管理员 API Key');
  if (!profile.groupIds || profile.groupIds.length === 0) missingFields.push('分组');
  if (!profile.models.some((m) => m.enabled) && profile.customMappings.length === 0) missingFields.push('至少选择一个模型');
  const canSubmit = missingFields.length === 0;

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
            {missingFields.length > 0 && !canSubmit && (
              <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                ⚠ 缺少: {missingFields.join('、')}
              </span>
            )}
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
