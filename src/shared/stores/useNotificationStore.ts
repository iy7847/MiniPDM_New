import { create } from 'zustand';
import { notificationService, type AppNotification } from '@/features/notifications/services/notificationService';

const STORAGE_KEY = 'minipdm_read_notifications';

interface NotificationState {
  notifications: AppNotification[];
  readIds: string[];
  isLoading: boolean;
  unreadCount: number;
  fetchNotifications: (companyId: string) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const getInitialReadIds = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: getInitialReadIds(),
  isLoading: false,
  unreadCount: 0,

  fetchNotifications: async (companyId: string) => {
    try {
      set({ isLoading: true });
      const list = await notificationService.fetchNotifications(companyId);
      const { readIds } = get();
      const unreadCount = list.filter((n) => !readIds.includes(n.id)).length;
      set({ notifications: list, unreadCount, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch notifications in store:', err);
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    const { readIds, notifications } = get();
    if (!readIds.includes(id)) {
      const nextReadIds = [...readIds, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReadIds));
      } catch (err) {
        console.error('Failed to save read ids:', err);
      }
      const unreadCount = notifications.filter((n) => !nextReadIds.includes(n.id)).length;
      set({ readIds: nextReadIds, unreadCount });
    }
  },

  markAllAsRead: () => {
    const { notifications, readIds } = get();
    const allIds = notifications.map((n) => n.id);
    const nextReadIds = Array.from(new Set([...readIds, ...allIds]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReadIds));
    } catch (err) {
      console.error('Failed to save all read ids:', err);
    }
    set({ readIds: nextReadIds, unreadCount: 0 });
  },
}));
