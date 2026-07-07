import { create } from 'zustand';
import { supabase } from '@/shared/services/supabase';
import type { User, UserPermissions } from '@/shared/types/auth';

interface UserManagementState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: (companyId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => Promise<void>;
  updateUserRole: (userId: string, role: string) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<void>;
}

export const useUserManagement = create<UserManagementState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      set({ users: data as User[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateUserPermissions: async (userId: string, permissions: Partial<UserPermissions>) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = get().users.find(u => u.id === userId);
      if (!currentUser) throw new Error('User not found in state');

      const updatedPermissions = {
        ...(currentUser.permissions || {}),
        ...permissions
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;

      set(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, permissions: updatedPermissions } : u),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateUserRole: async (userId: string, role: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      set(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, role } : u),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateUserProfile: async (userId: string, updates: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const allowedUpdates = {
        group_id: updates.group_id,
        join_date: updates.join_date,
        birth_date: updates.birth_date,
        phone: updates.phone,
        job_title: updates.job_title,
        name: updates.name,
      };

      const cleanUpdates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
      );

      const { error } = await supabase
        .from('profiles')
        .update(cleanUpdates)
        .eq('id', userId);

      if (error) throw error;

      set(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, ...cleanUpdates } : u),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
