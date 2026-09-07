import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Estimate, EstimateItem } from '../types';
import { toast } from '../../../shared/stores/useToastStore';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useSettingsStore } from '../../../shared/stores/useSettingsStore';
import { QuotationTemplate } from './QuotationTemplate';
import { CustomQuotationTemplate } from './CustomQuotationTemplate';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Partial<Estimate>;
  items: EstimateItem[];
  clientInfo: any;
  showForeign?: boolean;
}

export function PreviewModal({ isOpen, onClose, estimate, items, clientInfo, showForeign }: PreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const { user } = useAuth();
  const { settings, customTemplates, loadSettings, loadCustomTemplates } = useSettingsStore();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => {
        setMounted(false);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
        setIsDataLoaded(false); // Reset on close
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen) {
      if (!companyInfo) {
        const fetchCompany = async () => {
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
          if (profile?.company_id) {
            const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
            setCompanyInfo(company);
            await Promise.all([
              loadSettings(profile.company_id),
              loadCustomTemplates(profile.company_id)
            ]);
            setIsDataLoaded(true);
          }
        };
        fetchCompany();
      } else {
        // 이미 companyInfo가 있다면 이전에 불러온 상태이므로 바로 완료 처리
        setIsDataLoaded(true);
      }
    }
  }, [user, isOpen, companyInfo, loadSettings, loadCustomTemplates]);

  const templateType = settings?.quotation_template_type || 'standard';
  const activeTemplate = templateType.startsWith('custom_') 
    ? customTemplates.find(t => t.id === templateType.replace('custom_', ''))
    : null;

  const generatePdf = async (isLandscapeMode: boolean) => {
    if (!printRef.current) return;
    setIsLoading(true);
    
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const opt = {
        margin:       0,
        filename:     `견적서_${clientInfo?.name || '고객'}_${estimate?.project_name || '프로젝트'}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, windowWidth: isLandscapeMode ? 1123 : 794 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: isLandscapeMode ? 'landscape' : 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(blobUrl);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // isDataLoaded가 true이고, activeTemplate도 확정되었을 때만 렌더링
    if (isOpen && isDataLoaded && printRef.current && !pdfUrl && !isLoading) {
      const isLandscapeMode = activeTemplate?.layout_json?.orientation === 'landscape';
      
      const timer = setTimeout(() => {
        generatePdf(isLandscapeMode);
      }, 800); // 렌더링 대기 시간을 조금 더 여유롭게 줌
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDataLoaded, pdfUrl, isLoading, activeTemplate]);

  if (!mounted) return null;

  const processedItems = showForeign && estimate?.base_exchange_rate && estimate.base_exchange_rate > 0 
    ? items.map(item => {
        const rate = estimate.base_exchange_rate!;
        const up = (item.unit_price || 0) / rate;
        const sp = (item.supply_price || 0) / rate;
        
        let newCustomCosts = { ...item.custom_costs };
        if (item.custom_costs) {
          for (const key in item.custom_costs) {
            newCustomCosts[key] = Math.ceil((item.custom_costs[key] / rate) * 100) / 100;
          }
        }

        return {
          ...item,
          unit_price: Math.ceil(up * 100) / 100,
          supply_price: Math.ceil(sp * 100) / 100,
          custom_costs: newCustomCosts
        };
      })
    : items;

  const processedEstimate = showForeign && estimate?.base_exchange_rate && estimate.base_exchange_rate > 0
    ? {
        ...estimate,
        total_amount: processedItems.reduce((sum, item) => sum + (item.supply_price || 0), 0)
      }
    : {
        ...estimate,
        currency: 'KRW'
      };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-text-primary">견적서 PDF 뷰어</h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-bg-base relative">
          {(!pdfUrl || isLoading) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-4"></div>
              <p className="text-text-secondary">고품질 PDF를 생성하는 중입니다...</p>
            </div>
          ) : (
            <embed 
              src={`${pdfUrl}#navpanes=0&view=FitH`} 
              type="application/pdf"
              className="w-full h-full border-none"
              title="PDF 뷰어"
            />
          )}

          <div className="absolute top-0 left-[-9999px] -z-50 opacity-0 pointer-events-none">
            <div ref={printRef} className="bg-white text-black" style={{ width: activeTemplate?.layout_json?.orientation === 'landscape' ? '1123px' : '794px' }}>
              {companyInfo && (
                activeTemplate ? (
                  <CustomQuotationTemplate
                    estimate={processedEstimate as Estimate}
                    items={processedItems as any}
                    clientInfo={clientInfo}
                    companyInfo={companyInfo}
                    template={activeTemplate}
                  />
                ) : (
                  <QuotationTemplate
                    estimate={processedEstimate as Estimate}
                    items={processedItems as any}
                    clientInfo={clientInfo}
                    companyInfo={companyInfo}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
