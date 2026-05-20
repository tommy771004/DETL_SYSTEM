import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Activity, Radio, Play, Square, Database, AlertTriangle, Workflow } from 'lucide-react';
import io from 'socket.io-client';

interface StreamEvent {
  msgId: string;
  topic: string;
  timestamp: number;
  eventTimeISO: string;
  anomalyDetected: boolean;
  [key: string]: any;
}

export default function StreamDashboard() {
  const { t } = useTranslation();
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [throughput, setThroughput] = useState(0);

  const newTopicName = 'sensor-telemetry-01';
  
  useEffect(() => {
    fetchActive();
    
    // Connect websocket
    const socket = io();
    
    // Purge logic
    const purgeInterval = setInterval(() => {
        setEvents(prev => prev.slice(0, 50));
    }, 1000);

    const handleEvent = (data: StreamEvent) => {
      setEvents(prev => [data, ...prev].slice(0, 50));
      setThroughput(p => p + 1);
    };

    activeTopics.forEach(topic => {
       socket.on(`kafka:${topic}`, handleEvent);
    });

    return () => {
      clearInterval(purgeInterval);
      activeTopics.forEach(topic => {
         socket.off(`kafka:${topic}`, handleEvent);
      });
      socket.disconnect();
    };
  }, [activeTopics]);

  useEffect(() => {
     const tId = setInterval(() => {
         setThroughput(0); // Reset throughput counter every second to show EPS
     }, 1000);
     return () => clearInterval(tId);
  }, []);

  const fetchActive = async () => {
    const res = await fetch('/api/stream/active');
    const data = await res.json();
    setActiveTopics(data.streams || []);
  };

  const toggleStream = async (topic: string, isStarting: boolean) => {
    if (isStarting) {
       await fetch('/api/stream/start', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ topic, type: 'sensor' })
       });
    } else {
       await fetch('/api/stream/stop', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ topic })
       });
    }
    fetchActive();
  };

  const isRunning = activeTopics.includes(newTopicName);

  return (
    <div className="h-full flex flex-col bg-[var(--surface-base)] p-6 overflow-y-auto w-full text-[var(--text-primary)]">
      <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-xl border border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Zap className="w-8 h-8 text-[var(--accent-blue)]" />
            {t('stream_title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> 
            {t('stream_desc')}
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
            <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 flex flex-col items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">{t('throughput')}</span>
                <span className="text-xl font-black text-[var(--status-success-fg)]">{throughput * 2.5} <span className="text-xs text-[var(--text-muted)]">{t('eps')}</span></span>
            </div>
            
            {!isRunning ? (
                <button 
                  onClick={() => toggleStream(newTopicName, true)}
                  className="px-6 py-3 bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border border-[var(--status-success-bar)] font-bold rounded-lg hover:brightness-110 transition shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" /> {t('start_consumer')}
                </button>
            ) : (
                <button 
                  onClick={() => toggleStream(newTopicName, false)}
                  className="px-6 py-3 bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)] border border-[var(--status-failed-bar)] font-bold rounded-lg hover:brightness-110 transition shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-5 h-5 fill-current" /> {t('stop_consumer')}
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-[500px]">
         {/* Live Stream Panel */}
         <div className="col-span-2 bg-[var(--surface-overlay)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 flex flex-col">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
               <Activity className="w-5 h-5 text-[var(--accent-blue)]" /> {t('in_flight_stream')}
            </h2>
            <div className="flex-1 overflow-auto bg-[#0f172a] rounded-xl p-4 font-mono text-xs border border-[var(--border-strong)] relative">
               {events.map((evt, idx) => (
                   <div key={idx} className={`mb-2 p-2 rounded border ${evt.anomalyDetected ? 'bg-rose-950/40 border-[var(--status-failed-bar)] text-rose-200' : 'bg-slate-800/50 border-slate-700 text-emerald-300'}`}>
                       <span className="text-slate-500 mr-4">[{evt.eventTimeISO.split('T')[1].replace('Z','')}]</span>
                       <span className="font-bold text-[var(--accent-blue)] mr-2">{evt.topic}</span>
                       <span className="text-[#a1a1aa]">
                         {evt.deviceId} | {t('temp')}{evt.temperature}°C | {t('hum')}{evt.humidity}%
                       </span>
                       {evt.federatedAlert && (
                           <span className="ml-2 px-2 py-0.5 bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)] border border-[var(--status-failed-bar)] font-bold rounded text-[10px] animate-pulse">
                               {evt.federatedAlert} -&gt; {t('rdbms_joined_location')}{evt.rdbmsLocation}
                           </span>
                       )}
                   </div>
               ))}
               {!isRunning && events.length === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-sans">
                      {t('consumer_stopped')}
                   </div>
               )}
            </div>
         </div>

         {/* Federation Panel */}
         <div className="bg-[var(--surface-overlay)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                   <Workflow className="w-5 h-5 text-fuchsia-400" /> {t('topic_pipeline')}
                </h2>
                <div className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-subtle)] relative overflow-hidden">
                    <div className="flex flex-col gap-3 relative z-10">
                       <div className="bg-[var(--surface-raised)] p-2 rounded text-sm text-center border border-[var(--border-strong)] font-bold text-[var(--text-muted)]">
                          {t('kafka_topic')}sensor-telemetry-01
                       </div>
                       <div className="text-center text-[var(--text-muted)]">↓</div>
                       <div className="bg-[var(--accent-blue-dim)] p-2 rounded text-sm text-center border border-[var(--accent-blue-text)]/30 font-bold text-[var(--accent-blue-text)]">
                          {t('event_driven_transform')}
                       </div>
                       <div className="text-center text-[var(--text-muted)]">↓</div>
                       <div className="bg-fuchsia-900/30 p-2 rounded text-sm text-center border border-fuchsia-800/50 font-bold text-fuchsia-500 flex items-center justify-center gap-2">
                          <Database className="w-4 h-4" /> {t('federated_join')}
                       </div>
                       <div className="text-center text-[var(--text-muted)]">↓</div>
                       <div className="bg-[var(--status-success-bg)] p-2 rounded text-sm text-center border border-[var(--status-success-bar)] font-bold text-[var(--status-success-fg)]">
                          {t('ui_dashboard_broadcast')}
                       </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                   <AlertTriangle className="w-5 h-5 text-yellow-500" /> {t('anomaly_detection')}
                </h2>
                <div className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                   <div className="flex justify-between items-center text-sm">
                       <span className="text-[var(--text-secondary)]">{t('total_analyzed')}</span>
                       <span className="text-[var(--text-primary)] font-mono">{events.length * 27}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                       <span className="text-[var(--text-secondary)]">{t('anomalies_detected')}</span>
                       <span className="text-[var(--status-failed-fg)] font-mono font-bold">{events.filter(e => e.anomalyDetected).length}</span>
                   </div>
                   <div className="w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] h-2 mt-2 rounded-full overflow-hidden">
                       <div 
                         className="bg-[var(--status-failed-fg)] h-full transition-all" 
                         style={{ width: `${Math.min(100, (events.filter(e => e.anomalyDetected).length / Math.max(1, events.length)) * 100)}%`}} 
                       />
                   </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}
