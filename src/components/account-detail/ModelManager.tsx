import { useAppStore } from '../../store/appStore';
import ModelList from './ModelList';
import CustomMappingTable from './CustomMappingTable';

export default function ModelManager() {
  const { getActiveProfile, updateActiveProfile } = useAppStore();
  const profile = getActiveProfile();
  if (!profile) return null;

  const enabledCount = profile.models.filter((m) => m.enabled).length;
  const disabledCount = profile.models.length - enabledCount;

  const selectAll = () => updateActiveProfile({ models: profile.models.map((m) => ({ ...m, enabled: true })) });
  const deselectAll = () => updateActiveProfile({ models: profile.models.map((m) => ({ ...m, enabled: false })) });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">模型管理</div>
          <div className="card-sub">{enabledCount} 已启用 · {disabledCount} 已禁用 · {profile.customMappings.length} 自定义映射</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ fontSize: 12, minHeight: 28 }} onClick={selectAll} disabled={profile.models.length === 0}>全选</button>
          <button style={{ fontSize: 12, minHeight: 28 }} onClick={deselectAll} disabled={profile.models.length === 0}>全不选</button>
        </div>
      </div>

      <ModelList />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
        <div className="card-title" style={{ marginBottom: 10, fontSize: 13 }}>自定义模型映射</div>
        <CustomMappingTable />
      </div>
    </div>
  );
}
