import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Theme } from '../../types';

export default function SettingsModal() {
  const { settings, saveSettings, setSettingsOpen, fetchGroups } = useAppStore();
  const [draft, setDraft] = useState({ ...settings });

  const save = () => {
    saveSettings(draft);
    setSettingsOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">设置</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>后端地址只保存 origin，程序内部统一拼接 /api/v1</div>
          </div>
          <button className="modal-close" onClick={() => setSettingsOpen(false)}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label>后端管理地址</label>
            <input
              value={draft.backendBaseUrl}
              onChange={(e) => setDraft((d) => ({ ...d, backendBaseUrl: e.target.value }))}
              placeholder="http://localhost:8080"
            />
          </div>

          <div className="form-row">
            <label>管理员 API Key</label>
            <input
              type="password"
              value={draft.adminApiKey}
              onChange={(e) => setDraft((d) => ({ ...d, adminApiKey: e.target.value }))}
              placeholder="x-api-key"
            />
          </div>

          <div className="form-row">
            <label>主题</label>
            <select
              value={draft.theme}
              onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value as Theme }))}
            >
              <option value="light">日间模式</option>
              <option value="dark">夜间模式</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={async () => { saveSettings(draft); await fetchGroups(true); }}>
            测试连接
          </button>
          <button onClick={() => setSettingsOpen(false)}>取消</button>
          <button className="primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}
