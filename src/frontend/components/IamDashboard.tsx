import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, Users, Server, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface UserAccount {
  id: string;
  username: string;
  accountType: 'Local' | 'Network';
  roles: string[];
  deviceId?: string;
  isActive: boolean;
  lastLogin?: string;
}

export default function IamDashboard() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  const [testUser, setTestUser] = useState('u_2');
  const [testDevice, setTestDevice] = useState('DEV_MAC_3391');
  const [testPerm, setTestPerm] = useState('data:write');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/iam/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    try {
      const res = await fetch('/api/iam/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUser,
          permission: testPerm,
          deviceId: testDevice
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error(err);
      setTestResult({ allowed: false, reason: 'Simulation API error' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t('loading_iam')}</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface-base)] p-6 overflow-y-auto">
      <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[var(--accent-blue)]" />
            {t('iam_title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl">
            {t('iam_desc')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-[var(--surface-overlay)] rounded-2xl shadow-sm border border-[var(--border-subtle)] p-6 flex flex-col">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[var(--accent-blue)]" />
            {t('registered_accounts')}
          </h2>
          <div className="flex-1 overflow-auto bg-[var(--surface-base)] rounded-xl border border-[var(--border-subtle)] p-2">
            {users.map(u => (
              <div key={u.id} className="bg-[var(--surface-overlay)] p-4 rounded-lg shadow-sm border border-[var(--border-subtle)] mb-2 last:mb-0 hover:border-[var(--border-strong)] transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                      {u.username}
                      {u.accountType === 'Local' ? (
                        <span className="bg-amber-900/30 text-amber-500 border border-amber-800/50 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                          <Server className="w-3 h-3" /> {t('local_bound')}
                        </span>
                      ) : (
                        <span className="bg-[var(--status-running-bg)] text-[var(--status-running-fg)] border border-[var(--status-running-bar)] text-xs px-2 py-0.5 rounded font-semibold">
                          {t('network')}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">ID: {u.id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 border rounded font-bold ${u.isActive ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-[var(--status-success-bar)]' : 'bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)] border-[var(--status-failed-bar)]'}`}>
                      {u.isActive ? t('active') : t('disabled')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider block mb-1">{t('assigned_roles')}</span>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map(r => (
                        <span key={r} className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-[10px] px-1.5 py-0.5 rounded font-bold border border-[var(--border-subtle)]">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {u.accountType === 'Local' && (
                    <div>
                      <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider block mb-1">{t('bound_device_id')}</span>
                      <span className="font-mono text-xs text-[var(--text-primary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] inline-block">
                        {u.deviceId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access Simulation */}
        <div className="bg-[var(--surface-overlay)] rounded-2xl shadow-sm border border-[var(--border-subtle)] p-6 flex flex-col">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            {t('access_simulation')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {t('access_simulation_desc')}
          </p>

          <div className="space-y-4 bg-[var(--surface-base)] p-5 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">{t('target_user_id')}</label>
              <select 
                className="w-full bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-md p-2 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none appearance-none cursor-pointer"
                value={testUser}
                onChange={e => setTestUser(e.target.value)}
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.accountType})</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">{t('request_origin_device_id')}</label>
              <input 
                type="text"
                className="w-full bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-md p-2 text-sm text-[var(--text-primary)] font-mono focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none"
                value={testDevice}
                onChange={e => setTestDevice(e.target.value)}
                placeholder="e.g. DEV_MAC_3391"
              />
              <span className="text-[10px] text-[var(--text-muted)]">{t('device_eval_hint')}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">{t('requested_permission')}</label>
              <select 
                className="w-full bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-md p-2 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none appearance-none cursor-pointer"
                value={testPerm}
                onChange={e => setTestPerm(e.target.value)}
              >
                <option value="pipeline:read">pipeline:read</option>
                <option value="pipeline:write">pipeline:write</option>
                <option value="pipeline:execute">pipeline:execute</option>
                <option value="data:read">data:read</option>
                <option value="data:write">data:write</option>
                <option value="system:audit">system:audit</option>
                <option value="iam:manage">iam:manage</option>
              </select>
            </div>

            <button 
              onClick={runSimulation}
              className="w-full mt-2 bg-[var(--accent-blue)] text-white font-bold py-2.5 rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
            >
              {t('simulate_access_request')}
            </button>
          </div>

          {/* Result Area */}
          {testResult && (
            <div className={`mt-6 p-5 rounded-xl border ${testResult.allowed ? 'bg-[var(--status-success-bg)] border-[var(--status-success-bar)]' : 'bg-[var(--status-failed-bg)] border-[var(--status-failed-bar)]'}`}>
              <div className="flex items-start gap-3">
                {testResult.allowed ? (
                  <CheckCircle2 className="w-6 h-6 text-[var(--status-success-fg)] mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-[var(--status-failed-fg)] mt-0.5" />
                )}
                <div>
                  <h4 className={`font-bold ${testResult.allowed ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-failed-fg)]'}`}>
                    {testResult.allowed ? t('access_granted') : t('access_denied')}
                  </h4>
                  {!testResult.allowed && (
                    <p className="text-sm text-[var(--status-failed-fg)] mt-1 flex items-start gap-1">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      {testResult.reason}
                    </p>
                  )}
                  {testResult.allowed && (
                    <div className="mt-2 text-[var(--status-success-fg)]">
                       <span className="text-xs font-bold block mb-1 opacity-80">Effective Permissions:</span>
                       <div className="flex gap-1 flex-wrap">
                          {testResult.effectivePermissions?.map((p: string) => (
                            <span key={p} className="bg-green-900/30 text-green-400 border border-[var(--status-success-bar)] text-[10px] px-1.5 py-0.5 rounded font-mono">
                               {p}
                            </span>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
