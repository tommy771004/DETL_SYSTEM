import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Server, Clock, CheckCircle, XCircle, Search, Filter, Play, RotateCw, Square, ChevronRight, Terminal, Cpu } from 'lucide-react';
import clsx from 'clsx';

export default function JcsDashboard() {
  const { t } = useTranslation();
  const [view, setView] = useState<'jobs' | 'instances' | 'system'>('instances');
  const [jobsData, setJobsData] = useState<any>({ waiting: [], active: [], completed: [], failed: [] });
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jcs/jobs');
      const data = await res.json();
      setJobsData(data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const allInstances = [
    ...jobsData.failed.map((j: any) => ({ ...j, status: 'failed' })),
    ...jobsData.active.map((j: any) => ({ ...j, status: 'running' })),
    ...jobsData.waiting.map((j: any) => ({ ...j, status: 'waiting' })),
    ...jobsData.completed.map((j: any) => ({ ...j, status: 'success' })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running': return { icon: Activity, color: 'text-[var(--status-running-fg)]', bg: 'bg-[var(--status-running-bg)]', border: 'border-[var(--status-running-bar)]', text: t('running') };
      case 'success': return { icon: CheckCircle, color: 'text-[var(--status-success-fg)]', bg: 'bg-[var(--status-success-bg)]', border: 'border-[var(--status-success-bar)]', text: t('success') };
      case 'failed': return { icon: XCircle, color: 'text-[var(--status-failed-fg)]', bg: 'bg-[var(--status-failed-bg)]', border: 'border-[var(--status-failed-bar)]', text: t('failed') };
      case 'waiting': return { icon: Clock, color: 'text-[var(--status-waiting-fg)]', bg: 'bg-[var(--status-waiting-bg)]', border: 'border-[var(--status-waiting-bar)]', text: t('waiting') };
      default: return { icon: Clock, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-hover)]', border: 'border-[var(--border-subtle)]', text: t('unknown') };
    }
  };

  return (
    <div className="flex h-full w-full bg-transparent relative overflow-hidden p-6 gap-6">
      <div className="flex-1 flex flex-col min-w-0 bg-transparent gap-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-8 py-6 glass-card rounded-[2rem] border-white/5 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                <Terminal className="w-5 h-5 text-blue-400" />
              </div>
              {t('task_console')}
            </h2>
            
            <div className="w-px h-8 bg-white/5 mx-2"></div>
            
            {/* Segmented Control */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
              {(['jobs', 'instances', 'system'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={clsx(
                    "px-5 py-2 text-sm font-bold rounded-xl capitalize transition-all",
                    view === v ? "bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {t(v)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
               <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder={t('search_instances')} 
                 className="pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all w-72 placeholder-slate-500"
               />
             </div>
             <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">
               <Filter className="w-4 h-4" /> {t('filter')}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'instances' && (
            <div className="glass-card border-white/5 rounded-[2rem] flex flex-col flex-1 overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
              <div className="overflow-auto flex-1 p-2">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 backdrop-blur-md bg-transparent">
                    <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                      <th className="px-6 py-4 rounded-tl-2xl">{t('instance_id')}</th>
                      <th className="px-6 py-4">{t('job_name')}</th>
                      <th className="px-6 py-4">{t('status')}</th>
                      <th className="px-6 py-4">{t('start_time')}</th>
                      <th className="px-6 py-4">{t('duration')}</th>
                      <th className="px-6 py-4 text-right rounded-tr-2xl">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loading && allInstances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold tracking-widest uppercase text-xs">{t('loading_instances')}</td>
                      </tr>
                    ) : allInstances.length === 0 ? (
                       <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold tracking-widest uppercase text-xs">{t('no_instances_found')}</td>
                      </tr>
                    ) : (
                      allInstances.map((instance: any) => {
                        const cfg = getStatusConfig(instance.status);
                        const Icon = cfg.icon;
                        const isSelected = selectedInstance?.id === instance.id;
                        return (
                          <tr 
                            key={instance.id} 
                            className={clsx(
                              "border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group glass-interactive relative",
                              isSelected && "bg-white/10"
                            )}
                            onClick={() => setSelectedInstance(instance)}
                          >
                            {isSelected && <td className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-max h-auto" style={{ borderTopRightRadius: 4, borderBottomRightRadius: 4 }}></td>}
                            <td className="px-6 py-4 font-mono text-xs font-bold text-blue-400">#{instance.id.substring(0, 8)}</td>
                            <td className="px-6 py-4 font-bold text-slate-200">{instance.name}</td>
                            <td className="px-6 py-4">
                              <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", cfg.bg, cfg.color, cfg.border)}>
                                <Icon className="w-3.5 h-3.5" />
                                {cfg.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-400 font-medium">
                              {new Date(instance.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono font-bold">
                              {instance.status === 'running' ? '00:03:42' : instance.status === 'waiting' ? '-' : '00:05:10'}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 {instance.status === 'failed' || instance.status === 'success' ? (
                                   <button title={t('retry')} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-400/20 shadow-sm">
                                     <RotateCw className="w-4 h-4" />
                                   </button>
                                 ) : null}
                                 {instance.status === 'running' ? (
                                   <button title={t('abort')} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all border border-transparent hover:border-rose-400/20 shadow-sm">
                                     <Square className="w-4 h-4" />
                                   </button>
                                 ) : null}
                               </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {view === 'jobs' && (
             <div className="flex flex-1 items-center justify-center text-slate-500 font-bold h-full glass-card rounded-[2rem]">
               {t('jobs')} view ({t('coming_soon')})
             </div>
          )}
          {view === 'system' && (
             <div className="flex flex-1 items-center justify-center text-slate-500 font-bold h-full glass-card rounded-[2rem]">
               {t('system')} view ({t('coming_soon')})
             </div>
          )}
        </div>
      </div>

      {/* Details Drawer */}
      {selectedInstance && (
         <div className="w-[480px] glass-card border-white/10 rounded-[2rem] shadow-2xl flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out relative z-20 min-h-0 overflow-hidden ml-2 ring-1 ring-white/5">
           <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/80 to-transparent pointer-events-none z-0"></div>
           <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-white/5 relative z-10">
              <div className="pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-extrabold text-white text-xl tracking-tight leading-none">{selectedInstance.name}</h3>
                  <span className={clsx("px-2.5 py-1 rounded-lg text-[9px] uppercase font-black tracking-widest border", getStatusConfig(selectedInstance.status).bg, getStatusConfig(selectedInstance.status).color, getStatusConfig(selectedInstance.status).border)}>
                    {selectedInstance.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono font-bold bg-black/20 inline-block px-2 py-1 rounded-md border border-white/5">ID: {selectedInstance.id}</p>
              </div>
              <button 
                onClick={() => setSelectedInstance(null)}
                className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl transition-all shrink-0 border border-transparent hover:border-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto relative z-10 flex flex-col">
             <div className="p-8 border-b border-white/5 shrink-0">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> {t('timeline')}
                </h4>
                <div className="space-y-6 pl-3 border-l-2 border-emerald-500/30 ml-2">
                   <div className="relative">
                      <div className="absolute -left-[19px] w-8 h-8 rounded-full bg-[#020617] flex items-center justify-center border-2 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                         <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="pl-6">
                         <p className="text-sm font-bold text-slate-200">{t('triggered')}</p>
                         <p className="text-[10px] font-black text-slate-500 mt-1 font-mono uppercase">{new Date(selectedInstance.timestamp).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="relative">
                      <div className={clsx("absolute -left-[19px] w-8 h-8 rounded-full bg-[#020617] flex items-center justify-center border-2 shadow-[0_0_10px_rgba(59,130,246,0.1)]", selectedInstance.status === 'failed' ? "border-rose-500/50" : "border-blue-500/50")}>
                         {selectedInstance.status === 'failed' ? <XCircle className="w-4 h-4 text-rose-400" /> : <Activity className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="pl-6">
                         <p className="text-sm font-bold text-slate-200">{t(selectedInstance.status)}</p>
                         {selectedInstance.failedReason && (
                           <p className="text-xs text-rose-300 font-medium mt-2 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 leading-relaxed shadow-inner">
                             {selectedInstance.failedReason}
                           </p>
                         )}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8 flex flex-col flex-1 min-h-[350px]">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> {t('live_logs')}
                  </div>
                  <span className="flex items-center gap-2 text-[9px] font-black text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {t('websocket_connected')}
                  </span>
                </h4>
                <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 shadow-inner leading-relaxed">
                   <div><span className="text-blue-400 font-bold mr-2">[INFO]</span> Initializing job environment...</div>
                   <div><span className="text-blue-400 font-bold mr-2">[INFO]</span> Connecting to sources...</div>
                   <div><span className="text-emerald-400 font-bold mr-2">[OK]</span> Connected successfully.</div>
                   {selectedInstance.status === 'failed' && (
                     <div className="text-rose-400 mt-2 p-2 bg-rose-500/10 rounded">
                       <span className="font-bold mr-2">[ERROR]</span> {selectedInstance.failedReason || 'Unknown execution error occurred.'}
                     </div>
                   )}
                   {selectedInstance.status === 'running' && (
                     <div className="text-amber-400/80 animate-pulse flex items-center gap-2 mt-2">
                       <span className="font-bold">[SYNC]</span> Processing active data stream...
                       <span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span></span>
                     </div>
                   )}
                   <div className="mt-4 text-slate-600 font-bold italic">-- {t('end_of_logs')} --</div>
                </div>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
