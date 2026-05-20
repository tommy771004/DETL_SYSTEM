import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import clsx from 'clsx';

import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import ContentHeader from './layout/ContentHeader';
import Designer from './layout/Designer';

import JcsDashboard from './components/JcsDashboard';
import AdminDashboard from './components/AdminDashboard';
import MetamanDashboard from './components/MetamanDashboard';
import DataQualityDashboard from './components/DataQualityDashboard';
import IamDashboard from './components/IamDashboard';
import AuditDashboard from './components/AuditDashboard';
import MdmDashboard from './components/MdmDashboard';
import StreamDashboard from './components/StreamDashboard';
import UnstructuredDashboard from './components/UnstructuredDashboard';
import DpDashboard from './components/DpDashboard';

interface Toast {
  id: number;
  type: 'error' | 'success' | 'info';
  msg: string;
}

export default function App() {
  const { t } = useTranslation();
  const [log, setLog] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('designer');
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [adminTab, setAdminTab] = useState('resource'); // 'resource', 'metamain', 'agent', 'scheduler', 'settings'
  
  const [pipelineConfig, setPipelineConfig] = useState<any>({
    "pipelineId": "custom_pipeline_" + Date.now(),
    "trigger": { "type": "webhook", "dynamicPayload": true }, 
    "variables": {},
    "nodes": [],
    "edges": []
  });

  const mouseRef = useRef({ x: 0, y: 0 });

  const addToast = useCallback((type: 'error' | 'success' | 'info', msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const socket = io();

    socket.on('connect', () => console.log('Connected to WebSocket'));
    socket.on('node-progress', (data) => {
      setLog(prev => [...prev, { type: data.status === 'error' ? 'error' : 'info', msg: `[${data.nodeId || 'SYS'}] ${data.message}`, details: data }]);
      if (data.status === 'error') addToast('error', `[${data.nodeId}] ${data.message}`);
    });
    socket.on('pipeline-completed', (data) => {
       setLog(prev => [...prev, { type: 'success', msg: t('pipeline_exec_complete'), details: data }]);
       addToast('success', t('pipeline_exec_complete'));
       setRunning(false);
    });
    socket.on('pipeline-failed', (data) => {
       setLog(prev => [...prev, { type: 'error', msg: `${t('pipeline_failed')}: ${data.message}` }]);
       addToast('error', `${t('pipeline_failed')}: ${data.message}`);
       setRunning(false);
    });

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const blobs = document.querySelectorAll('.liquid-blob');
      blobs.forEach((blob, idx) => {
        const speed = (idx + 1) * 0.05;
        const xMode = idx % 2 === 0 ? 1 : -1;
        const currentTransform = (blob as HTMLElement).style.transform || 'translate(0px, 0px)';
        const safeX = mouseRef.current.x * speed * xMode;
        const safeY = mouseRef.current.y * speed;
        (blob as HTMLElement).style.transform = `translate(${safeX}px, ${safeY}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Initial theme set
    const savedTheme = localStorage.getItem('dsystem-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    return () => { 
      socket.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [addToast, t]);

  const handleTestRun = async () => {
    setRunning(true);
    setLog([{ type: 'info', msg: t('init_test_run') }]);
    addToast('info', t('init_test_run'));
    try {
      const webhookRes = await fetch(`/api/pipelines/${pipelineConfig.pipelineId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: pipelineConfig, variables: pipelineConfig.variables || {} })
      });
      const data = await webhookRes.json();
      setLog(prev => [...prev, { type: 'success', msg: `${t('task_dispatched')} (Job ID: ${data.jobId})`, details: data }]);
      addToast('success', `${t('task_dispatched')} (Job ID: ${data.jobId})`);
      const socket = io();
      socket.emit('subscribe', data.jobId);
    } catch (err) {
      setLog(prev => [...prev, { type: 'error', msg: 'Run failed: ' + String(err) }]);
      addToast('error', 'Run failed: ' + String(err));
      setRunning(false);
    } 
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)] relative">
      {/* Animated Background Blobs for Liquid Glass Context */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen z-0">
        <div className="liquid-blob absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite] transition-transform duration-1000 ease-out" style={{ backgroundColor: 'var(--blob-1)' }}></div>
        <div className="liquid-blob absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] transition-transform duration-1000 ease-out delay-700" style={{ backgroundColor: 'var(--blob-2)' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-white/5 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="z-10 flex flex-col h-full w-full">
        <Header />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
          <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">

            <ContentHeader activeTab={activeTab} adminTab={adminTab} setAdminTab={setAdminTab} />
            <div className="flex-1 relative overflow-auto z-10 w-full h-full pb-4">
               {activeTab === 'designer' && <Designer pipelineConfig={pipelineConfig} setPipelineConfig={setPipelineConfig} log={log} running={running} handleTestRun={handleTestRun} onDragStart={onDragStart} />}
               {activeTab === 'console' && <JcsDashboard />}
               {activeTab === 'admin' && <AdminDashboard adminTab={adminTab} />}
               {activeTab === 'metaman' && <MetamanDashboard />}
               {activeTab === 'quality' && <DataQualityDashboard />}
               {activeTab === 'iam' && <IamDashboard />}
               {activeTab === 'audit' && <AuditDashboard />}
               {activeTab === 'mdm' && <MdmDashboard />}
               {activeTab === 'stream' && <StreamDashboard />}
               {activeTab === 'unstructured' && <UnstructuredDashboard />}
               {activeTab === 'dp' && <DpDashboard />}
            </div>
          </div>

          {/* Global Toast Container */}
          <div className="absolute bottom-6 right-8 flex flex-col gap-3 z-50 pointer-events-none">
               {toasts.map(toast => (
               <div 
                 key={toast.id} 
                 className={clsx(
                   "pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl glass-card w-80 translate-y-0 opacity-100 transition-all duration-300 shadow-2xl glass-interactive",
                   toast.type === 'error' ? "border-rose-500/30 text-rose-400" :
                   toast.type === 'success' ? "border-emerald-500/30 text-emerald-400" :
                   "border-white/10 text-[var(--text-primary)]"
                 )}
               >
                 <div className={clsx(
                   "p-2 rounded-xl shadow-inner",
                   toast.type === 'error' ? "bg-rose-500/20 shadow-rose-500/20" :
                   toast.type === 'success' ? "bg-emerald-500/20 shadow-emerald-500/20" :
                   "bg-white/10"
                 )}>
                   {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                   {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
                   {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-400" />}
                 </div>
                 
                 <p className="text-sm font-bold flex-1 break-words leading-snug tracking-tight">{toast.msg}</p>
                 <button onClick={() => removeToast(toast.id)} className="p-1.5 hover:bg-white/10 rounded-full shrink-0 transition-colors active:scale-95">
                   <X className="w-4 h-4" />
                 </button>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* SVG Liquid Filter Definition */}
      <svg id="liquid-filter" xmlns="http://www.w3.org/2000/svg" version="1.1">
        <defs>
          <filter id="liquid-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="liquid" />
            <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
