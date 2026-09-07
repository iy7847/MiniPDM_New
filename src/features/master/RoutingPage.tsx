import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { ProcessRoutingTab } from '../settings/tabs/ProcessRoutingTab';
import { PageHeader } from '@/design-system/PageHeader';
import { Route } from 'lucide-react';

export function RoutingPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
        }
      }
    }
    fetchUserData();
  }, [user]);

  if (!companyId) return null;

  return (
    <div className="h-full flex flex-col bg-bg-base relative text-text-primary w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-bg-base/80 border-b border-border-default px-4 py-4 md:px-8">
        <PageHeader
          icon={Route}
          title="공정 / 라우팅 관리"
          description="부품 가공의 표준 공정 마스터와 생산 라우팅(Routing) 순서 템플릿을 설계합니다."
          className="mb-0"
        />
      </div>

      {/* Content - Full width */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="w-full">
          <ProcessRoutingTab companyId={companyId} />
        </div>
      </div>
    </div>
  );
}
