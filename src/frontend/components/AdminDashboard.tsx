import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database, Server, Clock, Settings, Plus, Search,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2,
  Edit3, Play, Save, X, Wifi, WifiOff
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConnectionConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  schema?: string;
  ftpPath?: string;
  baseUrl?: string;
  status: 'connected' | 'error' | 'untested';
  updatedAt: string;
}

interface AgentConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'error';
  concurrency: number;
  activeJobs: number;
  totalExecuted: number;
  lastHeartbeatAt?: string;
  version: string;
  tags: string[];
}

interface ScheduleConfig {
  id: string;
  name: string;
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'cron' | 'once' | 'on_demand';
  timesOfDay?: string[];
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  cronExpression?: string;
  enabled: boolean;
  assignedJobIds: string[];
  timezone: string;
  description?: string;
  nextTriggerAt?: string;
}

const CONN_TYPES = ['JDBC', 'Oracle', 'Oracle_TNS', 'Oracle_JDBC', 'FTP', 'API', 'NoSQL', 'Kafka', 'CSV'];
const FREQ_TYPES = ['daily', 'weekly', 'monthly', 'cron', 'once', 'on_demand'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function AdminDashboard({ adminTab }: { adminTab: string }) {
  // adminTab would be 'resource', 'metamain', 'agent', 'scheduler', 'settings'
  
  return (
    <div className="flex h-full w-full bg-[var(--surface-base)] relative overflow-hidden">
      {adminTab === 'resource' && <ResourceTab />}
      {adminTab === 'metamain' && <MetaMainTab />}
      {adminTab === 'agent' && <AgentTab />}
      {adminTab === 'scheduler' && <SchedulerTab />}
      {adminTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function ResourceTab() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<ConnectionConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'ok' | 'fail'>>({});

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleTest = async (id: string) => {
    setTestStatus(prev => ({ ...prev, [id]: 'testing' }));
    const res = await fetch(`/api/admin/connections/${id}/test`, { method: 'POST' });
    const data = await res.json();
    setTestStatus(prev => ({ ...prev, [id]: data.success ? 'ok' : 'fail' }));
    setConnections(prev => prev.map(c => c.id === id ? { ...c, status: data.success ? 'connected' : 'error' } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await fetch(`/api/admin/connections/${id}`, { method: 'DELETE' });
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async (formData: any) => {
    const method = editTarget ? 'PUT' : 'POST';
    const url = editTarget ? `/api/admin/connections/${editTarget.id}` : '/api/admin/connections';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      await loadConnections();
      setShowModal(false);
      setEditTarget(null);
    }
  };

  const filtered = connections.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    if (status === 'connected') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="w-3 h-3" />{t('connected')}
      </span>
    );
    if (status === 'error') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3" />{t('error')}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <AlertCircle className="w-3 h-3" />{t('untested')}
      </span>
    );
  };

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 bg-transparent rounded-[2rem] m-6 mt-0">
      <div className="flex items-center justify-between mb-8 glass-card border-white/5 rounded-[2rem] p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          {t('connection_resources')}
          <span className="ml-2 text-xs font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{connections.length}</span>
        </h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text"
              placeholder={t('search_connections')}
              className="pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all w-64 placeholder-slate-500" />
          </div>
          <button onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 active:scale-95">
            <Plus className="w-4 h-4" />{t('new_connection')}
          </button>
          <button onClick={loadConnections}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 glass-card border-white/5 rounded-[2rem] overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-1 p-2">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 backdrop-blur-md bg-transparent">
              <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <th className="px-6 py-4">{t('name')}</th>
                <th className="px-6 py-4">{t('type')}</th>
                <th className="px-6 py-4">{t('host_endpoint')}</th>
                <th className="px-6 py-4">{t('schema')}</th>
                <th className="px-6 py-4">{t('status')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer">
                  <td className="px-6 py-4 font-bold text-slate-200">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-white/5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-white/5 text-slate-400">{c.type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-blue-400">
                    {c.host ? `${c.host}${c.port ? `:${c.port}` : ''}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{c.schema || c.database || '-'}</td>
                  <td className="px-6 py-4">{statusBadge(c.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleTest(c.id)} title={t('test_connection')}
                        className={clsx('p-2 rounded-xl transition-all',
                          testStatus[c.id] === 'testing' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/10')}>
                        {testStatus[c.id] === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setEditTarget(c); setShowModal(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ConnectionModal
          connection={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

function ConnectionModal({ connection, onSave, onClose }: {
  connection: ConnectionConfig | null;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: connection?.name || '',
    type: connection?.type || 'JDBC',
    description: connection?.description || '',
    host: connection?.host || '',
    port: connection?.port?.toString() || '',
    database: connection?.database || '',
    username: connection?.username || '',
    password: '',
    schema: connection?.schema || '',
    ftpPath: connection?.ftpPath || '',
    baseUrl: connection?.baseUrl || '',
    connectionUri: '',
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const needsHost = ['JDBC', 'Oracle', 'Oracle_TNS', 'Oracle_JDBC', 'FTP'].includes(form.type);
  const needsUrl = ['API', 'NoSQL', 'Kafka'].includes(form.type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-black text-white">{connection ? t('edit_connection') : t('new_connection')}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('name')} *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('connection_type')} *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all">
                {CONN_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('description')}</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
          {needsHost && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Host</label>
                  <input value={form.host} onChange={e => set('host', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Port</label>
                  <input type="number" value={form.port} onChange={e => set('port', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('database')}</label>
                  <input value={form.database} onChange={e => set('database', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Schema</label>
                  <input value={form.schema} onChange={e => set('schema', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Username</label>
                  <input value={form.username} onChange={e => set('username', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Password</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder={connection ? '（不修改請留空）' : ''}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              </div>
              {form.type === 'FTP' && (
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">FTP Path</label>
                  <input value={form.ftpPath} onChange={e => set('ftpPath', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              )}
            </>
          )}
          {needsUrl && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">
                {form.type === 'API' ? 'Base URL' : 'Connection URI'}
              </label>
              <input
                value={form.type === 'API' ? form.baseUrl : form.connectionUri}
                onChange={e => set(form.type === 'API' ? 'baseUrl' : 'connectionUri', e.target.value)}
                placeholder={form.type !== 'API' ? 'redis://localhost:6379' : ''}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose}
            className="px-5 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all font-bold">
            {t('cancel')}
          </button>
          <button onClick={() => onSave(form)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-500 transition-all">
            <Save className="w-4 h-4" />{t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaMainTab() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 m-6 mt-0 flex flex-col items-center justify-center text-slate-400 min-w-0 glass-card rounded-[2rem]">
      <Database className="w-16 h-16 mb-6 opacity-40 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      <h3 className="text-xl font-black text-white tracking-widest uppercase">{t('metamain_mgmt')}</h3>
      <p className="text-sm mt-3 font-medium">{t('metamain_desc')}</p>
    </div>
  );
}

function AgentTab() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/agents');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const statusIcon = (status: string) => {
    if (status === 'online') return <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold"><Wifi className="w-4 h-4" />{t('online')}</span>;
    if (status === 'error') return <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold"><AlertCircle className="w-4 h-4" />Error</span>;
    return <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold"><WifiOff className="w-4 h-4" />{t('offline')}</span>;
  };

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const totalActive = agents.reduce((s, a) => s + a.activeJobs, 0);

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 bg-transparent rounded-[2rem] m-6 mt-0 gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('total_agents'), value: agents.length, color: 'blue' },
          { label: t('online_agents'), value: onlineCount, color: 'emerald' },
          { label: t('active_jobs'), value: totalActive, color: 'violet' },
        ].map(stat => (
          <div key={stat.label} className="glass-card border-white/5 rounded-2xl p-5">
            <div className={`text-3xl font-black text-${stat.color}-400 mb-1`}>{stat.value}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 glass-card border-white/5 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />{t('agent_nodes')}
          </h3>
          <span className={clsx('text-xs font-bold px-2 py-1 rounded-lg', loading ? 'text-slate-500 bg-white/5' : 'text-emerald-400 bg-emerald-500/10')}>
            {loading ? t('loading') : t('live')}
          </span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <th className="px-6 py-4">{t('name')}</th>
                <th className="px-6 py-4">Host</th>
                <th className="px-6 py-4">{t('status')}</th>
                <th className="px-6 py-4">{t('active_jobs')} / Max</th>
                <th className="px-6 py-4">{t('total_executed')}</th>
                <th className="px-6 py-4">{t('last_heartbeat')}</th>
                <th className="px-6 py-4">Version</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {agents.map(agent => (
                <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{agent.name}</div>
                    <div className="flex gap-1 mt-1">
                      {agent.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-500 border border-white/5 font-bold uppercase">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-400 font-bold">{agent.host}:{agent.port}</td>
                  <td className="px-6 py-4">{statusIcon(agent.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-20">
                        <div className={clsx('h-full rounded-full transition-all', agent.activeJobs > 0 ? 'bg-blue-500' : 'bg-slate-700')}
                          style={{ width: `${Math.min(100, (agent.activeJobs / Math.max(agent.concurrency, 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-400">{agent.activeJobs}/{agent.concurrency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-bold">{agent.totalExecuted.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">v{agent.version}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SchedulerTab() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleConfig | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/schedules');
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/admin/schedules/${id}/toggle`, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setSchedules(prev => prev.map(s => s.id === id ? updated : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' });
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = async (formData: any) => {
    const method = editTarget ? 'PUT' : 'POST';
    const url = editTarget ? `/api/admin/schedules/${editTarget.id}` : '/api/admin/schedules';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
    });
    if (res.ok) { await loadSchedules(); setShowModal(false); setEditTarget(null); }
  };

  const freqLabel = (s: ScheduleConfig) => {
    if (s.frequencyType === 'daily') return `每日 ${(s.timesOfDay || []).join(', ')}`;
    if (s.frequencyType === 'weekly') return `每週${(s.daysOfWeek || []).map(d => WEEKDAYS[d]).join('、')} ${(s.timesOfDay || []).join(', ')}`;
    if (s.frequencyType === 'monthly') return `每月 ${(s.daysOfMonth || []).join('、')}日`;
    if (s.frequencyType === 'cron') return s.cronExpression || 'Custom Cron';
    return s.frequencyType;
  };

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 m-6 mt-0 gap-6">
      <div className="flex items-center justify-between glass-card border-white/5 rounded-[2rem] p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-violet-600/20 rounded-xl border border-violet-500/30">
            <Clock className="w-5 h-5 text-violet-400" />
          </div>
          {t('job_scheduler_title')}
          <span className="ml-2 text-xs font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{schedules.length}</span>
        </h2>
        <div className="flex gap-3">
          <button onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-black hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/30">
            <Plus className="w-4 h-4" />{t('add_schedule')}
          </button>
          <button onClick={loadSchedules}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>
      <div className="flex-1 glass-card border-white/5 rounded-[2rem] overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <th className="px-6 py-4">{t('name')}</th>
                <th className="px-6 py-4">{t('frequency')}</th>
                <th className="px-6 py-4">Timezone</th>
                <th className="px-6 py-4">{t('next_trigger')}</th>
                <th className="px-6 py-4">{t('enabled')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {schedules.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{s.name}</div>
                    {s.description && <div className="text-xs text-slate-500 mt-0.5">{s.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">{s.frequencyType}</span>
                      <span className="text-xs text-slate-400">{freqLabel(s)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">{s.timezone}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {s.nextTriggerAt ? new Date(s.nextTriggerAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(s.id)}
                      className={clsx('w-11 h-6 rounded-full transition-all relative', s.enabled ? 'bg-violet-600' : 'bg-white/10')}>
                      <span className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', s.enabled ? 'left-6' : 'left-1')} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditTarget(s); setShowModal(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && schedules.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ScheduleModal schedule={editTarget} onSave={handleSave} onClose={() => { setShowModal(false); setEditTarget(null); }} />
      )}
    </div>
  );
}

function ScheduleModal({ schedule, onSave, onClose }: {
  schedule: ScheduleConfig | null;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: schedule?.name || '',
    frequencyType: schedule?.frequencyType || 'daily',
    timesOfDay: (schedule?.timesOfDay || ['02:00']).join(', '),
    daysOfWeek: schedule?.daysOfWeek || [] as number[],
    daysOfMonth: (schedule?.daysOfMonth || []).join(', '),
    cronExpression: schedule?.cronExpression || '0 2 * * *',
    timezone: schedule?.timezone || 'Asia/Taipei',
    description: schedule?.description || '',
    enabled: schedule?.enabled ?? true,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-black text-white">{schedule ? t('edit_schedule') : t('add_schedule')}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('name')} *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('frequency')} *</label>
              <select value={form.frequencyType} onChange={e => set('frequencyType', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all">
                {FREQ_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Timezone</label>
              <input value={form.timezone} onChange={e => set('timezone', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
          </div>
          {['daily', 'weekly', 'monthly'].includes(form.frequencyType) && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('execution_times')} (HH:MM)</label>
              <input value={form.timesOfDay} onChange={e => set('timesOfDay', e.target.value)}
                placeholder="02:00, 14:00"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
          )}
          {form.frequencyType === 'weekly' && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t('days_of_week')}</label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day, i) => (
                  <button key={i} type="button"
                    onClick={() => set('daysOfWeek', form.daysOfWeek.includes(i)
                      ? form.daysOfWeek.filter((d: number) => d !== i)
                      : [...form.daysOfWeek, i])}
                    className={clsx('w-9 h-9 rounded-xl text-sm font-black transition-all',
                      form.daysOfWeek.includes(i) ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10')}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.frequencyType === 'monthly' && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('days_of_month')}</label>
              <input value={form.daysOfMonth} onChange={e => set('daysOfMonth', e.target.value)}
                placeholder="1, 15" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
          )}
          {form.frequencyType === 'cron' && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">Cron Expression</label>
              <input value={form.cronExpression} onChange={e => set('cronExpression', e.target.value)}
                placeholder="0 2 * * *" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t('description')}</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('enabled', !form.enabled)}
              className={clsx('w-11 h-6 rounded-full transition-all relative', form.enabled ? 'bg-violet-600' : 'bg-white/10')}>
              <span className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', form.enabled ? 'left-6' : 'left-1')} />
            </button>
            <span className="text-sm text-slate-400 font-bold">{t('enabled')}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all font-bold">{t('cancel')}</button>
          <button onClick={() => onSave({
            ...form,
            timesOfDay: form.timesOfDay.split(',').map((s: string) => s.trim()).filter(Boolean),
            daysOfMonth: form.daysOfMonth.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)),
          })} className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-black hover:bg-violet-500 transition-all">
            <Save className="w-4 h-4" />{t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings || {}); setLoading(false); });
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const settingRows = [
    { key: 'platform_name', label: t('platform_name'), type: 'text' },
    { key: 'default_timezone', label: 'Default Timezone', type: 'text' },
    { key: 'max_concurrent_jobs', label: t('max_concurrent_jobs'), type: 'number' },
    { key: 'log_retention_days', label: t('log_retention_days'), type: 'number' },
    { key: 'notification_email', label: t('notification_email'), type: 'email' },
    { key: 'enable_audit_log', label: t('enable_audit_log'), type: 'toggle' },
    { key: 'enable_pii_masking', label: t('enable_pii_masking'), type: 'toggle' },
  ];

  if (loading) return (
    <div className="flex-1 m-6 mt-0 flex items-center justify-center glass-card rounded-[2rem]">
      <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 m-6 mt-0 gap-6">
      <div className="flex items-center justify-between glass-card border-white/5 rounded-[2rem] p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-slate-600/20 rounded-xl border border-slate-500/30">
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
          {t('system_settings_title')}
        </h2>
        <button onClick={handleSave}
          className={clsx('flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all',
            saved ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white hover:bg-slate-500')}>
          <Save className="w-4 h-4" />{saved ? t('saved') : t('save_settings')}
        </button>
      </div>
      <div className="flex-1 glass-card border-white/5 rounded-[2rem] p-8">
        <div className="max-w-2xl space-y-6">
          <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/5">
            {[
              { label: 'Redis', value: `${settings.redis_host}:${settings.redis_port}`, ok: true },
              { label: 'Gemini API', value: settings.gemini_api_key_configured ? 'Configured' : 'Not Set', ok: Boolean(settings.gemini_api_key_configured) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
                <div className={clsx('w-2 h-2 rounded-full', item.ok ? 'bg-emerald-400' : 'bg-slate-600')} />
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{item.label}</div>
                  <div className="text-sm font-bold text-slate-300 font-mono">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-5">
            {settingRows.map(row => (
              <div key={row.key} className="flex items-center justify-between gap-8">
                <label className="text-sm font-bold text-slate-300 min-w-[180px]">{row.label}</label>
                {row.type === 'toggle' ? (
                  <button type="button"
                    onClick={() => setSettings(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                    className={clsx('w-11 h-6 rounded-full transition-all relative flex-shrink-0',
                      settings[row.key] ? 'bg-blue-600' : 'bg-white/10')}>
                    <span className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                      settings[row.key] ? 'left-6' : 'left-1')} />
                  </button>
                ) : (
                  <input type={row.type}
                    value={settings[row.key] ?? ''}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      [row.key]: row.type === 'number' ? Number(e.target.value) : e.target.value
                    }))}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all max-w-xs" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
