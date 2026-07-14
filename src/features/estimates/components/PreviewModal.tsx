import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Send } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { QuotationTemplate } from './QuotationTemplate';
import type { Estimate, EstimateItem } from '../types';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Partial<Estimate>;
  items: EstimateItem[];
  clientInfo: any;
}

export function PreviewModal({ isOpen, onClose, estimate, items, clientInfo }: PreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `견적서_${clientInfo?.name || '고객'}_${estimate?.project_name || '프로젝트'}`,
  });

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
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
        }
      };
      fetchCompany();
    }
  }, [user, isOpen, companyInfo]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-bold text-text-primary">견적서 미리보기 및 출력</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex items-center gap-2" onClick={handlePrint}>
              <Printer size={16} />
              PDF 인쇄
            </Button>
            <Button variant="primary" className="flex items-center gap-2">
              <Send size={16} />
              견적서 전송
            </Button>
            <button onClick={onClose} className="p-1 ml-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-bg-base p-8 flex justify-center">
          <div className="shadow-2xl bg-white" style={{ minWidth: '210mm' }}>
            <QuotationTemplate
              ref={printRef}
              estimate={estimate as Estimate}
              items={items}
              clientInfo={clientInfo}
              companyInfo={companyInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
