/**
 * @file Designer.tsx (JFDesigner)
 * @description Trinity 5 JFDesigner — 左側 Job 樹 + 右側 Job 設計器。
 * 支援 General / Steps / Variables 三個標籤頁。
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings2, PlayCircle, Activity,
  User, Clock, FileText, Plus, Trash2, Check, X, Save,
  Layers, Cpu, Database, Variable, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import JobTree from '../components/JobTree/JobTree';
import StepCanvas from '../components/StepCanvas';

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobVariable { key: string; value: string; scope: 'global' | 'entity' | 'category' | 'job'; }
interface JobMeta {
  id: string; name: string; type: 'entity' | 'category' | 'job';
  description?: string; agentId?: string; frequency?: string;
  active?: boolean; checkedOutBy?: string;
}

// ─── General Tab ─────────────────────────────────────────────────────────────
function GeneralTab({ job, onSave }: { job: JobMeta; onSave: (patch: Partial<JobMeta>) => void }) {
  const [form, setForm] = useState<Partial<JobMeta>>({
    description: job.description || '',
    agentId: job.agentId || 'LOCAL_AGENT',
    frequency: job.frequency || 'daily',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ description: job.description || '', agentId: job.agentId || 'LOCAL_AGENT', frequency: job.frequency || 'daily' });
  }, [job.id]);

  const handleSave = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="p-6 flex flex-col gap-5 max-w-lg">
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Job ID</div>
        <div className="font-mono text-sm text-slate-300">{job.id}</div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Name</label>
        <input className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono opacity-60" value={job.name} readOnly />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><User className="w-3 h-3" /> Agent</label>
        <select className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })}>
          <option value="LOCAL_AGENT">LOCAL_AGENT</option>
          <option value="REMOTE_AGENT_01">REMOTE_AGENT_01</option>
          <option value="REMOTE_AGENT_02">REMOTE_AGENT_02</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Frequency</label>
        <select className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
          {['manual', 'daily', 'weekly', 'monthly', 'cron'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Description</label>
        <textarea className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none h-28" value={form.description} placeholder="Job description..." onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <button onClick={handleSave} className={clsx("flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl w-fit transition-all", saved ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-blue-600 hover:bg-blue-500 text-white")}>
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  );
}

// ─── Variables Tab ────────────────────────────────────────────────────────────
function VariablesTab({ jobId }: { jobId: string }) {
  const [vars, setVars] = useState<JobVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/jcs/hierarchy/${jobId}/variables`)
      .then(r => r.json())
      .then((data: JobVariable[]) => { if (Array.isArray(data)) setVars(data); })
      .catch(() => {});
  }, [jobId]);

  const addVar = () => setVars([...vars, { key: '', value: '', scope: 'job' }]);
  const removeVar = (i: number) => setVars(vars.filter((_, idx) => idx !== i));
  const updateVar = (i: number, patch: Partial<JobVariable>) => {
    const updated = [...vars]; updated[i] = { ...updated[i], ...patch }; setVars(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/jcs/hierarchy/${jobId}/variables`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: vars }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error('Save variables error:', e); }
    setSaving(false);
  };
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
        <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">System Built-in Variables</div>
        <div className="flex flex-wrap gap-2">
          {['${SYS_DATE}', '${SYS_TIME}', '${SYS_DATETIME}', '${JOB_NAME}', '${JOB_ID}', '${AGENT_NAME}'].map(v => (
            <span key={v} className="font-mono text-xs bg-black/30 border border-purple-500/20 px-2 py-1 rounded-lg text-purple-300">{v}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Variables</span>
          <button onClick={addVar} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600/60 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors">
            <Plus className="w-3 h-3" /> Add Variable
          </button>
        </div>
        <div className="space-y-2">
          {vars.map((v, i) => (
            <div key={i} className="flex gap-2 items-center p-3 bg-black/20 rounded-2xl border border-white/5">
              <input className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600" placeholder="VARIABLE_NAME" value={v.key} onChange={e => updateVar(i, { key: e.target.value.toUpperCase() })} />
              <input className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600" placeholder="Value or ${SYS_VAR}" value={v.value} onChange={e => updateVar(i, { value: e.target.value })} />
              <select className="bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-300" value={v.scope} onChange={e => updateVar(i, { scope: e.target.value as any })}>
                {['global', 'entity', 'category', 'job'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => removeVar(i)} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {vars.length === 0 && <div className="text-xs text-slate-500 py-6 text-center">尚無自定義變數</div>}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all bg-blue-600/70 hover:bg-blue-600 text-white disabled:opacity-40"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Variables'}
        </button>
      </div>
    </div>
  );
}

// ─── Job Editor Panel ──────────────────────────────────────────────────────────
function JobEditorPanel({ job, connections, onClose, onRun }: {
  job: JobMeta; connections: { id: string; name: string }[]; onClose: () => void; onRun: (jobId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'general' | 'steps' | 'variables'>('steps');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ success: boolean; msg: string } | null>(null);
  const isJob = job.type === 'job';

  const handleRun = async () => {
    setRunning(true); setRunResult(null);
    try {
      const res = await fetch(`/api/jcs/hierarchy/${job.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id }) });
      const data = await res.json();
      setRunResult({ success: res.ok, msg: data.message || data.error || 'Dispatched' });
      onRun(job.id);
    } catch (e: any) { setRunResult({ success: false, msg: e.message }); }
    setRunning(false); setTimeout(() => setRunResult(null), 4000);
  };

  const handleSaveGeneral = async (patch: Partial<JobMeta>) => {
    await fetch(`/api/jcs/hierarchy/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings2 },
    ...(isJob ? [{ id: 'steps', label: 'Steps', icon: Layers }] : []),
    { id: 'variables', label: 'Variables', icon: Variable },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--surface-base)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-black/30">
        <div className="flex items-center gap-3">
          <div className={clsx("px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg", job.type === 'job' ? "bg-blue-500/20 text-blue-400" : job.type === 'category' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
            {job.type}
          </div>
          <span className="text-sm font-black text-white">{job.name}</span>
          {job.checkedOutBy && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Locked by {job.checkedOutBy}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isJob && (
            <button onClick={handleRun} disabled={running} className={clsx("flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all", running ? "bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30")}>
              {running ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {running ? 'Running...' : 'Run Job'}
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {runResult && (
        <div className={clsx("mx-4 mt-3 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0", runResult.success ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30")}>
          {runResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {runResult.msg}
        </div>
      )}

      <div className="flex gap-1 px-4 pt-3 border-b border-white/5 shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all", activeTab === tab.id ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 border-b-transparent" : "text-slate-400 hover:text-white hover:bg-white/5")}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'general' && <GeneralTab job={job} onSave={handleSaveGeneral} />}
        {activeTab === 'steps' && isJob && <StepCanvas jobId={job.id} jobName={job.name} agentId={job.agentId} connections={connections} />}
        {activeTab === 'steps' && !isJob && <div className="flex items-center justify-center h-full text-slate-500 text-sm">Steps 僅在 Job 節點可用</div>}
        {activeTab === 'variables' && <VariablesTab jobId={job.id} />}
      </div>
    </div>
  );
}

// ─── Welcome Panel ────────────────────────────────────────────────────────────
function WelcomePanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <Layers className="w-10 h-10 text-blue-400/60" />
      </div>
      <div>
        <div className="text-lg font-black text-white/80 mb-2">JF Designer</div>
        <div className="text-sm text-slate-500 max-w-sm leading-relaxed">
          從左側 Job Hierarchy 選擇一個 <span className="text-blue-400 font-bold">Job</span> 節點，<br />
          開始設計 ETL Steps 與執行邏輯。
        </div>
      </div>
      <div className="flex gap-3">
        {[
          { icon: Database, label: 'Reader Plugin', desc: 'JDBC / CSV / FTP' },
          { icon: Cpu, label: 'Transformer', desc: 'DECODE / CDC' },
          { icon: Database, label: 'Writer Plugin', desc: 'JDBC / File' },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl w-28">
            <item.icon className="w-6 h-6 text-blue-400/70" />
            <div className="text-[10px] font-black text-slate-300">{item.label}</div>
            <div className="text-[9px] text-slate-500">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Designer({
  pipelineConfig, setPipelineConfig, log, running, handleTestRun, onDragStart
}: any) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobMeta | null>(null);
  const [connections, setConnections] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/admin/connections').then(r => r.json()).then(data => {
      const list: any[] = data.connections || (Array.isArray(data) ? data : []);
      setConnections(list.map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, []);

  const handleSelectJob = useCallback((jobId: string, node?: any) => {
    setSelectedJobId(jobId);
    if (node) {
      setSelectedJob({ id: node.id, name: node.name, type: node.type, active: node.active, checkedOutBy: node.checkedOutBy });
    } else {
      fetch(`/api/jcs/hierarchy/${jobId}`).then(r => r.json()).then(setSelectedJob)
        .catch(() => setSelectedJob({ id: jobId, name: jobId, type: 'job' }));
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      <div className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-black/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Hierarchy</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <JobTree onSelectJob={(jobId: string, node?: any) => handleSelectJob(jobId, node)} selectedJobId={selectedJobId || ''} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedJob ? (
          <JobEditorPanel job={selectedJob} connections={connections} onClose={() => { setSelectedJobId(null); setSelectedJob(null); }} onRun={() => {}} />
        ) : (
          <WelcomePanel />
        )}
      </div>
    </div>
  );
}
