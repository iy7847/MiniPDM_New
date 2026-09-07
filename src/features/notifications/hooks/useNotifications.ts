import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { useNotificationStore } from '@/shared/stores/useNotificationStore';

export function useNotifications() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const {
    notifications,
    readIds,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // 1. 사용자 company_id 조회
  useEffect(() => {
    if (!user?.id) return;
    const fetchCompany = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    fetchCompany();
  }, [user]);

  // 2. 알림 데이터 조회 및 60초 폴링
  useEffect(() => {
    if (!companyId) return;
    fetchNotifications(companyId);

    const interval = setInterval(() => {
      fetchNotifications(companyId);
    }, 60000);

    return () => clearInterval(interval);
  }, [companyId, fetchNotifications]);

  return {
    notifications,
    readIds,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    reloadNotifications: () => companyId && fetchNotifications(companyId),
  };
}
