import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../shared/stores/useAppStore';
import { BaseInput } from '../../design-system';
import { Search } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, closeSearch, toggleSearch } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch, closeSearch, isSearchOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={closeSearch}
    >
      <div 
        className="w-full max-w-2xl bg-bg-surface border border-border-default rounded-xl shadow-2xl p-4 flex flex-col gap-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <BaseInput
            ref={inputRef}
            placeholder="검색어를 입력하세요... (도면, 프로젝트명, 파트명 등)"
            className="w-full pl-12 py-3 text-lg bg-bg-base border-border-default text-text-primary placeholder:text-text-secondary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
        <div className="text-sm text-text-secondary px-2 flex justify-between">
          <span>최근 검색 기록이 없습니다.</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border-default text-xs">ESC</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
};
