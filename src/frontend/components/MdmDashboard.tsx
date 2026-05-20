import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Merge, Check, X, AlertCircle, Edit3, Save, Database, BrainCircuit, RefreshCw } from 'lucide-react';

interface MatchSuggestion {
  suggestionId: string;
  recordA: any;
  recordB: any;
  confidenceScore: number;
  status: string;
  proposedGoldenRecord: any;
  matchReasons: string[];
}

export default function MdmDashboard() {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGolden, setEditGolden] = useState<any>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mdm/suggestions');
      const data = await res.json();
      setSuggestions(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const recalculateData = async () => {
    setLoading(true);
    await fetch('/api/mdm/recalculate', { method: 'POST' });
    await fetchSuggestions();
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleResolve = async (suggestionId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const payload: any = { suggestionId, action };
      if (action === 'APPROVE' && editingId === suggestionId) {
        payload.customGoldenConfig = editGolden;
      }
      
      const res = await fetch('/api/mdm/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.suggestionId !== suggestionId));
        setEditingId(null);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 75) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface-base)] p-6 overflow-y-auto w-full">
      <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Database className="w-8 h-8 text-[var(--accent-blue)]" />
            {t('mdm_title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-[var(--accent-blue)]" /> 
            {t('mdm_desc')}
          </p>
        </div>
        <button 
          onClick={recalculateData}
          className="px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border-strong)] text-[var(--text-primary)] font-bold text-sm rounded-lg hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> {t('recalculate_ml')}
        </button>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="text-center p-12 text-[var(--text-secondary)]">{t('running_mdm_models')}</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center p-12 bg-[var(--surface-overlay)] rounded-2xl border border-[var(--border-subtle)]">
            <Check className="w-12 h-12 text-[var(--status-success-fg)] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('data_clean')}</h3>
            <p className="text-[var(--text-secondary)] mt-2">{t('no_mdm_suggestions')}</p>
          </div>
        ) : (
          suggestions.map((sug) => (
            <div key={sug.suggestionId} className="bg-[var(--surface-overlay)] rounded-2xl shadow-sm border border-[var(--border-subtle)] p-6 transition-colors hover:border-[var(--border-strong)]">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded border font-black text-lg bg-emerald-900/30 text-emerald-400 border-[var(--status-success-bar)]`}>
                    {t('match_ratio', { score: sug.confidenceScore })}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-lg">{t('potential_duplicate')}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sug.matchReasons.map((r, i) => (
                        <span key={i} className="text-[10px] font-semibold bg-fuchsia-900/30 text-fuchsia-400 px-2 py-0.5 rounded-full border border-fuchsia-800/50">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleResolve(sug.suggestionId, 'REJECT')}
                    className="px-4 py-2 bg-red-900/30 border border-red-800/50 text-red-500 font-bold text-sm rounded-lg hover:bg-red-900/50 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> {t('reject_merge')}
                  </button>
                  <button 
                    onClick={() => handleResolve(sug.suggestionId, 'APPROVE')}
                    className="px-4 py-2 bg-[var(--status-success-bg)] border border-[var(--status-success-bar)] text-[var(--status-success-fg)] font-bold text-sm rounded-lg hover:brightness-110 transition flex items-center gap-2 shadow-sm"
                  >
                    <Merge className="w-4 h-4" /> {t('approve_merge')}
                  </button>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-3 gap-6 bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-subtle)]">
                
                {/* Record A */}
                <div className="bg-[var(--surface-overlay)] p-4 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3 flex justify-between">
                    <span>{t('source')} 1: {sug.recordA.source}</span>
                    <span className="font-mono text-[10px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-1 rounded">{sug.recordA.id}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('name')}</span>
                      <strong className="text-sm text-[var(--text-primary)]">{sug.recordA.name}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('email')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordA.email}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('phone')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordA.phone}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('address')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordA.address}</span>
                    </div>
                  </div>
                </div>

                {/* Record B */}
                <div className="bg-[var(--surface-overlay)] p-4 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3 flex justify-between">
                    <span>{t('source')} 2: {sug.recordB.source}</span>
                    <span className="font-mono text-[10px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-1 rounded">{sug.recordB.id}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('name')}</span>
                      <strong className="text-sm text-[var(--text-primary)]">{sug.recordB.name}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('email')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordB.email}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('phone')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordB.phone}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('address')}</span>
                      <span className="text-sm text-[var(--text-secondary)]">{sug.recordB.address}</span>
                    </div>
                  </div>
                </div>

                {/* AI Golden Record Proposal */}
                <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-900/50 relative shadow-inner">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--surface-raised)] rounded-full border border-[var(--border-strong)] flex items-center justify-center z-10 shadow-sm">
                    <Merge className="w-3 h-3 text-[var(--text-muted)]" />
                  </div>
                  
                  <div className="text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> {t('ai_golden_record')}</span>
                    {editingId !== sug.suggestionId && (
                      <button 
                        onClick={() => {
                          setEditingId(sug.suggestionId);
                          setEditGolden({...sug.proposedGoldenRecord});
                        }} 
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {editingId === sug.suggestionId ? (
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('name')}</span>
                        <input className="w-full text-sm p-1.5 rounded bg-[var(--surface-base)] border border-indigo-900/50 focus:outline-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] text-[var(--text-primary)]" value={editGolden.name} onChange={e => setEditGolden({...editGolden, name: e.target.value})} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('email')}</span>
                        <input className="w-full text-sm p-1.5 rounded bg-[var(--surface-base)] border border-indigo-900/50 focus:outline-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] text-[var(--text-primary)]" value={editGolden.email} onChange={e => setEditGolden({...editGolden, email: e.target.value})} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('phone')}</span>
                        <input className="w-full text-sm p-1.5 rounded bg-[var(--surface-base)] border border-indigo-900/50 focus:outline-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] text-[var(--text-primary)]" value={editGolden.phone} onChange={e => setEditGolden({...editGolden, phone: e.target.value})} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('address')}</span>
                        <input className="w-full text-sm p-1.5 rounded bg-[var(--surface-base)] border border-indigo-900/50 focus:outline-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] text-[var(--text-primary)]" value={editGolden.address} onChange={e => setEditGolden({...editGolden, address: e.target.value})} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('name')}</span>
                        <strong className="text-sm text-indigo-200">{sug.proposedGoldenRecord.name}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('email')}</span>
                        <span className="text-sm text-indigo-300">{sug.proposedGoldenRecord.email}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('phone')}</span>
                        <span className="text-sm text-indigo-300">{sug.proposedGoldenRecord.phone}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('address')}</span>
                        <span className="text-sm text-indigo-300">{sug.proposedGoldenRecord.address}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
