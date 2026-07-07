import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`inline-flex bg-bg-elevated p-1.5 rounded-xl border border-border-default shadow-inner ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
              isActive
                ? 'bg-bg-overlay text-text-primary shadow-sm scale-[1.02] border border-border-strong ring-1 ring-brand-500/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay/50 border border-transparent'
            }`}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
