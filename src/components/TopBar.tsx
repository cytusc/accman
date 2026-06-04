import { useAppStore } from '../store/appStore';

export default function TopBar() {
  const { settings, loading, setSettingsOpen } = useAppStore();

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">AM</span>
        <div>
          <h1>accman</h1>
          <div className="brand-sub">{loading.saving ? '正在保存…' : '本地已保存'}</div>
        </div>
      </div>
      <div className="topbar-right">
        <span className="muted" style={{ fontSize: 12 }}>{settings.backendBaseUrl || '未配置后端'}</span>
        <button className="icon-btn" title="设置" onClick={() => setSettingsOpen(true)}>⚙</button>
      </div>
    </header>
  );
}
