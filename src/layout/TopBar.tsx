import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { BaseInput } from '../design-system';
import { useAppStore } from '../shared/stores/useAppStore';

export const TopBar: React.FC = () => {
  const { toggleSearch, toggleNotification } = useAppStore();

  return (
    <header className="h-16 bg-bg-surface border-b border-border-default flex items-center justify-between px-6 shrink-0 transition-colors">
      <div className="flex-1 max-w-md relative" onClick={toggleSearch}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <BaseInput 
          placeholder="검색어를 입력하세요 (Cmd+K)" 
          className="w-full pl-10 bg-bg-base border-border-default text-sm cursor-pointer"
          readOnly
        />
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleNotification}
          className="relative p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-bg-elevated transition-colors"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-surface"></span>
        </button>
        
        <div className="flex items-center gap-2 cursor-pointer hover:bg-bg-elevated p-1.5 rounded-full transition-colors pr-3">
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center border border-border-default">
            <User size={18} className="text-text-secondary" />
          </div>
          <span className="text-sm font-medium text-text-primary">관리자</span>
        </div>
      </div>
    </header>
  );
};
