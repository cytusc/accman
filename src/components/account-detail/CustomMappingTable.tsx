import { useAppStore } from '../../store/appStore';
import type { CustomMapping } from '../../types';

export default function CustomMappingTable() {
  const { getActiveProfile, updateActiveProfile } = useAppStore();
  const profile = getActiveProfile();
  if (!profile) return null;

  const mappings = profile.customMappings;

  const update = (idx: number, patch: Partial<CustomMapping>) => {
    updateActiveProfile({
      customMappings: mappings.map((m, i) => i === idx ? { ...m, ...patch } : m)
    });
  };

  const remove = (idx: number) => {
    updateActiveProfile({ customMappings: mappings.filter((_, i) => i !== idx) });
  };

  const add = () => {
    updateActiveProfile({ customMappings: [...mappings, { from: '', to: '' }] });
  };

  return (
    <div className="mapping-table">
      {mappings.length === 0 && (
        <div className="muted" style={{ fontSize: 12 }}>
          左侧为接口对外暴露的模型名称，右侧为实际请求上游的模型名称。
        </div>
      )}
      {mappings.map((m, i) => (
        <div key={i} className="mapping-row">
          <input
            value={m.from}
            onChange={(e) => update(i, { from: e.target.value })}
            placeholder="接口对外模型名"
          />
          <span className="mapping-arrow">→</span>
          <input
            value={m.to}
            onChange={(e) => update(i, { to: e.target.value })}
            placeholder="上游实际模型名"
          />
          <button className="mapping-delete" onClick={() => remove(i)} title="删除">×</button>
        </div>
      ))}
      <button className="mapping-add" onClick={add}>+ 添加映射</button>
    </div>
  );
}
