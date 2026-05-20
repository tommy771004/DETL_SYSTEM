import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Unlock, FileText, AlertTriangle, Key, Check } from 'lucide-react';

export default function DpDashboard() {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("Customer Mr. John Doe reported an issue on 2026-05-04. Please contact him at 555-123-4567 or john.doe@email.com. His SSN is 123-45-6789.");
  const [maskedResult, setMaskedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Unmasking
  const [unmaskReason, setUnmaskReason] = useState('Customer Support Request #9910');
  const [unmaskUserId, setUnmaskUserId] = useState('agent_karen');
  const [unmaskedText, setUnmaskedText] = useState<string | null>(null);

  const handleMask = async () => {
    setLoading(true);
    setUnmaskedText(null);
    try {
      const res = await fetch('/api/dp/mask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      const data = await res.json();
      setMaskedResult(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmask = async () => {
    if (!maskedResult?.vaultId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dp/unmask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vaultId: maskedResult.vaultId, 
          maskedText: maskedResult.maskedText,
          reason: unmaskReason,
          userId: unmaskUserId
        })
      });
      const data = await res.json();
      if (data.success) {
        setUnmaskedText(data.unmaskedText);
      } else {
         alert('Unmasking failed: ' + data.error);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[var(--surface-base)] relative overflow-hidden">
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="mb-6 flex justify-between items-center bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-[var(--accent-blue)]" />
              {t('dp_title')}
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[var(--accent-blue)]" /> 
              {t('dp_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 flex-1">
          {/* Left Column: Input & Masking */}
          <div className="flex flex-col gap-6">
             <div className="bg-[var(--surface-overlay)] p-6 rounded-2xl shadow-sm border border-[var(--border-subtle)]">
               <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[var(--text-muted)]" /> {t('raw_text')}
               </h2>
               <textarea 
                  className="w-full h-48 p-4 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-xl focus:ring-1 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] focus:outline-none text-[var(--text-primary)] resize-none font-serif text-sm transition-colors"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
               />
               <div className="mt-4 flex justify-end">
                  <button 
                    onClick={handleMask} disabled={loading || !inputText}
                    className="px-6 py-2.5 bg-[var(--accent-blue)] text-white font-bold rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" /> {t('ai_detect_mask')}
                  </button>
               </div>
             </div>

             {maskedResult && (
                <div className="bg-[#0f172a] p-6 rounded-2xl shadow-lg border border-[var(--border-strong)] text-slate-200">
                   <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                      <Check className="w-5 h-5 text-[var(--status-success-fg)]" /> {t('masking_completed')}
                   </h2>
                   <div className="space-y-4">
                      <div>
                         <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('vault_id')}</span>
                         <div className="font-mono text-cyan-400 text-sm bg-black/40 p-2 rounded mt-1 border border-slate-800">
                            {maskedResult.vaultId}
                         </div>
                      </div>
                      
                      <div className="bg-emerald-950/30 p-4 rounded-xl border border-[var(--status-success-bar)]">
                         <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-2">{t('safe_masked_output')}</span>
                         <p className="font-serif text-emerald-100 text-sm leading-relaxed whitespace-pre-wrap">
                            {maskedResult.maskedText}
                         </p>
                      </div>

                      <div className="pt-2">
                         <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">{t('entities_detected')}</span>
                         <div className="flex flex-wrap gap-2 text-xs">
                            {maskedResult.entities.map((ent: any, i: number) => (
                               <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono">
                                  {ent.type}
                               </span>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>

          {/* Right Column: De-anonymization Vault */}
          <div className="flex flex-col">
             <div className={`flex-1 p-6 rounded-2xl border transition-all duration-500 ${maskedResult ? 'bg-[var(--surface-overlay)] shadow-xl border-amber-900/50' : 'bg-[var(--surface-base)] border-[var(--border-subtle)] opacity-50 pointer-events-none'}`}>
                <h2 className="text-lg font-black text-rose-500 flex items-center gap-2 mb-2">
                   <AlertTriangle className="w-6 h-6 text-rose-600" /> {t('auth_deanonymization')}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6 border-b border-[var(--border-subtle)] pb-4">
                   {t('deanonymization_desc')}
                </p>

                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">{t('requester_iam_id')}</label>
                      <input 
                        type="text" 
                        value={unmaskUserId}
                        onChange={e => setUnmaskUserId(e.target.value)}
                        className="w-full p-2.5 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">{t('business_reason')}</label>
                      <input 
                        type="text" 
                        value={unmaskReason}
                        onChange={e => setUnmaskReason(e.target.value)}
                        className="w-full p-2.5 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                        placeholder={t('business_reason_placeholder')}
                      />
                   </div>
                   
                   <div className="pt-4 border-t border-[var(--border-subtle)]">
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">{t('tokenized_payload')}</label>
                      <textarea 
                        readOnly
                        value={maskedResult?.maskedText || ''}
                        className="w-full h-24 p-2 bg-[var(--surface-base)] border border-[var(--border-strong)] rounded-lg text-[var(--text-muted)] font-serif text-sm resize-none"
                      />
                   </div>

                   <button 
                      onClick={handleUnmask} disabled={loading || !maskedResult}
                      className="w-full px-6 py-3 bg-rose-600/20 text-rose-500 border border-rose-800/50 font-black rounded-lg hover:bg-rose-600/30 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <Key className="w-5 h-5" /> {t('execute_deanonymization')}
                   </button>

                   {unmaskedText && (
                      <div className="mt-6 bg-rose-950/30 p-4 rounded-xl border border-rose-900/50 animate-in fade-in zoom-in duration-300">
                         <span className="text-xs text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                            <Unlock className="w-3 h-3" /> {t('restored_payload')}
                         </span>
                         <p className="font-serif text-rose-100 text-sm leading-relaxed whitespace-pre-wrap">
                            {unmaskedText}
                         </p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
