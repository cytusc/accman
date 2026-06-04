import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import TopBar from './components/TopBar';
import AccountList from './components/account-list/AccountList';
import AccountDetail from './components/account-detail/AccountDetail';
import SettingsModal from './components/settings/SettingsModal';
import ImportModal from './components/account-list/ImportModal';
import ToastStack from './components/ToastStack';

export default function App() {
  const { init, loading, settingsOpen, importModalOpen } = useAppStore();

  useEffect(() => { init(); }, [init]);

  if (loading.boot) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--muted)', fontSize: 14 }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workspace">
        <AccountList />
        <AccountDetail />
      </div>
      {settingsOpen && <SettingsModal />}
      {importModalOpen && <ImportModal />}
      <ToastStack />
    </div>
  );
}
