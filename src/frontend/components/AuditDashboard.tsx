import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Download, Search, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';

interface AuditRecord {
  id: number;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  success: number;
  ipAddress: string;
  deviceId: string;
  hash: string;
}

export default function AuditDashboard() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterAction) qs.set('action', filterAction);
      if (filterUser) qs.set('userId', filterUser);

      const res = await fetch(`/api/audit/logs?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterUser]);

  const verifyChain = async () => {
    try {
      const res = await fetch('/api/audit/verify');
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      setValidationResult(data.valid);
    } catch (err) {
      console.error(err);
      setValidationResult(false);
    }
  };

  const exportCsv = () => {
    window.open('/api/audit/export', '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface-base)] p-6 overflow-y-auto w-full">
      <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-[var(--accent-blue)]" />
            {t('audit_title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl">
            {t('audit_desc')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={verifyChain}
            className="px-4 py-2 bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-strong)] font-bold text-sm rounded-lg hover:bg-[var(--surface-hover)] transition flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> {t('verify_integrity')}
          </button>
          <button 
            onClick={exportCsv}
            className="px-4 py-2 bg-[var(--accent-blue)] text-white font-bold text-sm rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> {t('export_csv')}
          </button>
        </div>
      </div>

      {validationResult !== null && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${validationResult ? 'bg-[var(--status-success-bg)] border-[var(--status-success-bar)]' : 'bg-[var(--status-failed-bg)] border-[var(--status-failed-bar)]'}`}>
          {validationResult ? (
            <CheckCircle2 className={`w-6 h-6 text-[var(--status-success-fg)]`} />
          ) : (
            <AlertTriangle className={`w-6 h-6 text-[var(--status-failed-fg)]`} />
          )}
          <div>
            <h4 className={`font-bold ${validationResult ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-failed-fg)]'}`}>
              {validationResult ? t('integrity_check_passed') : t('integrity_violation_detected')}
            </h4>
            <p className={`text-sm mt-0.5 ${validationResult ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-failed-fg)]'} opacity-80`}>
              {validationResult ? t('integrity_check_ok') : t('integrity_check_fail')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface-overlay)] rounded-2xl shadow-sm border border-[var(--border-subtle)] p-6 flex flex-col flex-1 min-h-[400px]">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg overflow-hidden items-center px-3 flex-1 max-w-xs focus-within:ring-1 focus-within:ring-[var(--accent-blue)]">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder={t('filter_by_action')}
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[var(--text-primary)] text-sm p-2 w-full outline-none"
            />
          </div>
          <div className="flex bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg overflow-hidden items-center px-3 flex-1 max-w-xs focus-within:ring-1 focus-within:ring-[var(--accent-blue)]">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder={t('filter_by_user')} 
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[var(--text-primary)] text-sm p-2 w-full outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] flex-1">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-4 py-3">{t('timestamp')}</th>
                <th className="px-4 py-3">{t('user_id')}</th>
                <th className="px-4 py-3">{t('action')}</th>
                <th className="px-4 py-3">{t('resource')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('details')}</th>
                <th className="px-4 py-3">{t('hash_trun')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">{t('loading_audit_logs')}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">{t('no_logs_found')}</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{log.userId}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[var(--accent-blue-dim)] text-[var(--accent-blue-text)] px-2 py-0.5 rounded text-xs font-bold border border-[var(--accent-blue-text)]/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{log.resource}</td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="flex items-center gap-1 text-[var(--status-success-fg)] text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('success')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--status-failed-fg)] text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" /> {t('failed')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs max-w-xs truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-[10px]">
                      {log.hash.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
