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
    <div className={`inline-flex items-center bg-bg-surface p-1 rounded-lg border border-border-default ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              isActive
                ? 'bg-bg-elevated text-text-primary shadow-sm border border-border-strong'
                : 'text-text-secondary hover:text-text-primary border border-transparent'
            }`}
          >
            {tab.icon && <span className="opacity-80">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
