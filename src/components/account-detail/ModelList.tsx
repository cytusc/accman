import { useAppStore } from '../../store/appStore';

export default function ModelList() {
  const { getActiveProfile, updateActiveProfile, testModel, loading } = useAppStore();
  const profile = getActiveProfile();
  if (!profile) return null;

  const toggle = (id: string) => {
    updateActiveProfile({
      models: profile.models.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m)
    });
  };

  const setEnabled = (id: string, enabled: boolean) => {
    updateActiveProfile({
      models: profile.models.map((m) => m.id === id ? { ...m, enabled } : m)
    });
  };

  if (profile.models.length === 0) {
    return (
      <div className="model-list-empty">
        点击"获取模型列表"后，模型会出现在这里并默认全选
      </div>
    );
  }

  return (
    <div className="model-list">
      {profile.models.map((m) => (
        <div key={m.id} className={`model-row ${!m.enabled ? 'disabled' : ''}`}>
          <div className="model-check">
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={() => toggle(m.id)}
            />
            <span className="model-name" title={m.id}>{m.id}</span>
          </div>
          <div className="model-actions">
            <button
              onClick={() => testModel(m.id)}
              disabled={loading.testingModel === m.id}
            >
              {loading.testingModel === m.id ? '测试中…' : '测试'}
            </button>
            <button onClick={() => setEnabled(m.id, !m.enabled)}>
              {m.enabled ? '禁用' : '启用'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
