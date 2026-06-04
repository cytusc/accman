import { useAppStore } from '../../store/appStore';
import AccountListItem from './AccountListItem';

const FILTERS = [
  { label: '全部', value: 'all' as const },
  { label: 'OpenAI', value: 'openai' as const },
  { label: 'Anthropic', value: 'anthropic' as const },
];

export default function AccountList() {
  const {
    getFilteredProfiles,
    activeProfileId,
    selectProfile,
    addProfile,
    setImportModalOpen,
    setConfirmDeleteProfileId,
    setPlatformFilter,
    platformFilter,
  } = useAppStore();
  const profiles = getFilteredProfiles();

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <h2>账号列表</h2>
      </div>

      <div className="platform-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`platform-tab ${platformFilter === f.value ? 'active' : ''}`}
            onClick={() => setPlatformFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="account-list">
        {profiles.length === 0 ? (
          <div className="account-list-empty">
            <div>暂无账号</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>点击"添加"或"导入"开始</div>
          </div>
        ) : (
          profiles.map((p) => (
            <AccountListItem
              key={p.id}
              profile={p}
              active={p.id === activeProfileId}
              onSelect={() => selectProfile(p.id)}
              onDelete={() => setConfirmDeleteProfileId(p.id)}
            />
          ))
        )}
      </div>

      <div className="left-panel-actions">
        <button onClick={addProfile}>+ 添加</button>
        <button onClick={() => setImportModalOpen(true)}>↓ 导入</button>
        <ConfirmDeleteButton />
      </div>
    </div>
  );
}

function ConfirmDeleteButton() {
  const { confirmDeleteProfileId, deleteProfile, setConfirmDeleteProfileId, activeProfileId } = useAppStore();

  if (!confirmDeleteProfileId) {
    return (
      <button
        className="danger-btn"
        onClick={() => setConfirmDeleteProfileId(activeProfileId)}
        title="删除当前账号"
      >
        删除
      </button>
    );
  }

  return (
    <>
      <button className="danger-btn" onClick={() => deleteProfile(confirmDeleteProfileId)}>确认</button>
      <button onClick={() => setConfirmDeleteProfileId(null)}>取消</button>
    </>
  );
}
