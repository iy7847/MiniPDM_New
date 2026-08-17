import React, { useEffect, useState } from 'react';
import type { Estimate, EstimateItem } from '../types';
import { supabase } from '../../../shared/services/supabase';

interface QuotationTemplateProps {
  companyInfo: any;
  clientInfo: any;
  estimate: Estimate;
  items: EstimateItem[];
}

const formatPhoneNumber = (value: string) => {
  if (!value) return '';
  const num = value.replace(/[^0-9]/g, '');
  if (num.startsWith('02')) {
    if (num.length <= 2) return num;
    if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
    if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
    return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6)}`;
  } else {
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
    if (num.length === 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7)}`;
  }
};

const getLocalImagePath = (path: string | undefined | null) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  let normalizedPath = path.replace(/\\/g, '/');
  normalizedPath = normalizedPath.replace(/^file:\/\/\//i, '');
  
  if (import.meta.env.DEV) {
    return `/@fs/${normalizedPath}`;
  }
  return `file:///${normalizedPath}`;
};

export const QuotationTemplate = React.forwardRef<HTMLDivElement, QuotationTemplateProps>(({ companyInfo, clientInfo, estimate, items }, ref) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [sealSrc, setSealSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      if (companyInfo?.logo_path) {
        if (companyInfo.logo_path.startsWith('C:') || companyInfo.logo_path.startsWith('D:')) {
          setLogoSrc(getLocalImagePath(companyInfo.logo_path));
        } else {
          const { data } = supabase.storage.from('company_assets').getPublicUrl(companyInfo.logo_path);
          setLogoSrc(data.publicUrl);
        }
      }
      if (companyInfo?.seal_path) {
        if (companyInfo.seal_path.startsWith('C:') || companyInfo.seal_path.startsWith('D:')) {
          setSealSrc(getLocalImagePath(companyInfo.seal_path));
        } else {
          const { data } = supabase.storage.from('company_assets').getPublicUrl(companyInfo.seal_path);
          setSealSrc(data.publicUrl);
        }
      }
    };
    loadImages();
  }, [companyInfo]);

  const currency = estimate.currency || 'KRW';
  const isForeign = currency !== 'KRW';
  const fractionOpts = isForeign ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : { maximumFractionDigits: 0 };
  
  const symbol = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency;
  const totalAmount = estimate.total_amount || 0;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div ref={ref} className="w-[210mm] p-[15mm] bg-white text-black font-sans text-sm leading-snug mx-auto relative box-border overflow-hidden print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0 print:overflow-visible print:bg-white print:text-black">
      <div className="flex justify-between items-end mb-8">
        <div className="w-6/12">
          {logoSrc && <img src={logoSrc} alt="Logo" className="h-10 mb-2 object-contain" />}
          <h1 className="font-bold text-4xl text-brand-500 mb-4 tracking-widest print:text-blue-900">
            견 적 서
          </h1>
          <div className="text-sm space-y-1">
            <div className="flex border-b pb-1 mb-1 border-gray-300 w-fit print:border-gray-400">
              <span className="w-16 font-bold">수 신 :</span>
              <span className="text-lg font-bold">{clientInfo?.name || '귀하'}</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600 print:text-gray-600">참 조 :</span>
              <span>담당자 귀하</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600 print:text-gray-600">날 짜 :</span>
              <span>{today}</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600 print:text-gray-600">견적번호 :</span>
              <span>EST-{(estimate.id || '').substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="w-5/12 border border-gray-300 p-4 relative rounded-lg bg-gray-50 print:border-gray-300 print:bg-gray-50">
          <h3 className="text-xs font-bold text-gray-600 mb-2 border-b border-gray-300 pb-1 block print:text-gray-500 print:border-gray-300">공급자 (Seller)</h3>
          <div className="space-y-1 text-xs">
            <div className="flex">
              <span className="w-12 font-bold">상 호 :</span>
              <span className="font-bold text-base">{companyInfo?.name || '(주)회사명'}</span>
            </div>
            <div className="flex">
              <span className="w-12 font-bold">대 표 :</span>
              <span>{companyInfo?.ceo_name || '대표자'}</span>
            </div>
            <div className="flex">
              <span className="w-12 font-bold">주 소 :</span>
              <span className="flex-1 whitespace-pre-wrap">{companyInfo?.address || '주소'}</span>
            </div>
            <div className="flex">
              <span className="w-12 font-bold">전 화 :</span>
              <span>{formatPhoneNumber(companyInfo?.phone || '')}</span>
            </div>
            <div className="flex">
              <span className="w-12 font-bold">팩 스 :</span>
              <span>{formatPhoneNumber(companyInfo?.fax || '')}</span>
            </div>
            <div className="flex">
              <span className="w-12 font-bold">이메일 :</span>
              <span>{companyInfo?.email || 'email@example.com'}</span>
            </div>
          </div>

          {sealSrc && (
            <img
              src={sealSrc}
              alt="Seal"
              className="absolute top-8 right-4 w-16 h-16 object-contain opacity-80 mix-blend-multiply"
            />
          )}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm">귀사의 무궁한 발전을 기원하며, 아래와 같이 견적을 제출합니다.</p>
        <div className="flex justify-between items-center border-t-2 border-b-2 border-brand-500 bg-brand-500/10 p-3 print:border-blue-900 print:bg-blue-50">
          <span className="font-bold text-lg">합 계 금 액 (Total Amount)</span>
          <span className="font-bold text-xl">
            {symbol} {totalAmount.toLocaleString(undefined, fractionOpts)}
            <span className="text-xs font-normal ml-1 text-gray-600 print:text-black">({currency === 'KRW' ? 'VAT 별도' : 'VAT Excluded'})</span>
          </span>
        </div>
      </div>

      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300 text-xs print:border-gray-300">
          <thead>
            <tr className="bg-gray-50 text-center h-8 print:bg-gray-100">
              <th className="border border-gray-300 w-10 print:border-gray-300">No</th>
              <th className="border border-gray-300 print:border-gray-300">품명 / 규격 (Description)</th>
              <th className="border border-gray-300 w-20 print:border-gray-300">재질</th>
              <th className="border border-gray-300 w-12 print:border-gray-300">수량</th>
              <th className="border border-gray-300 w-24 print:border-gray-300">단가 ({symbol})</th>
              <th className="border border-gray-300 w-28 print:border-gray-300">금액 ({symbol})</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="h-8">
                <td className="border border-gray-300 text-center print:border-gray-300">{idx + 1}</td>
                <td className="border border-gray-300 px-2 py-1 print:border-gray-300">
                  <div className="font-bold text-sm">{item.part_no}</div>
                  <div className="text-gray-600 print:text-gray-600">{item.part_name}</div>
                  <div className="text-gray-600 opacity-70 text-[9px] mt-0.5 print:text-gray-500 print:opacity-100">
                    {item.shape === 'round' ? `⌀${item.spec_w} x ${item.spec_d}L` : `${item.spec_w} x ${item.spec_d} x ${item.spec_h}t`}
                  </div>
                </td>
                <td className="border border-gray-300 text-center px-1 print:border-gray-300">{item.original_material_name || '-'}</td>
                <td className="border border-gray-300 text-center print:border-gray-300">{item.qty}</td>
                <td className="border border-gray-300 text-right px-2 print:border-gray-300">{item.unit_price.toLocaleString(undefined, fractionOpts)}</td>
                <td className="border border-gray-300 text-right px-2 font-bold print:border-gray-300">{(item.supply_price || 0).toLocaleString(undefined, fractionOpts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-6 mb-8 text-xs">
        <div className="flex-1 border border-gray-300 p-3 print:border-gray-300">
          <h3 className="font-bold mb-2 border-b border-gray-300 pb-1 text-brand-500 print:text-blue-800 print:border-gray-300">📌 특이사항 및 거래조건 (Remarks)</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className="font-bold w-20 py-1">프로젝트 :</td><td>{estimate.project_name}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="flex-1 border border-gray-300 p-3 print:border-gray-300">
          <h3 className="font-bold mb-2 border-b border-gray-300 pb-1 text-brand-500 print:text-blue-800 print:border-gray-300">🏦 입금 계좌 정보 (Bank Info)</h3>
          <div className="space-y-1.5 mt-2">
            <p><span className="inline-block w-16 font-bold text-gray-600 print:text-gray-600">은행명 :</span> {companyInfo?.bank_name || '기업은행'}</p>
            <p><span className="inline-block w-16 font-bold text-gray-600 print:text-gray-600">예금주 :</span> {companyInfo?.name || '(주)회사명'}</p>
            <p><span className="inline-block w-16 font-bold text-gray-600 print:text-gray-600">계좌번호 :</span> <span className="font-bold text-base">{companyInfo?.bank_account || '123-456-7890'}</span></p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-10 pt-4">
        <div className="text-center w-1/3">
          <p className="mb-12">Accepted by Buyer</p>
          <div className="border-t border-gray-300 pt-1 print:border-black">Authorized Signature</div>
        </div>

        <div className="text-center w-1/3 relative">
          <p className="mb-12">Sincerely yours,</p>

          {sealSrc && (
            <img
              src={sealSrc}
              alt="Seal"
              className="absolute top-4 left-1/2 transform -translate-x-1/2 w-20 h-20 object-contain opacity-80 mix-blend-multiply"
            />
          )}

          <div className="font-bold mb-1">{companyInfo?.name || '(주)회사명'}</div>
          <div className="border-t border-gray-300 pt-1 print:border-black">Authorized Signature</div>
        </div>
      </div>
    </div>
  );
});

QuotationTemplate.displayName = 'QuotationTemplate';
