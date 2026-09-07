import React from 'react';
import {
  X,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowRight,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/shared/stores/useNotificationStore';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationOpen, closeNotification } = useAppStore();
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const readIds = useNotificationStore((s) => s.readIds);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  if (!isNotificationOpen) return null;

  const handleItemClick = (id: string, linkPath: string) => {
    markAsRead(id);
    navigate(linkPath);
    closeNotification();
  };

  return (
    <>
      {/* 배경 블러 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeNotification}
      />

      {/* 우측 슬라이드 인 드로어 */}
      <div className="fixed inset-y-0 right-0 z-50 w-88 sm:w-96 bg-bg-surface border-l border-border-default shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-elevated/40">
          <div className="flex items-center gap-2.5 font-bold text-lg text-text-primary">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <Bell size={20} />
            </div>
            <span>알림 센터</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-danger/20 text-danger border border-danger/30 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={closeNotification}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="닫기 (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 툴바 (최근 알림 & 모두 읽음 처리) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default/60 bg-bg-base/50 text-xs font-mono">
          <span className="font-semibold text-text-secondary uppercase tracking-wider">
            실시간 업무 피드 ({notifications.length})
          </span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium hover:underline transition-all"
            >
              <CheckCheck size={14} />
              <span>모두 읽음 처리</span>
            </button>
          )}
        </div>

        {/* 알림 피드 리스트 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {isLoading && notifications.length === 0 ? (
            <div className="py-20 text-center text-text-secondary text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-3"></div>
              <span>실시간 업무 현황을 불러오는 중...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-24 text-center text-text-secondary">
              <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 border border-border-default">
                <Sparkles className="text-brand-400 w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-text-primary mb-1">
                새로운 알림이 없습니다
              </h4>
              <p className="text-xs text-text-muted">
                현재 지연되거나 마감이 임박한 일정이 없습니다.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = readIds.includes(notif.id);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif.id, notif.linkPath)}
                  className={`p-3.5 rounded-xl border flex gap-3.5 transition-all cursor-pointer group relative ${
                    isRead
                      ? 'bg-bg-base/60 border-border-default/40 opacity-70 hover:opacity-100 hover:border-border-default'
                      : 'bg-bg-elevated border-border-default hover:border-brand-500/50 shadow-sm'
                  }`}
                >
                  {/* 미확인 표시 점 */}
                  {!isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-400"></span>
                  )}

                  {/* 아이콘 */}
                  <div className="shrink-0 mt-0.5">
                    {notif.type === 'danger' && (
                      <div className="p-2 rounded-lg bg-danger/10 text-danger border border-danger/20">
                        <AlertTriangle size={18} />
                      </div>
                    )}
                    {notif.type === 'warning' && (
                      <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                        <Clock size={18} />
                      </div>
                    )}
                    {notif.type === 'info' && (
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Package size={18} />
                      </div>
                    )}
                    {notif.type === 'success' && (
                      <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>

                  {/* 텍스트 내용 */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className={`text-sm font-bold truncate group-hover:text-brand-300 transition-colors ${
                          notif.type === 'danger'
                            ? 'text-danger'
                            : notif.type === 'warning'
                            ? 'text-warning'
                            : 'text-text-primary'
                        }`}
                      >
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed break-words line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border-default/40 text-[11px] text-text-muted font-mono">
                      <span>{notif.time}</span>
                      <span className="flex items-center gap-0.5 text-text-secondary group-hover:text-brand-400 transition-colors">
                        <span>상세보기</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 풋터 */}
        <div className="p-4 border-t border-border-default bg-bg-elevated/40 text-center">
          <p className="text-xs text-text-muted font-mono">
            알림 항목을 클릭하면 해당 업무 화면으로 자동 이동합니다.
          </p>
        </div>
      </div>
    </>
  );
};
