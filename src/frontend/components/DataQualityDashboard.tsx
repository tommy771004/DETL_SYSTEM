import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, CheckCircle, AlertTriangle, ShieldCheck, Tag, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export default function DataQualityDashboard() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/metaman/quality/profiling');
      const data = await res.json();
      setProfiles(data.profiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden">
      <div className="flex items-center justify-between px-8 py-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            {t('dq_title')}
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-medium italic opacity-80 pl-14">System-wide data health and profiling diagnostics</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
              onClick={() => { setLoading(true); fetchProfiles(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 active:scale-95"
           >
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} /> {t('run_scan')}
           </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
             <div className="flex flex-col items-center gap-4 p-12 glass-card rounded-[32px] border-white/5">
               <div className="relative">
                 <ShieldCheck className="w-16 h-16 text-blue-500 animate-pulse" />
                 <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
               </div>
               <span className="font-black text-white text-lg tracking-widest uppercase">{t('scanning_dq')}</span>
             </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1 overflow-y-auto p-8 pt-0">
          {profiles.map((profile, i) => (
             <div key={i} className="glass-card rounded-[2rem] p-7 flex flex-col glass-interactive border-white/5 relative group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-start gap-4">
                       <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform">
                          <DatabaseIcon className="w-6 h-6 text-slate-300" />
                       </div>
                       <div>
                          <h3 className="font-extrabold text-white text-xl tracking-tight leading-none pt-1">
                             {profile.tableName}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-[0.2em]">{t('rows_count')}<span className="text-white">{profile.rowCount.toLocaleString()}</span></p>
                       </div>
                   </div>
                   <div className="flex flex-col items-end px-4 py-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('health')}</span>
                       <span className={`text-2xl font-black italic tracking-tighter ${getHealthColor(profile.healthScore)}`}>
                          {profile.healthScore}%
                       </span>
                   </div>
                </div>

                {/* Table Tags */}
                {profile.tableTags.length > 0 && (
                   <div className="flex flex-wrap gap-2 mb-6">
                      {profile.tableTags.map((tag: string, idx: number) => (
                         <span key={idx} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> {tag}
                         </span>
                      ))}
                   </div>
                )}

                {/* Field Details */}
                <div className="flex-1 mt-2 pt-6 border-t border-white/5 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                     {t('field_profiling')}
                   </h4>
                   <div className="space-y-3">
                      {profile.fields.map((field: any, idx: number) => (
                          <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                             <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-slate-200 text-sm">{field.name}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg border border-white/5">{field.type}</span>
                             </div>
                             
                             <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                   <span>{t('nulls')}</span>
                                   <span className={field.nullRatio > 0.1 ? 'text-rose-400' : 'text-slate-200'}>{(field.nullRatio * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className={clsx("h-full rounded-full transition-all duration-500", field.nullRatio > 0.1 ? 'bg-rose-500' : 'bg-blue-500')} style={{ width: `${field.nullRatio * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                   <span>{t('unique')}</span>
                                   <span className="text-slate-200">{(field.uniqueRatio * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${field.uniqueRatio * 100}%` }}></div>
                                </div>
                             </div>

                             {field.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {field.tags.map((t: string, tidx: number) => (
                                       <span key={tidx} className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-widest border ${t === 'PII' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-white/10 text-slate-400 border-white/10'}`}>
                                          {t === 'PII' && <AlertTriangle className="w-2.5 h-2.5" />}
                                          {t}
                                       </span>
                                    ))}
                                </div>
                             )}
                          </div>
                      ))}
                   </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);
