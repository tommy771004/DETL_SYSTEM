import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Activity, Settings2, AlertCircle, GripVertical, Database, Command, Cpu, ChevronRight, X, ChevronDown } from 'lucide-react';
import PipelineCanvas from '../components/PipelineCanvas';
import clsx from 'clsx';

export default function Designer({ pipelineConfig, setPipelineConfig, log, running, handleTestRun, onDragStart }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-[calc(100%-80px)] bg-transparent relative z-10 m-6 mt-0">
      {/* Visual Step Tabs */}
      <div className="flex items-end gap-2 px-6 pt-0 pb-0 border-b border-white/10 glass-card rounded-t-[2rem] rounded-b-none border-x-0 border-t-0 bg-white/5">
        <div className="flex items-center gap-3 px-5 py-3 glass-card border-white/10 rounded-t-[1.5rem] rounded-b-none text-sm font-bold text-blue-400 shadow-[0_-10px_30px_rgba(59,130,246,0.15)] relative z-20 border-b-0 after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-blue-500">
          <Database className="w-4 h-4" />
          <span className="uppercase tracking-widest">{t('step')} 1: {t('extract')}</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.02] border border-white/5 border-b-0 rounded-t-[1.5rem] rounded-b-none text-sm text-slate-400 hover:text-slate-200 hover:bg-white-[0.05] cursor-pointer group transition-all relative z-10">
          <Cpu className="w-4 h-4 opacity-70 group-hover:opacity-100" />
          <span className="uppercase tracking-widest">{t('step')} 2: {t('transform')}</span>
          <X className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-0.5 hover:bg-white/10 rounded-full" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden glass-card rounded-b-[2rem] border-white/10 border-t-0 p-2">
        {/* Canvas Area (PipelineCanvas will render Toolbox, Canvas, Properties) */}
        <div className="flex-1 flex flex-col relative w-full h-full bg-black/20 rounded-[1.5rem] overflow-hidden border border-white/5">
          <PipelineCanvas onSaveConfig={(config: any) => {
             setPipelineConfig(config);
          }} />

          {/* Quick Execution Log Drawer Fragment over the canvas at bottom */}
          {log.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 glass-card border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col z-20 overflow-hidden ring-1 ring-white/5">
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-0"></div>
               <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
                  <div className="flex items-center gap-3 text-sm font-black text-white uppercase tracking-[0.2em]">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <Settings2 className="w-4 h-4 text-blue-400" /> 
                    </div>
                    {t('execution_log')}
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] pr-4 relative z-10 max-h-[150px]">
                 {log.map((entry: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-black/40 border border-white/5 text-slate-300 shadow-inner">
                       <span className={clsx("font-bold tracking-widest uppercase shrink-0", entry.type === 'error' ? 'text-rose-400' : entry.type === 'success' ? 'text-emerald-400' : 'text-blue-400')}>
                         [{entry.type}]
                       </span>
                       <span className="break-all font-medium leading-relaxed">{entry.msg}</span>
                    </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
