import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus, Play, RefreshCw, Filter, Database, Server, Clock, Settings, Network } from 'lucide-react';
import clsx from 'clsx';

export default function ContentHeader({ activeTab, adminTab, setAdminTab }: any) {
  const { t } = useTranslation();

  return (
    <div className="h-[56px] glass-card border-x-0 border-t-0 flex items-center justify-between px-6 shrink-0 transition-colors m-3 mt-0 rounded-2xl">
      <div className="flex items-center gap-3 text-sm h-full">
        {activeTab === 'designer' && (
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-slate-400 font-medium">Corp_ETL</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400 font-medium">ETL_Jobs</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-bold text-white tracking-wide">nation_job</span>
          </div>
        )}
        {activeTab === 'console' && (
          <span className="font-bold text-white tracking-wide text-base">{t('console')} <span className="text-slate-500 font-normal mx-2 opacity-50">/</span> {t('console_monitor')}</span>
        )}
        {activeTab === 'admin' && (
          <div className="flex items-center h-full gap-2">
             <span className="font-black text-white mr-4 flex items-center gap-2 bg-blue-600/10 px-3 py-1.5 rounded-xl border border-blue-500/20 text-xs tracking-widest uppercase">
               <Settings className="w-3.5 h-3.5 text-blue-400" /> {t('admin')}
             </span>
             {setAdminTab && (
               <nav className="flex items-center h-full gap-1">
                 {[
                   { id: 'resource', label: t('connection_resources'), icon: Network },
                   { id: 'metamain', label: t('metamain'), icon: Database },
                   { id: 'agent', label: t('agents'), icon: Server },
                   { id: 'scheduler', label: t('scheduler'), icon: Clock },
                   { id: 'settings', label: t('settings'), icon: Settings },
                 ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setAdminTab(tab.id)}
                     className={clsx(
                       "flex items-center gap-2 px-4 h-[36px] rounded-xl text-xs font-bold transition-all relative group",
                       adminTab === tab.id 
                         ? "bg-blue-600/20 text-blue-400" 
                         : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                     )}
                   >
                     <tab.icon className={clsx("w-3.5 h-3.5", adminTab === tab.id ? "text-blue-400" : "text-slate-500")} />
                     {tab.label}
                     {adminTab === tab.id && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />}
                   </button>
                 ))}
               </nav>
             )}
          </div>
        )}
        {activeTab !== 'designer' && activeTab !== 'console' && activeTab !== 'admin' && (
          <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <span className="font-black text-white tracking-widest uppercase text-xs">{t(activeTab)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {activeTab === 'designer' && (
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all">
              <Plus className="w-4 h-4" /> {t('add_step')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all">
              {t('job_properties')}
            </button>
            <div className="w-px h-6 bg-white/5 mx-1"></div>
            <button className="flex items-center gap-2 px-5 py-2 bg-blue-600/80 text-white text-xs font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Play className="w-4 h-4 fill-current" /> {t('test')}
            </button>
            <button className="flex items-center gap-2 px-5 py-2 bg-emerald-600/80 text-white text-xs font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              {t('deploy')}
            </button>
          </div>
        )}
        {activeTab === 'console' && (
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('auto_refresh')}</span>
              <div className="w-8 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center p-0.5 cursor-pointer">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 ml-auto"></div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 px-3">{t('last_update')}：14:32:05</span>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all" title={t('refresh')}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2 border border-white/5 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all" title={t('filter')}>
              <Filter className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
