import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Server, Settings, Share2, ShieldCheck, Database, FileText, Lock, List, PanelLeftClose, PanelLeft } from 'lucide-react';
import clsx from 'clsx';
import JobTree from '../components/JobTree/JobTree';

const navGroups = [
  {
    titleKey: 'trinity_core',
    items: [
      { id: 'designer', icon: Activity, labelKey: 'designer' },
      { id: 'console', icon: Server, labelKey: 'console' },
      { id: 'admin', icon: Settings, labelKey: 'admin' },
    ]
  },
  {
    titleKey: 'modules',
    items: [
      { id: 'metaman', icon: Share2, labelKey: 'metaman' },
      { id: 'quality', icon: ShieldCheck, labelKey: 'dq' },
      { id: 'mdm', icon: Database, labelKey: 'mdm' },
      { id: 'stream', icon: Activity, labelKey: 'stream' },
      { id: 'unstructured', icon: FileText, labelKey: 'unstructured' },
    ]
  },
  {
    titleKey: 'security_governance',
    items: [
      { id: 'iam', icon: Lock, labelKey: 'iam' },
      { id: 'audit', icon: List, labelKey: 'audit' },
      { id: 'dp', icon: ShieldCheck, labelKey: 'dp' },
    ]
  }
];

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: any) {
  const { t } = useTranslation();

  return (
    <aside className={clsx(
      "h-full glass-card border-r-0 border-y-0 flex flex-col transition-all duration-300 z-10 m-3 rounded-2xl overflow-hidden",
      collapsed ? "w-[64px]" : "w-[240px]"
    )}>
      {/* Collapse Toggle */}
      <div className="flex items-center justify-end p-3 border-b border-white/5">
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide flex flex-col">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="mb-6 shrink-0">
            {!collapsed && (
              <div className="px-5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {t(group.titleKey)}
              </div>
            )}
            <div className="flex flex-col gap-1 px-3">
              {group.items.map(item => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold whitespace-nowrap group relative overflow-hidden",
                      active 
                        ? "bg-blue-600/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? t(item.labelKey) : undefined}
                  >
                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />}
                    <Icon className={clsx("w-5 h-5 shrink-0 transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Job Tree Section */}
        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col">
            <JobTree selectedJobId="3" onSelectJob={(id: string) => {
               if (id === '3') setActiveTab('designer');
            }} />
          </div>
        )}
      </div>
    </aside>
  );
}
