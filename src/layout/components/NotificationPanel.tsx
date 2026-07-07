import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../shared/stores/useAppStore';
import { Bell, X, AlertTriangle } from 'lucide-react';

export const NotificationPanel: React.FC = () => {
  const { isNotificationOpen, closeNotification } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationOpen) {
        closeNotification();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isNotificationOpen, closeNotification]);

  if (!isNotificationOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={closeNotification} />
      <div 
        ref={panelRef}
        className="fixed top-0 right-0 z-50 w-80 h-full bg-bg-surface border-l border-border-default shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-500" />
            알림
          </h2>
          <button 
            onClick={closeNotification}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="p-3 bg-bg-elevated rounded-lg border border-border-default flex items-start gap-3 hover:border-brand-500/50 transition-colors cursor-pointer">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">납기 임박 알림</p>
              <p className="text-xs text-text-secondary mt-1">프로젝트 'PRJ-2023-110' (삼성전자) 납기가 2일 남았습니다.</p>
              <p className="text-[10px] text-text-secondary mt-2">10분 전</p>
            </div>
          </div>
          
          <div className="p-3 bg-bg-elevated rounded-lg border border-border-default flex items-start gap-3 hover:border-brand-500/50 transition-colors cursor-pointer">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">생산 지연 경고</p>
              <p className="text-xs text-text-secondary mt-1">프로젝트 'PRJ-2023-112' 가공 공정이 지연되고 있습니다.</p>
              <p className="text-[10px] text-text-secondary mt-2">1시간 전</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
