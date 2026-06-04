import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { RemoteAccount } from '../../types';

export default function ImportModal() {
  const { setImportModalOpen, listRemoteAccounts, importRemoteAccount, profiles, loading } = useAppStore();
  const [accounts, setAccounts] = useState<RemoteAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('');

  const load = useCallback(async (p: number, pf: string) => {
    const res = await listRemoteAccounts(p, pf);
    setAccounts(res.items);
    setTotal(res.total);
    setPage(p);
  }, [listRemoteAccounts]);

  useEffect(() => { load(1, platformFilter); }, [platformFilter, load]);

  const isImported = (id: number) => profiles.some((p) => p.remoteId === id);
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setImportModalOpen(false)}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">从后端导入账号</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>共 {total} 个账号</div>
          </div>
          <button className="modal-close" onClick={() => setImportModalOpen(false)}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {(['', 'openai', 'anthropic'] as const).map((pf) => (
            <button
              key={pf}
              className={platformFilter === pf ? 'primary' : ''}
              style={{ fontSize: 12, minHeight: 28, padding: '0 10px' }}
              onClick={() => setPlatformFilter(pf)}
            >
              {pf === '' ? '全部' : pf === 'openai' ? 'OpenAI' : 'Anthropic'}
            </button>
          ))}
          <button
            style={{ fontSize: 12, minHeight: 28, padding: '0 10px', marginLeft: 'auto' }}
            onClick={() => load(page, platformFilter)}
            disabled={loading.remoteList}
          >
            {loading.remoteList ? '加载中…' : '刷新'}
          </button>
        </div>

        <div className="modal-body">
          {loading.remoteList ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>加载中…</div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>暂无账号</div>
          ) : (
            <div className="remote-list">
              {accounts.map((acc) => {
                const imported = isImported(acc.id);
                const isOpenAI = acc.platform === 'openai';
                return (
                  <div key={acc.id} className="remote-item">
                    <div className={`remote-item-avatar ${isOpenAI ? 'avatar-openai' : 'avatar-anthropic'}`}>
                      {isOpenAI ? 'OAI' : 'ANT'}
                    </div>
                    <div className="remote-item-body">
                      <div className="ri-name">{acc.name}</div>
                      <div className="ri-meta">
                        {acc.accountType} · 优先级 {acc.priority}
                        {acc.credentialsStatus?.has_api_key ? ' · 🔑 有Key' : ''}
                        {acc.credentialsStatus?.has_access_token ? ' · 🔐 OAuth' : ''}
                      </div>
                    </div>
                    <span className={`remote-item-status status-${acc.status}`}>{acc.status}</span>
                    <button
                      style={{ fontSize: 12, minHeight: 28, padding: '0 10px' }}
                      disabled={imported}
                      onClick={() => importRemoteAccount(acc)}
                    >
                      {imported ? '已导入' : '导入'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => load(page - 1, platformFilter)}>‹</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1, platformFilter)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
