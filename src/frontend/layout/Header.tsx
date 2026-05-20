import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe, Bell, ChevronDown } from 'lucide-react';

export default function Header() {
  const { t, i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh-TW' : 'en';
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('dsystem-theme', newTheme);
  };

  const [workspace, setWorkspace] = useState('Development');

  return (
    <header className="h-[64px] w-full glass-card border-x-0 border-t-0 flex items-center justify-between px-6 shrink-0 transition-colors z-20 m-3 mx-auto w-[calc(100%-1.5rem)] rounded-2xl">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span className="font-extrabold text-[var(--text-primary)] text-xl tracking-tight hidden sm:block">
            DSystem <span className="text-blue-500 uppercase text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 ml-1">AI-ETL</span>
          </span>
        </div>

        <div className="w-px h-6 bg-white/5 mx-1"></div>

        {/* Workspace / Environment Switcher */}
        <div className="relative group cursor-pointer">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${workspace === 'Development' ? 'bg-emerald-500' : workspace === 'Staging' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
            <span className="text-sm font-bold text-slate-200">{t(workspace.toLowerCase())}</span>
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          {/* Dropdown */}
          <div className="absolute top-[calc(100%+8px)] left-0 w-52 glass-card rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all z-50 p-2 border-white/10 backdrop-blur-3xl">
             <div className="space-y-1">
               <button onClick={() => setWorkspace('Development')} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 transition-colors">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div> {t('development')}
               </button>
               <button onClick={() => setWorkspace('Staging')} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 transition-colors">
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div> {t('staging')}
               </button>
               <button onClick={() => setWorkspace('Production')} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 transition-colors">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div> {t('production')}
               </button>
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Language Toggle */}
        <button onClick={toggleLanguage} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-sm font-bold bg-white/5 px-3 py-2 rounded-xl border border-white/5" title={t('theme')}>
          <Globe className="w-4 h-4" />
          {t(i18n.language === 'en' ? 'en' : 'zh')}
        </button>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5">
          <Sun className="w-5 h-5 hidden dark:block" />
          <Moon className="w-5 h-5 block dark:hidden" />
        </button>

        <div className="w-px h-6 bg-white/5 mx-1"></div>

        {/* Notification Bell */}
        <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-[3px] border-[#0f172a]"></span>
        </button>

        <div className="w-px h-6 bg-white/5 mx-1"></div>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-xs font-bold text-white leading-none">Admin Root</span>
            <span className="text-[10px] font-semibold text-slate-400 leading-tight">Master Admin</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/50 to-purple-600/50 border border-white/10 flex items-center justify-center text-white cursor-pointer shadow-lg group-hover:scale-105 transition-transform text-sm font-black p-0.5">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              AD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function defaultTranslationHook() {
  const { t, i18n } = useTranslation();
  return { t, i18n };
}
