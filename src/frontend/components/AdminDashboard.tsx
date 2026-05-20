import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Server, Clock, Settings, FileText, Plus, Search, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

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
  const connections = [
    { id: 1, name: 'Prod_Postgres', type: 'JDBC', host: 'pg-prod.internal:5432', schema: 'public', status: 'connected' },
    { id: 2, name: 'Local_Redis', type: 'NoSQL', host: 'localhost:6379', schema: '-', status: 'connected' },
    { id: 3, name: 'Legacy_Oracle', type: 'JDBC', host: '192.168.1.10:1521', schema: 'payroll', status: 'error' },
  ];

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 bg-transparent rounded-[2rem] m-6 mt-0">
      <div className="flex items-center justify-between mb-8 glass-card border-white/5 rounded-[2rem] p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
             <Settings className="w-5 h-5 text-blue-400" />
          </div>
          {t('connection_resources')}
        </h2>
        <div className="flex gap-4">
          <div className="relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
             <input type="text" placeholder={t('search_connections')} className="pl-11 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all w-72 placeholder-slate-500" />
          </div>
          <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 active:scale-95">
            <Plus className="w-4 h-4" /> {t('new_connection')}
          </button>
        </div>
      </div>

      <div className="flex-1 glass-card border-white/5 rounded-[2rem] overflow-hidden flex flex-col relative">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
          <div className="overflow-auto flex-1 p-2">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 backdrop-blur-md bg-transparent">
                <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                  <th className="px-6 py-4 rounded-tl-2xl">{t('name')}</th>
                  <th className="px-6 py-4">{t('type')}</th>
                  <th className="px-6 py-4">{t('host_endpoint')}</th>
                  <th className="px-6 py-4">{t('schema')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4 text-right rounded-tr-2xl">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {connections.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group glass-interactive">
                     <td className="px-6 py-4 font-bold text-slate-200">{c.name}</td>
                     <td className="px-6 py-4 text-slate-400 font-medium">
                        <span className="bg-white/5 px-2 py-1 rounded bg-black/20 text-[10px] font-black uppercase tracking-widest border border-white/5">{c.type}</span>
                     </td>
                     <td className="px-6 py-4 font-mono text-xs font-bold text-blue-400">{c.host}</td>
                     <td className="px-6 py-4 text-slate-400 font-medium">{c.schema}</td>
                     <td className="px-6 py-4">
                       {c.status === 'connected' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" /> {t('connected')}
                          </span>
                       ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" /> {t('error')}
                          </span>
                       )}
                     </td>
                     <td className="px-6 py-4 text-right">
                         <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                           <MoreVertical className="w-5 h-5" />
                         </button>
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
  return (
    <div className="flex-1 m-6 mt-0 flex flex-col items-center justify-center text-slate-400 min-w-0 glass-card rounded-[2rem]">
      <Server className="w-16 h-16 mb-6 opacity-40 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      <h3 className="text-xl font-black text-white tracking-widest uppercase">{t('agent_nodes')}</h3>
      <p className="text-sm mt-3 font-medium">{t('agent_desc')}</p>
    </div>
  );
}

function SchedulerTab() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 m-6 mt-0 flex flex-col items-center justify-center text-slate-400 min-w-0 glass-card rounded-[2rem]">
      <Clock className="w-16 h-16 mb-6 opacity-40 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      <h3 className="text-xl font-black text-white tracking-widest uppercase">{t('job_scheduler_title')}</h3>
      <p className="text-sm mt-3 font-medium">{t('job_scheduler_desc')}</p>
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 m-6 mt-0 flex flex-col items-center justify-center text-slate-400 min-w-0 glass-card rounded-[2rem]">
      <Settings className="w-16 h-16 mb-6 opacity-40 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      <h3 className="text-xl font-black text-white tracking-widest uppercase">{t('system_settings_title')}</h3>
      <p className="text-sm mt-3 font-medium">{t('system_settings_desc')}</p>
    </div>
  );
}
