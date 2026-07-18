import React from 'react';
import { createHashRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { SignupPage } from '../features/auth/SignupPage';
import { AppShell } from '../layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { EstimatesPage } from '../features/estimates/EstimatesPage';
import { EstimateDetailPage } from '../features/estimates/EstimateDetailPage';
import { MaterialsPage } from '../features/materials/MaterialsPage';
import { WorkTrackingPage } from '../features/production/WorkTrackingPage';
import { OutsourcePage } from '../features/outsource/OutsourcePage';
import { SharedOrderPage } from '../features/outsource/SharedOrderPage';
import { ClientsPage } from '../features/clients/ClientsPage';
import { ClientDetailPage } from '../features/clients/ClientDetailPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { ShippingPage } from '../features/shipping/ShippingPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';

import { PrintEstimatePage } from '../features/estimates/PrintEstimatePage';

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
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { supabase } = await import('@/shared/services/supabase');
        const { data, error } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        if (data) {
          setCompanyId(data.company_id);
        }
        setProfileLoading(false);
      };
      fetchProfile();
    } else {
      setProfileLoading(false);
    }
  }, [user]);

  if (loading || profileLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D1117]">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle onboarding redirect
  if (!companyId && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (companyId && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }
  
  // 파트너(외주/고객사) 역할인지 확인
  const role = user.user_metadata?.role;
  
  if (rejectPartner && role === 'partner') {
    return <Navigate to="/shared/orders" replace />;
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
            element: <EstimatesPage />,
          },
          {
            path: ':id',
            element: <EstimateDetailPage />,
          }
        ]
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'production',
        element: <WorkTrackingPage />,
      },
      {
        path: 'shipping',
        element: <ShippingPage />,
      },
      {
        path: 'materials',
        element: <MaterialsPage />,
      },
      {
        path: 'outsource',
        element: <OutsourcePage />,
      },
      {
        path: 'clients',
        children: [
          {
            index: true,
            element: <ClientsPage />,
          },
          {
            path: ':id',
            element: <ClientDetailPage />,
          }
        ]
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
