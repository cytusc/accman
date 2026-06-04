import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Profile, Settings, GroupOption, AppState, Toast, LoadingState, PaginatedAccounts, RemoteAccount, ModelItem } from '../types';

// isTauri 检测
const isTauri = Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
const STORAGE_KEY = 'accman-browser-state';
let toastId = 1;

// 默认 Profile 工厂
function createProfile(name: string): Profile {
  return {
    id: crypto.randomUUID(),
    name,
    accountName: '',
    platform: 'openai',
    poolMode: false,
    poolModeRetryCount: 3,
    priority: 1,
    groupIds: [],
    baseUrl: 'https://api.openai.com',
    apiKey: '',
    models: [],
    lastFetchedAt: null,
    remoteId: null,
    syncStatus: 'local',
    accountType: 'apikey',
    customMappings: [],
    credentialsStatus: null,
  };
}

function createDefaultState(): AppState {
  const profiles = [1, 2, 3].map((i) => createProfile(`Profile ${i}`));
  return {
    profiles,
    activeProfileId: profiles[0].id,
    settings: { backendBaseUrl: 'http://localhost:8080', adminApiKey: '', theme: 'light' },
  };
}

function normalizeProfile(p: Partial<Profile>, idx: number): Profile {
  return {
    ...createProfile(`Profile ${idx + 1}`),
    ...p,
    id: p.id || crypto.randomUUID(),
    name: p.name?.trim() || `Profile ${idx + 1}`,
    accountName: p.accountName?.trim() || '',
    priority: Number(p.priority) > 0 ? Number(p.priority) : 1,
    poolModeRetryCount: Number(p.poolModeRetryCount) > 0 ? Number(p.poolModeRetryCount) : 3,
    groupIds: Array.isArray(p.groupIds) ? p.groupIds : [],
    models: Array.isArray(p.models) ? p.models : [],
    remoteId: p.remoteId ?? null,
    syncStatus: p.syncStatus || 'local',
    accountType: p.accountType || 'apikey',
    customMappings: Array.isArray(p.customMappings) ? p.customMappings : [],
    credentialsStatus: p.credentialsStatus ?? null,
  };
}

