import { supabase } from '@/shared/services/supabase';
import type { SignInWithPasswordCredentials } from '@supabase/supabase-js';

export const authService = {
  login: async (credentials: SignInWithPasswordCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
