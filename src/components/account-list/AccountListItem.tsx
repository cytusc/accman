import type { Profile } from '../../types';

interface Props {
  profile: Profile;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SYNC_LABELS: Record<string, string> = { local: '本地', synced: '已同步', dirty: '待更新' };

export default function AccountListItem({ profile, active, onSelect }: Props) {
  const isOpenAI = profile.platform === 'openai';

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
      <span className={`sync-badge badge-${profile.syncStatus}`}>
        {SYNC_LABELS[profile.syncStatus] ?? profile.syncStatus}
      </span>
    </div>
  );
}
