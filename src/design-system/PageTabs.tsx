import React from 'react';

export interface TabItem {
  id: string;
  label: string;
}

export interface PageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  rightContent?: React.ReactNode;
}

export const PageTabs: React.FC<PageTabsProps> = ({ tabs, activeTab, onChange, rightContent }) => {
  return (
    <div className="flex items-center justify-between border-b border-border-default mb-4">
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {rightContent && (
        <div className="flex items-center">
          {rightContent}
        </div>
      )}
    </div>
  );
};
