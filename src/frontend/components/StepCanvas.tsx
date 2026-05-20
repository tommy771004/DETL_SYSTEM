/**
 * @file StepCanvas.tsx
 * @description Data Management Step 設計畫布（Reader → Transformer → Writer）。
 * 對應  5 的 DM Step Design 視圖。
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Cpu, Download, Plus, Trash2, ChevronRight, Save, Settings2, Play, Check, Link } from 'lucide-react';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ColumnDef { name: string; type: string; length?: number; }
interface TransformRule { targetColumn: string; rule: string; description?: string; }

interface PluginConfig {
  pluginType: string;
  connectionId?: string;
  database?: string;
  tableName?: string;
  filePath?: string;
  fileName?: string;
  delimiter?: string;
  encoding?: string;
  columns?: ColumnDef[];
  transformRules?: TransformRule[];
  sqlStatement?: string;
  extraProps?: Record<string, any>;
}

interface JobStep {
  id: string;
  jobId: string;
  name: string;
  type: 'data_management' | 'external_command' | 'sql_executor';
  order: number;
  config: {
    reader?: PluginConfig;
    transformer?: PluginConfig;
    writer?: PluginConfig;
    command?: string;
    embeddedScript?: string;
    connectionId?: string;
    runMode?: string;
    sqlStatement?: string;
  };
  enabled: boolean;
}

// ─── Plugin Palettes ──────────────────────────────────────────────────────────
const READER_PLUGINS = [
  { id: 'jdbc_reader_generic', label: 'JDBC Reader - Generic', icon: Database, color: 'text-blue-400' },
  { id: 'csv_file_reader', label: 'File Reader - CSV', icon: Download, color: 'text-emerald-400' },
  { id: 'text_file_reader', label: 'File Reader - Text', icon: Download, color: 'text-amber-400' },
  { id: 'sql_executor', label: 'SQL Executor', icon: Database, color: 'text-purple-400' },
];

const TRANSFORMER_PLUGINS = [
  { id: 'transformer_default', label: 'Default Transformer', icon: Cpu, color: 'text-orange-400' },
  { id: 'cdc_transformer', label: 'CDC Transformer', icon: Cpu, color: 'text-rose-400' },
];

const WRITER_PLUGINS = [
  { id: 'jdbc_writer_generic', label: 'JDBC Writer - Generic', icon: Database, color: 'text-blue-400' },
  { id: 'text_file_writer', label: 'File Writer - Text', icon: Download, color: 'text-emerald-400' },
];

const STEP_TYPES = [
  { id: 'data_management', label: 'DATA MANAGEMENT', desc: 'ETL 資料抽取、轉換與載入', color: 'blue' },
  { id: 'external_command', label: 'EXTERNAL COMMAND', desc: 'Shell/Python 外部命令', color: 'emerald' },
  { id: 'sql_executor', label: 'SQL EXECUTOR', desc: '執行 SQL 腳本', color: 'purple' },
];

// ─── PluginBlock ──────────────────────────────────────────────────────────────
function PluginBlock({
  role, config, onChange, connections
}: {
  role: 'reader' | 'transformer' | 'writer';
  config: PluginConfig | undefined;
  onChange: (c: PluginConfig) => void;
  connections: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const plugins = role === 'reader' ? READER_PLUGINS : role === 'transformer' ? TRANSFORMER_PLUGINS : WRITER_PLUGINS;
  const roleLabel = role === 'reader' ? 'Reader' : role === 'transformer' ? 'Transformer' : 'Writer';
  const roleColor = role === 'reader' ? 'blue' : role === 'transformer' ? 'orange' : 'emerald';
  const RoleIcon = role === 'reader' ? Database : role === 'transformer' ? Cpu : Download;
  const [editingCol, setEditingCol] = useState<number | null>(null);

  if (!config) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-${roleColor}-500/30 bg-${roleColor}-500/5 min-w-[200px] min-h-[120px] cursor-pointer hover:border-${roleColor}-500/60 transition-all`}
        onClick={() => onChange({ pluginType: plugins[0].id })}
      >
        <RoleIcon className={`w-8 h-8 text-${roleColor}-400 opacity-40`} />
        <span className={`text-xs font-bold text-${roleColor}-400 opacity-60`}>{roleLabel}</span>
        <span className="text-xs text-slate-600">點擊新增</span>
      </div>
    );
  }

  const selectedPlugin = plugins.find(p => p.id === config.pluginType) || plugins[0];
  const isCsv = config.pluginType === 'csv_file_reader';
  const isText = config.pluginType === 'text_file_writer';
  const isJdbc = config.pluginType?.startsWith('jdbc');
  const isSqlExec = config.pluginType === 'sql_executor';

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl bg-${roleColor}-500/10 border border-${roleColor}-500/20 min-w-[240px] w-full`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 bg-${roleColor}-500/20 rounded-lg`}>
            <RoleIcon className={`w-4 h-4 text-${roleColor}-400`} />
          </div>
          <span className={`text-xs font-black uppercase tracking-widest text-${roleColor}-400`}>{roleLabel}</span>
        </div>
        <button
          onClick={() => onChange(undefined as any)}
          className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Plugin Selector */}
      <select
        className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium"
        value={config.pluginType}
        onChange={e => onChange({ ...config, pluginType: e.target.value })}
      >
        {plugins.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      {/* JDBC fields */}
      {isJdbc && (
        <>
          <select
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            value={config.connectionId || ''}
            onChange={e => onChange({ ...config, connectionId: e.target.value })}
          >
            <option value="">-- 選擇 Connection --</option>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="Database Name"
            value={config.database || ''}
            onChange={e => onChange({ ...config, database: e.target.value })}
          />
          <input
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="Table Name"
            value={config.tableName || ''}
            onChange={e => onChange({ ...config, tableName: e.target.value })}
          />
          {role === 'writer' && (
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={config.extraProps?.create_table || false}
                  onChange={e => onChange({ ...config, extraProps: { ...config.extraProps, create_table: e.target.checked } })}
                  className="accent-blue-500"
                /> CREATE TABLE
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={config.extraProps?.drop_table || false}
                  onChange={e => onChange({ ...config, extraProps: { ...config.extraProps, drop_table: e.target.checked } })}
                  className="accent-blue-500"
                /> DROP TABLE
              </label>
            </div>
          )}
        </>
      )}

      {/* CSV fields */}
      {isCsv && (
        <>
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="File Path" value={config.filePath || ''}
            onChange={e => onChange({ ...config, filePath: e.target.value })} />
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="File Name" value={config.fileName || ''}
            onChange={e => onChange({ ...config, fileName: e.target.value })} />
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="Delimiter (default: ,)" value={config.delimiter || ','}
            onChange={e => onChange({ ...config, delimiter: e.target.value })} />
        </>
      )}

      {/* Text file writer fields */}
      {isText && (
        <>
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="File Path" value={config.filePath || ''}
            onChange={e => onChange({ ...config, filePath: e.target.value })} />
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="File Name" value={config.fileName || ''}
            onChange={e => onChange({ ...config, fileName: e.target.value })} />
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="Encoding (e.g. UTF-8)" value={config.encoding || 'UTF-8'}
            onChange={e => onChange({ ...config, encoding: e.target.value })} />
          <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
            placeholder="Delimiter" value={config.delimiter || '|'}
            onChange={e => onChange({ ...config, delimiter: e.target.value })} />
        </>
      )}

      {/* Column definitions (for reader/transformer only) */}
      {role !== 'writer' && !isSqlExec && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Columns</span>
            <button
              onClick={() => onChange({ ...config, columns: [...(config.columns || []), { name: '', type: 'VARCHAR', length: 100 }] })}
              className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {(config.columns || []).map((col, idx) => (
              <div key={idx} className="flex gap-1 items-center">
                <input
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-600 min-w-0"
                  placeholder="col_name"
                  value={col.name}
                  onChange={e => {
                    const cols = [...(config.columns || [])];
                    cols[idx] = { ...col, name: e.target.value };
                    onChange({ ...config, columns: cols });
                  }}
                />
                <select
                  className="bg-black/30 border border-white/10 rounded-lg px-1 py-1 text-[10px] text-slate-300"
                  value={col.type}
                  onChange={e => {
                    const cols = [...(config.columns || [])];
                    cols[idx] = { ...col, type: e.target.value };
                    onChange({ ...config, columns: cols });
                  }}
                >
                  {['VARCHAR', 'INT', 'BIGINT', 'DECIMAL', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'TEXT'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => {
                  const cols = (config.columns || []).filter((_, i) => i !== idx);
                  onChange({ ...config, columns: cols });
                }} className="text-slate-500 hover:text-rose-400 p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transformer rules */}
      {role === 'transformer' && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Transform Rules</span>
            <button
              onClick={() => onChange({ ...config, transformRules: [...(config.transformRules || []), { targetColumn: '', rule: '', description: '' }] })}
              className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {(config.transformRules || []).map((rule, idx) => (
              <div key={idx} className="p-2 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-1">
                <input className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-600 w-full"
                  placeholder="Target Column"
                  value={rule.targetColumn}
                  onChange={e => {
                    const rules = [...(config.transformRules || [])];
                    rules[idx] = { ...rule, targetColumn: e.target.value };
                    onChange({ ...config, transformRules: rules });
                  }} />
                <input className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono placeholder-slate-600 w-full"
                  placeholder="Rule (e.g. DECODE(col,'Y','是','否'))"
                  value={rule.rule}
                  onChange={e => {
                    const rules = [...(config.transformRules || [])];
                    rules[idx] = { ...rule, rule: e.target.value };
                    onChange({ ...config, transformRules: rules });
                  }} />
                <div className="flex justify-end">
                  <button onClick={() => {
                    const rules = (config.transformRules || []).filter((_, i) => i !== idx);
                    onChange({ ...config, transformRules: rules });
                  }} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Arrow Connector ──────────────────────────────────────────────────────────
function Arrow({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center justify-center w-12 shrink-0">
      <div className="flex flex-col items-center gap-0.5">
        <div className={clsx("w-16 h-0.5 relative", connected ? "bg-blue-500/60" : "bg-white/10")}>
          <ChevronRight className={clsx("absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4", connected ? "text-blue-400" : "text-slate-600")} />
        </div>
        {connected && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
      </div>
    </div>
  );
}

// ─── DMStepCanvas (Data Management canvas) ───────────────────────────────────
function DMStepCanvas({ step, onChange, connections }: {
  step: JobStep;
  onChange: (patch: Partial<JobStep['config']>) => void;
  connections: { id: string; name: string }[];
}) {
  const cfg = step.config;
  return (
    <div className="flex items-start justify-center gap-2 p-4 overflow-x-auto min-h-[240px]">
      <PluginBlock
        role="reader"
        config={cfg.reader}
        onChange={(c) => onChange({ reader: c })}
        connections={connections}
      />
      <Arrow connected={!!(cfg.reader && cfg.transformer)} />
      <PluginBlock
        role="transformer"
        config={cfg.transformer}
        onChange={(c) => onChange({ transformer: c })}
        connections={connections}
      />
      <Arrow connected={!!(cfg.transformer && cfg.writer) || !!(cfg.reader && cfg.writer && !cfg.transformer)} />
      <PluginBlock
        role="writer"
        config={cfg.writer}
        onChange={(c) => onChange({ writer: c })}
        connections={connections}
      />
    </div>
  );
}

// ─── External Command Canvas ──────────────────────────────────────────────────
function ExternalCommandCanvas({ step, onChange }: { step: JobStep; onChange: (patch: Partial<JobStep['config']>) => void }) {
  const { t } = useTranslation();
  const [showScript, setShowScript] = useState(false);
  const useEmbedded = step.config.command?.includes('${EMBEDDED_SCRIPT}');

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Command</label>
        <input
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-600"
          placeholder='bash ${EMBEDDED_SCRIPT} 或 python /scripts/my_script.py'
          value={step.config.command || ''}
          onChange={e => onChange({ command: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowScript(!showScript)}
          className={clsx("text-xs px-3 py-1.5 rounded-xl border transition-colors font-bold",
            showScript ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
          )}
        >
          {showScript ? <Check className="w-3 h-3 inline mr-1.5" /> : <Plus className="w-3 h-3 inline mr-1.5" />}
          EMBEDDED_SCRIPT
        </button>
        <span className="text-xs text-slate-500">腳本直接嵌入 Step，無需外部檔案</span>
      </div>
      {showScript && (
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Embedded Script</label>
          <textarea
            className="w-full h-40 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 resize-none"
            placeholder="#!/bin/bash&#10;echo 'Hello '"
            value={step.config.embeddedScript || ''}
            onChange={e => onChange({ embeddedScript: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// ─── SQL Executor Canvas ──────────────────────────────────────────────────────
function SQLExecutorCanvas({ step, onChange, connections }: {
  step: JobStep; onChange: (patch: Partial<JobStep['config']>) => void;
  connections: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Connection</label>
        <select
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          value={step.config.connectionId || ''}
          onChange={e => onChange({ connectionId: e.target.value })}
        >
          <option value="">-- 選擇 Connection --</option>
          {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Run Mode</label>
        <div className="flex gap-2">
          {['before', 'within', 'after'].map(m => (
            <button key={m}
              onClick={() => onChange({ runMode: m })}
              className={clsx("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors",
                step.config.runMode === m ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">SQL Statement</label>
        <textarea
          className="w-full h-36 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 resize-none"
          placeholder="--  SQL Script&#10;.output&#10;SELECT * FROM tp.nation;"
          value={step.config.sqlStatement || ''}
          onChange={e => onChange({ sqlStatement: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── AddStepModal ────────────────────────────────────────────────────────────
function AddStepModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (type: JobStep['type'], name: string) => void;
}) {
  const [selectedType, setSelectedType] = useState<JobStep['type']>('data_management');
  const [name, setName] = useState('LOAD');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card border-white/10 rounded-3xl p-8 w-[480px] shadow-2xl">
        <h3 className="text-base font-black text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" />
          Add Step
        </h3>

        {/* Step Type Selection */}
        <div className="space-y-3 mb-6">
          {STEP_TYPES.map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedType(st.id as JobStep['type'])}
              className={clsx("w-full text-left p-4 rounded-2xl border transition-all",
                selectedType === st.id
                  ? `bg-${st.color}-500/20 border-${st.color}-500/40`
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className={clsx("text-sm font-black uppercase tracking-widest", selectedType === st.id ? `text-${st.color}-400` : "text-slate-300")}>
                {st.label}
              </div>
              <div className="text-xs text-slate-400 mt-1">{st.desc}</div>
            </button>
          ))}
        </div>

        {/* Step Name */}
        <div className="mb-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Step Name</label>
          <input
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 font-mono"
            value={name}
            onChange={e => setName(e.target.value.toUpperCase())}
            placeholder="STEP_NAME"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim()) onAdd(selectedType, name.trim()); onClose(); }}
            disabled={!name.trim()}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main StepCanvas Export ────────────────────────────────────────────────────
interface Props {
  jobId: string;
  jobName: string;
  agentId?: string;
  connections: { id: string; name: string }[];
  onClose?: () => void;
}

export default function StepCanvas({ jobId, jobName, agentId, connections, onClose }: Props) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<JobStep | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'properties'>('design');

  useEffect(() => {
    loadSteps();
  }, [jobId]);

  const loadSteps = async () => {
    try {
      const res = await fetch(`/api/jcs/hierarchy/${jobId}/steps`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSteps(data);
        if (data.length > 0 && !selectedStep) setSelectedStep(data[0]);
      }
    } catch (e) { console.error('Load steps error:', e); }
  };

  const handleAddStep = async (type: JobStep['type'], name: string) => {
    try {
      const res = await fetch(`/api/jcs/hierarchy/${jobId}/steps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });
      const step = await res.json();
      const newSteps = [...steps, step];
      setSteps(newSteps);
      setSelectedStep(step);
    } catch (e) { console.error('Add step error:', e); }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await fetch(`/api/jcs/hierarchy/${jobId}/steps/${stepId}`, { method: 'DELETE' });
      const filtered = steps.filter(s => s.id !== stepId);
      setSteps(filtered);
      if (selectedStep?.id === stepId) setSelectedStep(filtered[0] || null);
    } catch (e) { console.error('Delete step error:', e); }
  };

  const handleConfigChange = (patch: Partial<JobStep['config']>) => {
    if (!selectedStep) return;
    const updated = { ...selectedStep, config: { ...selectedStep.config, ...patch } };
    setSelectedStep(updated);
    setSteps(steps.map(s => s.id === updated.id ? updated : s));
  };

  const handleSave = async () => {
    if (!selectedStep) return;
    setSaving(true);
    try {
      await fetch(`/api/jcs/hierarchy/${jobId}/steps/${selectedStep.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedStep)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error('Save step error:', e); }
    setSaving(false);
  };

  const getStepTypeConfig = (type: JobStep['type']) => {
    return STEP_TYPES.find(st => st.id === type) || STEP_TYPES[0];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              {jobName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Agent: <span className="text-slate-300">{agentId || 'LOCAL_AGENT'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddStep(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600/80 hover:bg-blue-600 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedStep || saving}
            className={clsx("flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors",
              saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/10 hover:bg-white/20 text-slate-300 disabled:opacity-40"
            )}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Step List + Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Step List Sidebar */}
        <div className="w-52 shrink-0 border-r border-white/5 flex flex-col bg-black/20">
          <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
            Steps
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {steps.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-6 px-4">
                尚無 Step，點擊 Add Step 新增
              </div>
            )}
            {steps.map((step, idx) => {
              const tc = getStepTypeConfig(step.type);
              const isSelected = selectedStep?.id === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStep(step)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-all group",
                    isSelected ? `bg-${tc.color}-500/20 border border-${tc.color}-500/30` : "hover:bg-white/5"
                  )}
                >
                  <span className={clsx("text-[10px] font-black w-5 h-5 rounded-lg flex items-center justify-center shrink-0",
                    isSelected ? `bg-${tc.color}-500/30 text-${tc.color}-400` : "bg-white/5 text-slate-500"
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={clsx("text-xs font-bold truncate", isSelected ? "text-white" : "text-slate-300")}>
                      {step.name}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">{tc.label.split(' ')[0]}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteStep(step.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-slate-500 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Design Area */}
        {selectedStep ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Step Header with Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/10 shrink-0">
              <span className="text-xs text-slate-500">Step:</span>
              <span className="text-sm font-black text-white">{selectedStep.name}</span>
              <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                `bg-${getStepTypeConfig(selectedStep.type).color}-500/20 text-${getStepTypeConfig(selectedStep.type).color}-400`
              )}>
                {getStepTypeConfig(selectedStep.type).label}
              </span>
              <div className="ml-auto flex gap-1">
                {['design', 'properties'].map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={clsx("text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                      activeTab === tab ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab === 'design' ? 'Design' : 'Properties'}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.04)_0%,transparent_60%)]">
              {activeTab === 'design' && (
                <>
                  {selectedStep.type === 'data_management' && (
                    <DMStepCanvas step={selectedStep} onChange={handleConfigChange} connections={connections} />
                  )}
                  {selectedStep.type === 'external_command' && (
                    <ExternalCommandCanvas step={selectedStep} onChange={handleConfigChange} />
                  )}
                  {selectedStep.type === 'sql_executor' && (
                    <SQLExecutorCanvas step={selectedStep} onChange={handleConfigChange} connections={connections} />
                  )}
                </>
              )}
              {activeTab === 'properties' && (
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Step Name</label>
                    <input
                      className="w-full max-w-sm bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                      value={selectedStep.name}
                      onChange={e => handleConfigChange({ ...(selectedStep.config) })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStep.enabled}
                        onChange={e => {
                          const updated = { ...selectedStep, enabled: e.target.checked };
                          setSelectedStep(updated);
                          setSteps(steps.map(s => s.id === updated.id ? updated : s));
                        }}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-slate-300 font-medium">Step Enabled</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-3">
            <Settings2 className="w-12 h-12 opacity-20" />
            <span className="text-sm">選擇左側 Step 開始設計</span>
          </div>
        )}
      </div>

      {/* Add Step Modal */}
      {showAddStep && (
        <AddStepModal
          onClose={() => setShowAddStep(false)}
          onAdd={handleAddStep}
        />
      )}
    </div>
  );
}
