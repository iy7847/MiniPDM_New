import { create } from 'zustand';
import { supabase } from '@/shared/services/supabase';
import type { UserGroup } from '@/shared/types/auth';

interface GroupManagementState {
  groups: UserGroup[];
  isLoading: boolean;
  error: string | null;
  fetchGroups: (companyId: string) => Promise<void>;
  createGroup: (companyId: string, group: Omit<UserGroup, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Omit<UserGroup, 'id' | 'company_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

export const useGroupManagement = create<GroupManagementState>((set, get) => ({
  groups: [],
  isLoading: false,
  error: null,

  fetchGroups: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ groups: data as UserGroup[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createGroup: async (companyId: string, group) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .insert([{ ...group, company_id: companyId }])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        groups: [data as UserGroup, ...state.groups],
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateGroup: async (groupId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        groups: state.groups.map(g => g.id === groupId ? (data as UserGroup) : g),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      set(state => ({
        groups: state.groups.filter(g => g.id !== groupId),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
