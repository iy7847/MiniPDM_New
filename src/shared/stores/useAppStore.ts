import { create } from 'zustand';

interface AppState {
  isSearchOpen: boolean;
  isNotificationOpen: boolean;
  toggleSearch: () => void;
  closeSearch: () => void;
  toggleNotification: () => void;
  closeNotification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSearchOpen: false,
  isNotificationOpen: false,

  toggleSearch: () =>
    set((state) => ({
      isSearchOpen: !state.isSearchOpen,
    })),

  closeSearch: () => set({ isSearchOpen: false }),

  toggleNotification: () =>
    set((state) => ({
      isNotificationOpen: !state.isNotificationOpen,
    })),

  closeNotification: () => set({ isNotificationOpen: false }),
}));
