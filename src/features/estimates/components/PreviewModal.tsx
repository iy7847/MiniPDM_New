import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Estimate, EstimateItem } from '../types';
import { toast } from '../../../shared/stores/useToastStore';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useSettingsStore } from '../../../shared/stores/useSettingsStore';
import { QuotationTemplate } from './QuotationTemplate';
import { CustomQuotationTemplate } from './CustomQuotationTemplate';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Partial<Estimate>;
  items: EstimateItem[];
  clientInfo: any;
}

export function PreviewModal({ isOpen, onClose, estimate, items, clientInfo }: PreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen && !companyInfo) {
      const fetchCompany = async () => {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
          setCompanyInfo(company);
          loadSettings(profile.company_id);
          loadCustomTemplates(profile.company_id);
        }
      };
      fetchCompany();
    }
  }, [user, isOpen, companyInfo, loadSettings, loadCustomTemplates]);

  useEffect(() => {
    if (isOpen && companyInfo && printRef.current && !pdfUrl && !isLoading) {
      // Allow a brief moment for React to finish rendering the offscreen template
      setTimeout(() => {
        generatePdf();
      }, 500);
    }
  }, [isOpen, companyInfo, pdfUrl, isLoading]);

  const generatePdf = async () => {
    if (!printRef.current) return;
    setIsLoading(true);
    
    try {
      const element = printRef.current;
      const opt = {
        margin:       0,
        filename:     `견적서_${clientInfo?.name || '고객'}_${estimate?.project_name || '프로젝트'}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
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

  if (!mounted) return null;

  const templateType = settings?.quotation_template_type || 'standard';
  const activeTemplate = templateType.startsWith('custom_') 
    ? customTemplates.find(t => t.id === templateType.replace('custom_', ''))
    : null;

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
              src={pdfUrl} 
              type="application/pdf"
              className="w-full h-full border-none"
              title="PDF 뷰어"
            />
          )}

          <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
            <div ref={printRef} className="bg-white text-black" style={{ width: '210mm' }}>
              {companyInfo && (
                activeTemplate ? (
                  <CustomQuotationTemplate
                    estimate={estimate as Estimate}
                    items={items}
                    clientInfo={clientInfo}
                    companyInfo={companyInfo}
                    template={activeTemplate}
                  />
                ) : (
                  <QuotationTemplate
                    estimate={estimate as Estimate}
                    items={items}
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
