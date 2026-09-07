import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import type { UserPermissions } from '@/shared/types/auth';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_view_estimates: false,
  can_write_estimates: false,
  can_delete_estimates: false,
  can_view_margins: false,
  can_view_orders: false,
  can_manage_production: false,
  can_manage_clients: false,
  can_manage_materials: false,
  can_view_analytics: false,
  can_manage_settings: false,
};

const ALL_PERMISSIONS: UserPermissions = {
  can_view_estimates: true,
  can_write_estimates: true,
  can_delete_estimates: true,
  can_view_margins: true,
  can_view_orders: true,
  can_manage_production: true,
  can_manage_clients: true,
  can_manage_materials: true,
  can_view_analytics: true,
  can_manage_settings: true,
};

export function usePermissions() {
  const { profile, group, loading, refetchProfile } = useAuth();

  const role = profile?.role || 'member';
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'owner';
  const isManager = isAdmin || role === 'manager';

  const permissions: UserPermissions = useMemo(() => {
    // 1. 최고 관리자 및 관리자는 모든 권한 허용
    if (isAdmin) {
      return ALL_PERMISSIONS;
    }

    // 2. 소속 그룹(User Group)의 권한 템플릿 로드
    const groupPerms = group?.permissions || {};

    // 3. 사용자 개별 권한 로드
    const userPerms = profile?.permissions || {};

    // 4. 우선순위: 개별 권한 > 그룹 권한 > 기본값(false)
    const resolved: UserPermissions = { ...DEFAULT_PERMISSIONS };
    const keys = Object.keys(DEFAULT_PERMISSIONS) as (keyof UserPermissions)[];

    for (const key of keys) {
      if (typeof userPerms[key] === 'boolean') {
        resolved[key] = userPerms[key];
      } else if (typeof groupPerms[key] === 'boolean') {
        resolved[key] = groupPerms[key];
      }
    }

    return resolved;
  }, [isAdmin, group, profile]);

  const hasPermission = (key: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    return Boolean(permissions[key]);
  };

  return {
    hasPermission,
    permissions,
    isAdmin,
    isManager,
    role,
    companyId: profile?.company_id || null,
    profile,
    loading,
    refetchPermissions: refetchProfile,
  };
}
