import React from 'react';
import { X, Bell, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../shared/stores/useAppStore';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'warning',
    title: '납기 임박 (D-3)',
    message: '현대모비스 발주건 (ORD-2607-15) 납기일이 3일 남았습니다.',
    time: '2시간 전',
    isRead: false,
    icon: Clock
  },
  {
    id: 2,
    type: 'danger',
    title: '금일 납기 (D-Day)',
    message: '기아자동차 발주건 (ORD-2607-12) 오늘 납품 예정입니다.',
    time: '4시간 전',
    isRead: false,
    icon: AlertTriangle
  },
  {
    id: 3,
    type: 'success',
    title: '생산 완료',
    message: '알루미늄 브라켓 세트 생산이 완료되었습니다.',
    time: '1일 전',
    isRead: true,
    icon: CheckCircle2
  }
];

export const NotificationDrawer: React.FC = () => {
  const { isNotificationOpen, closeNotification } = useAppStore();

  if (!isNotificationOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeNotification}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-80 bg-bg-surface border-l border-border-default shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-2 font-bold text-lg text-text-primary">
            <Bell size={20} className="text-brand-500" />
            <span>알림 센터</span>
          </div>
          <button 
            onClick={closeNotification}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">최근 알림</span>
            <button className="text-xs text-brand-500 hover:underline">모두 읽음 처리</button>
          </div>
          
          <div className="space-y-3">
            {MOCK_NOTIFICATIONS.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-3 rounded-lg border flex gap-3 transition-colors ${
                  notif.isRead 
                    ? 'bg-bg-base border-transparent opacity-70' 
                    : 'bg-bg-elevated border-border-default shadow-sm'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <notif.icon 
                    size={18} 
                    className={
                      notif.type === 'danger' ? 'text-danger' : 
                      notif.type === 'warning' ? 'text-warning' : 
                      'text-success'
                    } 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-text-primary truncate">{notif.title}</h4>
                    <span className="text-[10px] text-text-secondary shrink-0 ml-2">{notif.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-snug break-words">
                    {notif.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-border-default bg-bg-base text-center">
          <button className="text-sm text-text-secondary hover:text-text-primary font-medium transition-colors">
            이전 알림 더보기
          </button>
        </div>
      </div>
    </>
  );
};
