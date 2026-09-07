import React from 'react';
import { createHashRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { UserPermissions } from '@/shared/types/auth';
import { toast } from '@/shared/stores/useToastStore';
import { AppShell } from '../layout/AppShell';
import { useLicense } from '@/shared/hooks/useLicense';

import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';

// 🚀 첫 진입(로그인/대시보드)은 정적 임포트로 0ms 즉시 기동, 기타 내부 화면은 코드 분할(Code Splitting) 적용
const PageLoadingFallback: React.FC = () => (
  <div className="flex h-full w-full min-h-[300px] items-center justify-center animate-in fade-in duration-300">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      <span className="text-xs text-text-secondary font-medium tracking-wide">화면을 불러오는 중...</span>
    </div>
  </div>
);

const Lazy = (factory: () => Promise<{ default: React.ComponentType<any> }>) => {
  const Component = React.lazy(factory);
  return (props: any) => (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Component {...props} />
    </React.Suspense>
  );
};

const SignupPage = Lazy(() => import('../features/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ResetPasswordPage = Lazy(() => import('../features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const EstimatesPage = Lazy(() => import('../features/estimates/EstimatesPage').then(m => ({ default: m.EstimatesPage })));
const EstimateDetailPage = Lazy(() => import('../features/estimates/EstimateDetailPage').then(m => ({ default: m.EstimateDetailPage })));
const MaterialsPage = Lazy(() => import('../features/materials/MaterialsPage').then(m => ({ default: m.MaterialsPage })));
const ProductionListPage = Lazy(() => import('../features/production/pages/ProductionListPage').then(m => ({ default: m.ProductionListPage })));
const OutsourcePage = Lazy(() => import('../features/outsource/OutsourcePage').then(m => ({ default: m.OutsourcePage })));
const SharedOrderPage = Lazy(() => import('../features/outsource/SharedOrderPage').then(m => ({ default: m.SharedOrderPage })));
const ClientsPage = Lazy(() => import('../features/clients/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = Lazy(() => import('../features/clients/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })));
const SettingsPage = Lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const OrdersPage = Lazy(() => import('../features/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = Lazy(() => import('../features/orders/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const ShippingPage = Lazy(() => import('../features/shipping/ShippingPage').then(m => ({ default: m.ShippingPage })));
const AnalyticsPage = Lazy(() => import('../features/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const OnboardingPage = Lazy(() => import('../features/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const ScannerPage = Lazy(() => import('../features/scanner/ScannerPage').then(m => ({ default: m.ScannerPage })));
const RoutingPage = Lazy(() => import('../features/master/RoutingPage').then(m => ({ default: m.RoutingPage })));
const MasterLicensePage = Lazy(() => import('../features/master/pages/MasterLicensePage').then(m => ({ default: m.MasterLicensePage })));
const PrintEstimatePage = Lazy(() => import('../features/estimates/PrintEstimatePage').then(m => ({ default: m.PrintEstimatePage })));

// 빈 페이지들을 위한 임시 컴포넌트
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full text-text-secondary animate-in fade-in">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p>준비 중인 페이지입니다.</p>
    </div>
  </div>
);

const AuthGuard = ({ children, rejectPartner = false }: { children: React.ReactNode, rejectPartner?: boolean }) => {
  const { user, profile, loading, isProfileLoaded } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D1117]">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 🚀 프로필 조회가 완전히 완료된 시점에만 온보딩 리다이렉트 판정 (초기 2초 튕김/깜빡임 방지)
  if (isProfileLoaded) {
    const companyId = profile?.company_id;

    // Handle onboarding redirect
    if (!companyId && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    
    if (companyId && location.pathname === '/onboarding') {
      return <Navigate to="/" replace />;
    }
  }

  // 파트너(외주/고객사) 역할인지 확인
  const role = user.user_metadata?.role;
  
  if (rejectPartner && role === 'partner') {
    return <Navigate to="/shared/orders" replace />;
  }

  return <>{children}</>;
};

// 권한 가드 컴포넌트
const PermissionGuard = ({
  children,
  permission,
  adminOnly = false,
}: {
  children: React.ReactNode;
  permission?: keyof UserPermissions;
  adminOnly?: boolean;
}) => {
  const { hasPermission, isAdmin, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    toast.error('해당 페이지는 관리자만 접근할 수 있습니다.');
    return <Navigate to="/" replace />;
  }

  if (permission && !hasPermission(permission)) {
    toast.error('해당 메뉴에 접근할 수 있는 권한이 없습니다.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const MasterGuard = ({ children }: { children: React.ReactNode }) => {
  const { isMasterAdmin, loading } = useLicense();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isMasterAdmin) {
    toast.error('KEP 마스터 관리자만 접근할 수 있는 메뉴입니다.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const router = createHashRouter([
  {
    path: '/print/estimate/:id',
    element: (
      <AuthGuard>
        <PrintEstimatePage />
      </AuthGuard>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <AuthGuard>
        <OnboardingPage />
      </AuthGuard>
    ),
  },
  {
    path: '/shared/order/:id',
    element: (
      <AuthGuard>
        <SharedOrderPage />
      </AuthGuard>
    ),
  },
  {
    path: '/shared/orders',
    element: (
      <AuthGuard>
        <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] p-6">
          <PlaceholderPage title="파트너 전용 수주 목록 (준비 중)" />
        </div>
      </AuthGuard>
    ),
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard rejectPartner={true}>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'estimates',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard permission="can_view_estimates">
                <EstimatesPage />
              </PermissionGuard>
            ),
          },
          {
            path: ':id',
            element: (
              <PermissionGuard permission="can_view_estimates">
                <EstimateDetailPage />
              </PermissionGuard>
            ),
          }
        ]
      },
      {
        path: 'orders',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard permission="can_view_orders">
                <OrdersPage />
              </PermissionGuard>
            ),
          },
          {
            path: ':id',
            element: (
              <PermissionGuard permission="can_view_orders">
                <OrderDetailPage />
              </PermissionGuard>
            ),
          }
        ]
      },
      {
        path: 'production',
        children: [
          {
            index: true,
            element: <Navigate to="list" replace />,
          },
          {
            path: 'list',
            element: (
              <PermissionGuard permission="can_manage_production">
                <ProductionListPage />
              </PermissionGuard>
            ),
          }
        ]
      },
      {
        path: 'scanner',
        element: (
          <PermissionGuard permission="can_manage_production">
            <ScannerPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'shipping',
        element: (
          <PermissionGuard permission="can_view_orders">
            <ShippingPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'materials',
        element: (
          <PermissionGuard permission="can_manage_materials">
            <MaterialsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'master/routing',
        element: (
          <PermissionGuard permission="can_manage_production">
            <RoutingPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'outsource',
        element: (
          <PermissionGuard permission="can_manage_production">
            <OutsourcePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'clients',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard permission="can_manage_clients">
                <ClientsPage />
              </PermissionGuard>
            ),
          },
          {
            path: ':id',
            element: (
              <PermissionGuard permission="can_manage_clients">
                <ClientDetailPage />
              </PermissionGuard>
            ),
          }
        ]
      },
      {
        path: 'analytics',
        element: (
          <PermissionGuard permission="can_view_analytics">
            <AnalyticsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <PermissionGuard permission="can_manage_settings">
            <SettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'master/licenses',
        element: (
          <MasterGuard>
            <MasterLicensePage />
          </MasterGuard>
        ),
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
