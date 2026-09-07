import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import type { ShipmentWithItems } from '../types';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { toast } from '@/shared/stores/useToastStore';

interface ShippingLabelPreviewProps {
  shipment: ShipmentWithItems;
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 4; // 2단 분할 시 한 페이지당 안전한 품목 수 (초과 시 자동 다중 페이지 분할)

// 대한민국 중소제조업체 표준 거래명세표 단일 섹션 (공급자용 / 공급받는자용)
const InvoiceSlipSection: React.FC<{
  type: 'supplier' | 'receiver';
  shipment: ShipmentWithItems;
  companyInfo: any;
  items: any[];
  pageIndex: number;
  totalPages: number;
}> = ({ type, shipment, companyInfo, items, pageIndex, totalPages }) => {
  const isSupplier = type === 'supplier';
  const badgeText = isSupplier ? '공급자 회수용' : '공급받는자 보관용';
  const themeColor = isSupplier ? '#b91c1c' : '#1d4ed8'; // Red-700 / Blue-700
  const badgeBg = isSupplier ? '#fef2f2' : '#eff6ff';
  const badgeBorder = isSupplier ? '#f87171' : '#60a5fa';
  
  // 전체 출하 수량
  const totalQty = shipment.shipment_items?.reduce((sum: number, si: any) => sum + Number(si.quantity || 0), 0) || 0;

  return (
    <div 
      style={{
        width: '100%',
        height: '495px',
        border: '1px solid #4b5563',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Pretendard, "Malgun Gothic", sans-serif',
        padding: '8px 12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. 상단 타이틀 영역 (테이블 3분할로 줄바꿈 원천 차단) */}
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #111827', paddingBottom: '4px', marginBottom: '6px' }}>
          <tbody>
            <tr>
              {/* 좌측 뱃지 */}
              <td style={{ width: '25%', verticalAlign: 'middle', textAlign: 'left' }}>
                <span 
                  style={{
                    display: 'inline-block',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: badgeBg,
                    color: themeColor,
                    border: `1px solid ${badgeBorder}`,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {badgeText}
                </span>
              </td>

              {/* 중앙 메인 타이틀 */}
              <td style={{ width: '50%', verticalAlign: 'middle', textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '4px', color: '#111827' }}>
                  거 래 명 세 표
                </span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: themeColor, marginLeft: '6px', whiteSpace: 'nowrap' }}>
                  ({isSupplier ? '공급자용' : '공급받는자용'})
                </span>
              </td>

              {/* 우측 일자 / 전표번호 / 페이지 */}
              <td style={{ width: '25%', verticalAlign: 'middle', textAlign: 'right', fontSize: '10px', fontFamily: 'monospace', lineHeight: '1.3', whiteSpace: 'nowrap' }}>
                <div><span style={{ color: '#6b7280' }}>일자:</span> <b>{new Date(shipment.shipped_at || shipment.created_at).toLocaleDateString('ko-KR')}</b></div>
                <div><span style={{ color: '#6b7280' }}>전표:</span> <b>{shipment.shipment_no}</b></div>
                {totalPages > 1 && (
                  <div style={{ color: '#4b5563' }}>(페이지: {pageIndex + 1} / {totalPages})</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. 공급받는 자 & 공급자 2단 테이블 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '10px' }}>
          <tbody>
            <tr>
              {/* 공급받는 자 */}
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #6b7280', fontSize: '10px', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr style={{ height: '22px' }}>
                      <th rowSpan={4} style={{ width: '20px', backgroundColor: '#f3f4f6', border: '1px solid #6b7280', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.2', color: '#374151', padding: '2px' }}>
                        공<br/>급<br/>받<br/>는<br/>자
                      </th>
                      <td style={{ width: '60px', backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        상호(법인)
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shipment.clients?.name || shipment.recipient_name || '고객사'}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        수령인
                      </td>
                      <td style={{ border: '1px solid #6b7280', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shipment.recipient_name || '-'}
                      </td>
                      <td style={{ width: '40px', backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        연락처
                      </td>
                      <td style={{ border: '1px solid #6b7280', padding: '2px 4px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shipment.recipient_contact || '-'}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        배송방법
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shipment.courier || '직접 배송'} {shipment.tracking_no ? `(송장: ${shipment.tracking_no})` : ''}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        납품주소
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={shipment.recipient_address || '-'}>
                        {shipment.recipient_address || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* 공급자 */}
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #6b7280', fontSize: '10px', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr style={{ height: '22px' }}>
                      <th rowSpan={4} style={{ width: '20px', backgroundColor: '#f3f4f6', border: '1px solid #6b7280', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.2', color: '#374151', padding: '2px' }}>
                        공<br/>급<br/>자
                      </th>
                      <td style={{ width: '60px', backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        등록번호
                      </td>
                      <td colSpan={2} style={{ border: '1px solid #6b7280', padding: '2px 4px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {companyInfo?.business_number || '123-45-67890'}
                      </td>
                      <td rowSpan={2} style={{ width: '42px', border: '1px solid #6b7280', textAlign: 'center', backgroundColor: '#f9fafb', padding: '2px', verticalAlign: 'middle' }}>
                        <div style={{ width: '32px', height: '32px', border: '1px dashed #ef4444', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '8px', fontWeight: 'bold' }}>
                          인
                        </div>
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        상호/대표
                      </td>
                      <td style={{ border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {companyInfo?.name || '(주)소복'}
                      </td>
                      <td style={{ border: '1px solid #6b7280', padding: '2px 4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {companyInfo?.ceo_name || '-'}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        사업장주소
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={companyInfo?.address || '-'}>
                        {companyInfo?.address || '-'}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ backgroundColor: '#f9fafb', border: '1px solid #6b7280', padding: '2px 4px', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        전화/팩스
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '2px 4px', fontFamily: 'monospace', fontSize: '9px', whiteSpace: 'nowrap' }}>
                        TEL: {companyInfo?.phone || '-'} / FAX: {companyInfo?.fax || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. 품목 명세 테이블 (table-layout: fixed 로 너비 완벽 고정) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #6b7280', fontSize: '10px', tableLayout: 'fixed', marginBottom: '4px' }}>
          <thead>
            <tr style={{ height: '24px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #6b7280', textAlign: 'center', fontWeight: 'bold', color: '#111827' }}>
              <th style={{ width: '28px', borderRight: '1px solid #6b7280' }}>No</th>
              <th style={{ width: '130px', borderRight: '1px solid #6b7280', textAlign: 'left', paddingLeft: '6px' }}>도면번호 (Part No)</th>
              <th style={{ width: '160px', borderRight: '1px solid #6b7280', textAlign: 'left', paddingLeft: '6px' }}>품명 (Description)</th>
              <th style={{ width: '90px', borderRight: '1px solid #6b7280' }}>규격 (Spec)</th>
              <th style={{ width: '50px', borderRight: '1px solid #6b7280' }}>수량</th>
              <th style={{ width: '40px', borderRight: '1px solid #6b7280' }}>단위</th>
              <th style={{ width: '90px', borderRight: '1px solid #6b7280' }}>수주번호</th>
              <th style={{ width: '70px' }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => {
              const item = items[idx];
              const oi = item?.order_items;
              const rowNo = pageIndex * ITEMS_PER_PAGE + idx + 1;

              return (
                <tr key={idx} style={{ height: '24px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <td style={{ borderRight: '1px solid #e5e7eb', color: '#6b7280', fontFamily: 'monospace', fontSize: '9px' }}>
                    {item ? rowNo : ''}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', textAlign: 'left', paddingLeft: '6px', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {oi?.part_no || (item ? '-' : '')}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', textAlign: 'left', paddingLeft: '6px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {oi?.part_name || ''}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', color: '#4b5563', fontFamily: 'monospace', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {oi?.spec || ''}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', fontWeight: 'bold', fontFamily: 'monospace', color: '#111827' }}>
                    {item ? Number(item.quantity).toLocaleString() : ''}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', color: '#6b7280', fontSize: '9px' }}>
                    {item ? 'EA' : ''}
                  </td>
                  <td style={{ borderRight: '1px solid #e5e7eb', color: '#4b5563', fontFamily: 'monospace', fontSize: '9px', whiteSpace: 'nowrap' }}>
                    {oi?.order_item_no ? oi.order_item_no.split('-').slice(0, 2).join('-') : (item ? shipment.shipment_no : '')}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item?.note || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ height: '24px', backgroundColor: '#f9fafb', borderTop: '1px solid #6b7280', textAlign: 'center', fontWeight: 'bold' }}>
              <td colSpan={4} style={{ borderRight: '1px solid #6b7280', textAlign: 'right', paddingRight: '10px', fontSize: '10px', color: '#374151' }}>
                합 계 (총 {shipment.shipment_items?.length || 0}개 품목)
              </td>
              <td style={{ borderRight: '1px solid #6b7280', fontFamily: 'monospace', fontSize: '11px', color: '#111827', fontWeight: '900' }}>
                {totalQty.toLocaleString()}
              </td>
              <td colSpan={3} style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '9px', color: '#6b7280' }}>
                {shipment.memo ? `메모: ${shipment.memo}` : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. 하단 인수확인 / 공급확인 서명란 (테이블 배치로 겹침 100% 차단) */}
      <div style={{ borderTop: '2px solid #111827', paddingTop: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              {/* 안내 문구 */}
              <td style={{ verticalAlign: 'middle', textAlign: 'left', fontSize: '9px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {isSupplier 
                  ? '※ 본 명세표는 납품 확인용입니다. 물품 수령 후 인수자 서명을 받아 보관하십시오.'
                  : '※ 물품 수령 즉시 규격 및 수량을 검수하여 주시기 바랍니다. (MiniPDM)'}
              </td>

              {/* 서명 / 확인란 */}
              <td style={{ verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937' }}>
                    {isSupplier ? '위 물품을 정히 영수(인수)함.' : '위 물품을 정히 공급(납품)함.'}
                  </span>

                  {isSupplier ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #6b7280', padding: '2px 8px', backgroundColor: '#ffffff' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#374151', marginRight: '6px' }}>인수자:</span>
                      <span style={{ display: 'inline-block', width: '90px', borderBottom: '1px dashed #9ca3af', textAlign: 'right', fontSize: '9px', color: '#9ca3af' }}>
                        (서명/인)
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #6b7280', padding: '2px 8px', backgroundColor: '#ffffff' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#374151', marginRight: '6px' }}>공급자:</span>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', marginRight: '6px' }}>
                        {companyInfo?.name || '(주)소복'}
                      </span>
                      <span style={{ border: '1px dashed #ef4444', color: '#ef4444', fontSize: '8px', padding: '0 4px', fontWeight: 'bold' }}>
                        (인)
                      </span>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ShippingLabelPreview: React.FC<ShippingLabelPreviewProps> = ({ shipment, isOpen, onClose }) => {
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      const fetchCompany = async () => {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
          setCompanyInfo(company);
        }
      };
      fetchCompany();
    }
  }, [isOpen, user]);

  // 품목을 4개씩 분할(Pagination)하여 다중 페이지 지원
  const pageChunks = useMemo(() => {
    const rawItems = shipment.shipment_items || [];
    if (rawItems.length === 0) return [[]];
    const chunks = [];
    for (let i = 0; i < rawItems.length; i += ITEMS_PER_PAGE) {
      chunks.push(rawItems.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [shipment.shipment_items]);

  useEffect(() => {
    if (isOpen && companyInfo && printRef.current && !pdfUrl && !isLoading) {
      const timer = setTimeout(() => {
        generatePdf();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, companyInfo, pdfUrl, isLoading]);

  const generatePdf = async () => {
    if (!printRef.current) return;
    setIsLoading(true);
    
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const opt = {
        margin:       [4, 4, 4, 4],
        filename:     `거래명세표_${shipment.shipment_no}.pdf`,
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

  if (!mounted || !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Printer size={20} className="text-brand-400" />
            거래명세표 인쇄 미리보기 (공급자 / 공급받는자 보관용 1장 출력)
            {pageChunks.length > 1 && (
              <span className="text-xs font-normal text-text-tertiary">
                (품목 {shipment.shipment_items?.length}건으로 총 {pageChunks.length}장 생성)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-bg-base relative flex items-center justify-center">
          {(!pdfUrl || isLoading) ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-4"></div>
              <p className="text-text-secondary text-sm">표준 2단 거래명세표 PDF를 생성 중입니다...</p>
            </div>
          ) : (
            <embed 
              src={`${pdfUrl}#navpanes=0&view=FitH`} 
              type="application/pdf"
              className="w-full h-full border-none"
              title="거래명세표 PDF 뷰어"
            />
          )}

          {/* Hidden template for html2pdf rendering */}
          <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
            <div ref={printRef}>
              {pageChunks.map((chunk, pIndex) => (
                <div 
                  key={pIndex}
                  style={{
                    width: '794px',
                    height: '1085px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    padding: '8mm 6mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pageBreakAfter: pIndex < pageChunks.length - 1 ? 'always' : 'auto'
                  }}
                >
                  {/* 1. 상단 섹션: 공급자 보관용 (회수용) */}
                  <InvoiceSlipSection 
                    type="supplier" 
                    shipment={shipment} 
                    companyInfo={companyInfo} 
                    items={chunk}
                    pageIndex={pIndex}
                    totalPages={pageChunks.length}
                  />

                  {/* 2. 중앙 절취선 (Perforation Line) */}
                  <div style={{ margin: '8px 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', borderBottom: '1px dashed #6b7280' }} />
                    <div style={{ position: 'absolute', backgroundColor: '#ffffff', padding: '0 12px', fontSize: '10px', fontFamily: 'monospace', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <span>✂</span>
                      <span>- - - - - - - - - - - - - - - - - - - - - - - - -</span>
                      <span style={{ fontWeight: 'bold', color: '#1f2937' }}>절 취 선 (Cut Line)</span>
                      <span>- - - - - - - - - - - - - - - - - - - - - - - - -</span>
                      <span>✂</span>
                    </div>
                  </div>

                  {/* 3. 하단 섹션: 공급받는자 보관용 (고객 전달용) */}
                  <InvoiceSlipSection 
                    type="receiver" 
                    shipment={shipment} 
                    companyInfo={companyInfo} 
                    items={chunk}
                    pageIndex={pIndex}
                    totalPages={pageChunks.length}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