function normalizeState(raw: AppState): AppState {
  const s = raw ?? createDefaultState();
  const profiles = Array.isArray(s.profiles) && s.profiles.length > 0
    ? s.profiles.map((p, i) => normalizeProfile(p, i))
    : createDefaultState().profiles;
  const activeProfileId = profiles.some((p) => p.id === s.activeProfileId)
    ? s.activeProfileId
    : profiles[0].id;
  return {
    profiles,
    activeProfileId,
    settings: {
      backendBaseUrl: s.settings?.backendBaseUrl || 'http://localhost:8080',
      adminApiKey: s.settings?.adminApiKey || '',
      theme: s.settings?.theme === 'dark' ? 'dark' : 'light',
    },
  };
}

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface AppStore {
  // 状态
  profiles: Profile[];
  activeProfileId: string;
  settings: Settings;
  groups: GroupOption[];
  loading: LoadingState;
  toasts: Toast[];
  settingsOpen: boolean;
  importModalOpen: boolean;
  platformFilter: 'openai' | 'anthropic' | 'all';
  confirmDeleteProfileId: string | null;
  // 计算属性（getter方法）
  getActiveProfile: () => Profile | undefined;
  getFilteredProfiles: () => Profile[];
  // Actions
  init: () => Promise<void>;
  addProfile: () => void;
  updateActiveProfile: (patch: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  selectProfile: (id: string) => void;
  setPlatformFilter: (f: 'openai' | 'anthropic' | 'all') => void;
  fetchGroups: (showSuccess?: boolean) => Promise<void>;
  fetchModels: () => Promise<void>;
  syncUpstreamModels: () => Promise<void>;
  testModel: (modelId: string) => Promise<void>;
  submitProfile: () => Promise<void>;
  listRemoteAccounts: (page: number, platform?: string) => Promise<PaginatedAccounts>;
  importRemoteAccount: (remote: RemoteAccount) => void;
  deleteRemoteAccount: (accountId: number) => Promise<void>;
  refreshOAuthAccount: (accountId: number) => Promise<void>;
  saveSettings: (s: Partial<Settings>) => void;
  setSettingsOpen: (v: boolean) => void;
  setImportModalOpen: (v: boolean) => void;
  setConfirmDeleteProfileId: (id: string | null) => void;
  pushToast: (kind: Toast['kind'], text: string) => void;
  scheduleSave: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppStore>((set, get) => ({
  profiles: [],
  activeProfileId: '',
  settings: { backendBaseUrl: 'http://localhost:8080', adminApiKey: '', theme: 'light' },
  groups: [],
  loading: { boot: true, saving: false, groups: false, models: false, submit: false, testingModel: '', remoteList: false, deleting: false, refreshing: false },
  toasts: [],
  settingsOpen: false,
  importModalOpen: false,
  platformFilter: 'all',
  confirmDeleteProfileId: null,

  getActiveProfile: () => {
    const { profiles, activeProfileId } = get();
    return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  },

  getFilteredProfiles: () => {
    const { profiles, platformFilter } = get();
    if (platformFilter === 'all') return profiles;
    return profiles.filter((p) => p.platform === platformFilter);
  },

  init: async () => {
    try {
      let state: AppState;
      if (isTauri) {
        state = normalizeState(await invoke<AppState>('load_state'));
      } else {
        const cached = window.localStorage.getItem(STORAGE_KEY);
        state = cached ? normalizeState(JSON.parse(cached)) : createDefaultState();
        get().pushToast('info', '浏览器预览模式：网络请求需在 Tauri 桌面环境中执行');
      }
      document.documentElement.dataset.theme = state.settings.theme;
      set({ profiles: state.profiles, activeProfileId: state.activeProfileId, settings: state.settings, loading: { ...get().loading, boot: false } });
      await get().fetchGroups(false);
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
      set((s) => ({ loading: { ...s.loading, boot: false } }));
    }
  },

  addProfile: () => {
    const { profiles } = get();
    const p = createProfile(`Profile ${profiles.length + 1}`);
    set({ profiles: [...profiles, p], activeProfileId: p.id });
    get().scheduleSave();
  },

  updateActiveProfile: (patch) => {
    const { profiles, activeProfileId } = get();
    const updated = profiles.map((p) => p.id === activeProfileId ? { ...p, ...patch, syncStatus: p.remoteId ? 'dirty' as const : p.syncStatus } : p);
    set({ profiles: updated });
    get().scheduleSave();
  },

  deleteProfile: (id) => {
    const { profiles, activeProfileId } = get();
    if (profiles.length <= 1) { get().pushToast('error', '至少保留一个 Profile'); return; }
    const idx = profiles.findIndex((p) => p.id === id);
    const next = profiles.filter((p) => p.id !== id);
    const nextActive = activeProfileId === id ? (next[Math.max(0, idx - 1)]?.id ?? next[0].id) : activeProfileId;
    set({ profiles: next, activeProfileId: nextActive, confirmDeleteProfileId: null });
    get().scheduleSave();
  },

  selectProfile: (id) => { set({ activeProfileId: id }); },

  setPlatformFilter: (f) => { set({ platformFilter: f }); },

  fetchGroups: async (showSuccess = true) => {
    const { settings, getActiveProfile } = get();
    const profile = getActiveProfile();
    if (!profile || !settings.backendBaseUrl.trim() || !isTauri) return;
    set((s) => ({ loading: { ...s.loading, groups: true } }));
    try {
      const groups = await invoke<GroupOption[]>('fetch_groups', { settings, platform: profile.platform });
      set({ groups });
      if (showSuccess) get().pushToast('success', `已加载 ${groups.length} 个分组`);
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, groups: false } }));
    }
  },

  fetchModels: async () => {
    const profile = get().getActiveProfile();
    if (!profile) return;
    set((s) => ({ loading: { ...s.loading, models: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中获取模型列表');
      const fetched = await invoke<{ id: string; enabled: boolean }[]>('fetch_models', { profile });
      const previous = new Map(profile.models.map((m) => [m.id, m.enabled]));
      const models = fetched.map((m) => ({ id: m.id, enabled: previous.has(m.id) ? Boolean(previous.get(m.id)) : true }));
      get().updateActiveProfile({ models, lastFetchedAt: new Date().toISOString() });
      get().pushToast('success', `已获取 ${models.length} 个模型`);
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, models: false } }));
    }
  },

  syncUpstreamModels: async () => {
    const { settings, getActiveProfile } = get();
    const profile = getActiveProfile();
    if (!profile?.remoteId) {
      get().pushToast('error', '仅导入的账号（有远程 ID）可使用此功能');
      return;
    }
    set((s) => ({ loading: { ...s.loading, models: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中使用此功能');
      const fetched = await invoke<ModelItem[]>('sync_upstream_models', {
        settings,
        accountId: profile.remoteId,
      });
      const previous = new Map(profile.models.map((m) => [m.id, m.enabled]));
      const models = fetched.map((m) => ({
        id: m.id,
        enabled: previous.has(m.id) ? Boolean(previous.get(m.id)) : true,
      }));
      get().updateActiveProfile({ models, lastFetchedAt: new Date().toISOString() });
      get().pushToast('success', `已从后端同步 ${models.length} 个模型`);
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, models: false } }));
    }
  },

  testModel: async (modelId) => {
    const profile = get().getActiveProfile();
    if (!profile) return;
    set((s) => ({ loading: { ...s.loading, testingModel: modelId } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中测试模型');
      const result = await invoke<{ message: string }>('test_model', { profile, modelId });
      get().pushToast('success', `${modelId}: ${result.message}`);
    } catch (e) {
      get().pushToast('error', `${modelId}: ${toErrorMessage(e)}`);
    } finally {
      set((s) => ({ loading: { ...s.loading, testingModel: '' } }));
    }
  },

  submitProfile: async () => {
    const { settings, getActiveProfile } = get();
    const profile = getActiveProfile();
    if (!profile) return;
    set((s) => ({ loading: { ...s.loading, submit: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中提交');
      const result = await invoke<{ message: string }>('submit_profile', { settings, profile });
      get().pushToast('success', result.message);
      get().updateActiveProfile({ syncStatus: 'synced' });
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, submit: false } }));
    }
  },

  listRemoteAccounts: async (page, platform = '') => {
    const { settings } = get();
    set((s) => ({ loading: { ...s.loading, remoteList: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中使用导入功能');
      return await invoke<PaginatedAccounts>('list_remote_accounts', { settings, platform, page, pageSize: 20 });
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
      return { items: [], total: 0, page, pageSize: 20 };
    } finally {
      set((s) => ({ loading: { ...s.loading, remoteList: false } }));
    }
  },

  importRemoteAccount: (remote) => {
    const { profiles } = get();
    if (profiles.some((p) => p.remoteId === remote.id)) {
      get().pushToast('info', `账号 "${remote.name}" 已在本地，无需重复导入`);
      return;
    }
    const creds = remote.credentials as Record<string, string>;
    const modelMapping = (creds.model_mapping as unknown as Record<string, string>) ?? {};
    const models = Object.keys(modelMapping).map((id) => ({ id, enabled: true }));
    const customMappings = Object.entries(modelMapping)
      .filter(([from, to]) => from !== to)
      .map(([from, to]) => ({ from, to }));

    const p: Profile = {
      ...createProfile(remote.name),
      accountName: remote.name,
      platform: (remote.platform === 'openai' || remote.platform === 'anthropic') ? remote.platform : 'openai',
      baseUrl: (creds.base_url as string) || '',
      apiKey: '',
      models,
      customMappings,
      groupIds: Array.isArray(remote.groups) ? remote.groups.map((g: any) => g.id ?? g) : [],
      remoteId: remote.id,
      syncStatus: 'synced',
      accountType: remote.accountType as 'apikey' | 'oauth' | 'setup-token',
      priority: remote.priority,
      credentialsStatus: remote.credentialsStatus,
    };
    set({ profiles: [...profiles, p], activeProfileId: p.id, importModalOpen: false });
    get().pushToast('success', `已导入账号 "${remote.name}"`);
    get().scheduleSave();
  },

  deleteRemoteAccount: async (accountId) => {
    const { settings } = get();
    set((s) => ({ loading: { ...s.loading, deleting: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中删除账号');
      await invoke('delete_remote_account', { settings, accountId });
      const { profiles } = get();
      const toRemove = profiles.find((p) => p.remoteId === accountId);
      if (toRemove) get().deleteProfile(toRemove.id);
      get().pushToast('success', '账号已从后端删除');
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, deleting: false } }));
    }
  },

  refreshOAuthAccount: async (accountId) => {
    const { settings } = get();
    set((s) => ({ loading: { ...s.loading, refreshing: true } }));
    try {
      if (!isTauri) throw new Error('请在 Tauri 桌面环境中刷新 Token');
      await invoke('refresh_oauth_account', { settings, accountId });
      get().pushToast('success', 'OAuth Token 已刷新');
    } catch (e) {
      get().pushToast('error', toErrorMessage(e));
    } finally {
      set((s) => ({ loading: { ...s.loading, refreshing: false } }));
    }
  },

  saveSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    document.documentElement.dataset.theme = settings.theme;
    set({ settings });
    get().scheduleSave();
  },

  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setImportModalOpen: (v) => set({ importModalOpen: v }),
  setConfirmDeleteProfileId: (id) => set({ confirmDeleteProfileId: id }),

  pushToast: (kind, text) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 6500 : 4200);
  },

  scheduleSave: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      set((s) => ({ loading: { ...s.loading, saving: true } }));
      try {
        const { profiles, activeProfileId, settings } = get();
        const state: AppState = { profiles, activeProfileId, settings };
        if (isTauri) {
          await invoke('save_state', { state });
        } else {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (e) {
        get().pushToast('error', String(e));
      } finally {
        set((s) => ({ loading: { ...s.loading, saving: false } }));
      }
    }, 400);
  },
}));
