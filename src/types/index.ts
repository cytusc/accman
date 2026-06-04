export type Platform = 'openai' | 'anthropic';
export type Theme = 'light' | 'dark';
export type SyncStatus = 'local' | 'synced' | 'dirty';
export type AccountType = 'apikey' | 'oauth' | 'setup-token';
export type AccountStatus = 'active' | 'inactive' | 'error';

export interface ModelItem {
  id: string;
  enabled: boolean;
}

export interface CustomMapping {
  from: string;
  to: string;
}

export interface Profile {
  id: string;
  name: string;
  accountName: string;
  platform: Platform;
  poolMode: boolean;
  poolModeRetryCount: number;
  priority: number;
  groupIds: number[];
  baseUrl: string;
  apiKey: string;
  models: ModelItem[];
  lastFetchedAt: string | null;
  remoteId: number | null;
  syncStatus: SyncStatus;
  accountType: AccountType;
  customMappings: CustomMapping[];
  credentialsStatus: Record<string, boolean> | null;
  accountStatus: AccountStatus;
}

export interface Settings {
  backendBaseUrl: string;
  adminApiKey: string;
  theme: Theme;
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string;
  settings: Settings;
}

export interface GroupOption {
  id: number;
  name: string;
  platform?: string;
  status?: string;
}

export interface RemoteAccount {
  id: number;
  name: string;
  platform: string;
  accountType: string;
  status: string;
  priority: number;
  credentials: Record<string, unknown>;
  credentialsStatus: Record<string, boolean>;
  groups?: unknown;
}

export interface PaginatedAccounts {
  items: RemoteAccount[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

export interface LoadingState {
  boot: boolean;
  saving: boolean;
  groups: boolean;
  models: boolean;
  submit: boolean;
  testingModel: string;
  remoteList: boolean;
  deleting: boolean;
  refreshing: boolean;
}
