import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, FileJson, Cpu, Code2 } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  source_api: <FileJson className="w-5 h-5 text-blue-500" />,
  source_csv: <FileJson className="w-5 h-5 text-green-500" />,
  source_db: <Database className="w-5 h-5 text-indigo-500" />,
  transform_ai: <Cpu className="w-5 h-5 text-purple-500" />,
  transform_zero_landing_masking: <Cpu className="w-5 h-5 text-red-500" />,
  transform_address_normalization: <Cpu className="w-5 h-5 text-teal-500" />,
  transform_address_geocoding: <Cpu className="w-5 h-5 text-amber-500" />,
  custom_script: <Code2 className="w-5 h-5 text-yellow-500" />,
  dest_db: <Database className="w-5 h-5 opacity-70" />,
  dest_db_real: <Database className="w-5 h-5 text-green-500" />,
};

function CustomNode({ data, isConnectable, targetPosition = Position.Top, sourcePosition = Position.Bottom, selected }: any) {
  const nodeType = data.type || 'default';
  return (
    <div className={`px-4 py-4 rounded-[1.5rem] bg-black/40 backdrop-blur-xl border transition-all duration-300 min-w-[220px] shadow-2xl relative ${selected ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/30' : 'border-white/10 hover:border-white/20 hover:bg-black/50'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[1.5rem] pointer-events-none"></div>
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} className="w-8 h-2 !bg-blue-500 !rounded-full !border-2 !border-black/50 hover:scale-125 transition-transform" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="rounded-2xl w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 shadow-inner">
          {iconMap[nodeType] || <div className="w-6 h-6 bg-white/10 rounded-full" />}
        </div>
        <div className="flex flex-col">
          <div className="text-[13px] font-black tracking-widest text-white uppercase">{data.label}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 max-w-[120px] truncate">{nodeType.replace(/_/g, ' ')}</div>
        </div>
      </div>
      <Handle type="source" position={sourcePosition} isConnectable={isConnectable} className="w-8 h-2 !bg-emerald-500 !rounded-full !border-2 !border-black/50 hover:scale-125 transition-transform" />
    </div>
  );
}

export default memo(CustomNode);
