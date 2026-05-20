import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlignLeft, FileText, Globe, Server, Database, Check, Play, RefreshCw, FileCode } from 'lucide-react';

export default function UnstructuredDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'parser'|'connectors'>('parser');
  
  // Parser State
  const [logInput, setLogInput] = useState('192.168.1.10 - - [04/May/2026:13:00:00 +0000] "GET /api/v1/users HTTP/1.1" 200 1024\\n10.5.0.2 - - [04/May/2026:13:01:15 +0000] "POST /api/v1/auth HTTP/1.1" 401 512');
  const [parseResult, setParseResult] = useState<any>(null);
  const [loadingParse, setLoadingParse] = useState(false);

  // Connector State
  const [connStatus, setConnStatus] = useState<any>({});
  const [loadingConn, setLoadingConn] = useState(false);

  const testParseLog = async () => {
    setLoadingParse(true);
    try {
      const res = await fetch('/api/unstructured/extract/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logData: logInput })
      });
      const data = await res.json();
      setParseResult(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingParse(false);
    }
  };

  const extractPdf = async () => {
    setLoadingParse(true);
    try {
      const res = await fetch('/api/unstructured/extract/pdf', { method: 'POST' });
      const data = await res.json();
      setParseResult(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingParse(false);
    }
  };

  const testConnection = async (type: 'nosql' | 'hdfs') => {
    setLoadingConn(true);
    try {
       const res = await fetch(`/api/unstructured/connect/${type}`, {
         method: 'POST', 
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({})
       });
       const data = await res.json();
       setConnStatus((prev:any) => ({...prev, [type]: data}));
    } catch(err) {
       setConnStatus((prev:any) => ({...prev, [type]: {success: false, error: 'Connection failed'}}));
    } finally {
       setLoadingConn(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface-base)] p-6 overflow-y-auto w-full">
      <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <AlignLeft className="w-8 h-8 text-[var(--accent-blue)]" />
            {t('unstructured_title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-[var(--accent-blue)]" /> 
            {t('unstructured_desc')}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
          <button 
             onClick={() => setActiveTab('parser')}
             className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'parser' ? 'bg-[var(--accent-blue)] text-white shadow-sm' : 'bg-[var(--surface-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'}`}
          >
             {t('parsers_extractors')}
          </button>
          <button 
             onClick={() => setActiveTab('connectors')}
             className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'connectors' ? 'bg-[var(--accent-blue)] text-white shadow-sm' : 'bg-[var(--surface-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'}`}
          >
             {t('big_data_nosql')}
          </button>
      </div>

      <div className="flex-1 max-w-5xl w-full">
        {activeTab === 'parser' && (
          <div className="space-y-6">
             <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-500" /> {t('server_access_log')}
                </h2>
                <textarea 
                   className="w-full h-32 p-3 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm rounded-xl border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] mb-4"
                   value={logInput}
                   onChange={e => setLogInput(e.target.value)}
                />
                <button 
                   onClick={testParseLog} disabled={loadingParse}
                   className="px-4 py-2 bg-[var(--accent-blue)] text-white font-bold rounded-lg hover:bg-blue-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" /> {t('simulate_parsing')}
                </button>
             </div>

             <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-rose-500" /> {t('pdf_extraction')}
                </h2>
                <button 
                   onClick={extractPdf} disabled={loadingParse}
                   className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" /> {t('run_pdf_task')}
                </button>
             </div>

             {parseResult && (
               <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-lg border border-[var(--border-strong)]">
                 <h3 className="text-[var(--text-primary)] font-bold mb-3 flex items-center gap-2">
                   <Check className="w-5 h-5 text-[var(--status-success-fg)]" /> {t('extraction_results')}
                 </h3>
                 <pre className="bg-[#1e1e1e] border border-[var(--border-subtle)] p-4 rounded-xl text-[#d4d4d4] font-mono text-xs overflow-auto max-h-64">
                    {JSON.stringify(parseResult, null, 2)}
                 </pre>
               </div>
             )}
          </div>
        )}

        {activeTab === 'connectors' && (
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)] flex flex-col items-start gap-4">
                <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center border border-[var(--status-success-bar)]">
                   <Database className="w-6 h-6 text-[var(--status-success-fg)]" />
                </div>
                <div>
                   <h2 className="text-lg font-bold text-[var(--text-primary)]">MongoDB / Document Store</h2>
                   <p className="text-xs text-[var(--text-muted)] mt-1">{t('mongodb_desc')}</p>
                </div>
                <div className="w-full bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)]">
                   mongodb://admin:****@nosql-cluster.internal:27017
                </div>
                <button 
                  onClick={() => testConnection('nosql')}
                  className="mt-auto px-4 py-2 bg-green-600/20 text-[var(--status-success-fg)] border border-[var(--status-success-bar)] font-bold rounded-lg hover:bg-green-600/30 transition flex items-center gap-2 w-full justify-center shadow-inner"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingConn ? 'animate-spin' : ''}`} /> {t('test_connection')}
                </button>

                {connStatus['nosql'] && (
                  <div className={`w-full p-3 rounded-lg border text-sm font-bold flex items-center gap-2 ${connStatus['nosql'].success ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-[var(--status-success-bar)]' : 'bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)] border-[var(--status-failed-bar)]'}`}>
                     {connStatus['nosql'].success ? <Check className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                     {connStatus['nosql'].message || connStatus['nosql'].error}
                  </div>
                )}
             </div>

             <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)] flex flex-col items-start gap-4">
                <div className="w-12 h-12 bg-amber-900/30 rounded-xl flex items-center justify-center border border-amber-800/50">
                   <Server className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                   <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('hadoop_hdfs')}</h2>
                   <p className="text-xs text-[var(--text-muted)] mt-1">{t('hadoop_desc')}</p>
                </div>
                <div className="w-full bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)]">
                   hdfs://namenode:9000/data/lake/raw/
                </div>
                <button 
                  onClick={() => testConnection('hdfs')}
                  className="mt-auto px-4 py-2 bg-amber-600/20 text-amber-500 border border-amber-800/50 font-bold rounded-lg hover:bg-amber-600/30 transition flex items-center gap-2 w-full justify-center shadow-inner"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingConn ? 'animate-spin' : ''}`} /> {t('test_connection')}
                </button>

                {connStatus['hdfs'] && (
                  <div className={`w-full p-3 rounded-lg border text-sm font-bold flex items-center gap-2 ${connStatus['hdfs'].success ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-[var(--status-success-bar)]' : 'bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)] border-[var(--status-failed-bar)]'}`}>
                     {connStatus['hdfs'].success ? <Check className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                     {connStatus['hdfs'].message || connStatus['hdfs'].error}
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
