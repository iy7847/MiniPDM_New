import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../shared/services/supabase';
import { useAuth } from '../../app/providers/AuthProvider';
import { useSettingsStore } from '../../shared/stores/useSettingsStore';
import { QuotationTemplate } from './components/QuotationTemplate';
import { CustomQuotationTemplate } from './components/CustomQuotationTemplate';
import type { Estimate, EstimateItem } from './types';

export function PrintEstimatePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { settings, customTemplates, loadSettings, loadCustomTemplates } = useSettingsStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      
      try {
        // 1. Fetch Profile & Company
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
          setCompanyInfo(company);
          loadSettings(profile.company_id);
          loadCustomTemplates(profile.company_id);
        }

        // 2. Fetch Estimate
        const { data: estData } = await supabase.from('estimates').select('*').eq('id', id).single();
        if (estData) {
          setEstimate(estData as Estimate);
          
          // 3. Fetch Items
          const { data: itemsData } = await supabase.from('estimate_items').select('*').eq('estimate_id', id).order('sort_order', { ascending: true });
          if (itemsData) setItems(itemsData as EstimateItem[]);
          
          // 4. Fetch Client
          if (estData.client_id) {
            const { data: clientData } = await supabase.from('clients').select('*').eq('id', estData.client_id).single();
            setClientInfo(clientData);
          }
        }
      } catch (err) {
        console.error('Error fetching data for print:', err);
      } finally {
        setLoading(false);
        // Electron Main Process에게 렌더링 완료됨을 알리기 위해 title 변경
        setTimeout(() => {
          document.title = 'PRINT_READY';
        }, 1000); // 이미지 렌더링 등 약간의 유예 시간 부여
      }
    };
    
    fetchData();
  }, [id, user, loadSettings, loadCustomTemplates]);

  if (loading || !estimate) {
    return <div className="p-8 text-center bg-white" id="print-loading">PDF 생성 준비 중...</div>;
  }

  const templateType = settings?.quotation_template_type || 'standard';
  const activeTemplate = templateType.startsWith('custom_') 
    ? customTemplates.find(t => t.id === templateType.replace('custom_', ''))
    : null;

  return (
    <div className="bg-white min-h-screen flex items-start justify-center print-ready-container" id="print-ready">
      {activeTemplate ? (
        <CustomQuotationTemplate
          estimate={estimate}
          items={items}
          clientInfo={clientInfo}
          companyInfo={companyInfo}
          template={activeTemplate}
        />
      ) : (
        <QuotationTemplate
          estimate={estimate}
          items={items}
          clientInfo={clientInfo}
          companyInfo={companyInfo}
        />
      )}
    </div>
  );
}
