import type { Profile } from '../../types';
import { useAppStore } from '../../store/appStore';

interface Props {
  profile: Profile;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SYNC_LABELS: Record<string, string> = { local: '本地', synced: '已同步', dirty: '待更新' };
const STATUS_COLORS: Record<string, string> = { active: '#10b981', inactive: '#f59e0b', error: '#ef4444' };
const STATUS_LABELS: Record<string, string> = { active: '启用', inactive: '禁用', error: '异常' };

export default function AccountListItem({ profile, active, onSelect }: Props) {
  const isOpenAI = profile.platform === 'openai';
  const toggleStatus = useAppStore((s) => s.toggleAccountStatus);

  return (
    <div className={`account-item ${active ? 'active' : ''}`} onClick={onSelect}>
      <div className={`account-item-avatar ${isOpenAI ? 'avatar-openai' : 'avatar-anthropic'}`}>
        {isOpenAI ? 'OAI' : 'ANT'}
      </div>
      <div className="account-item-body">
        <div className="account-item-name">{profile.name}</div>
        <div className="account-item-meta">
          {profile.accountName || '未设置账号名'} · {profile.accountType}
          {profile.remoteId ? ` · #${profile.remoteId}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {profile.remoteId && (
          <button
            className="status-toggle"
            title={`${STATUS_LABELS[profile.accountStatus] ?? profile.accountStatus}，点击切换`}
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(profile.id);
            }}
            style={{
              width: 28,
              height: 16,
              borderRadius: 8,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: STATUS_COLORS[profile.accountStatus] ?? '#6b7280',
              position: 'relative',
              minHeight: 'auto',
              transition: 'background 0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: profile.accountStatus === 'active' ? 14 : 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }}
            />
          </button>
        )}
        <span className={`sync-badge badge-${profile.syncStatus}`}>
          {SYNC_LABELS[profile.syncStatus] ?? profile.syncStatus}
        </span>
      </div>
    </div>
  );
}
