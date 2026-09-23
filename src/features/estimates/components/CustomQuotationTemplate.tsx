import React, { useEffect, useState } from 'react';
import type { Estimate, EstimateItem } from '../types';
import type { CustomTemplate } from '../../settings/services/settingsService';
import type { TemplateBlock, ItemTableBlock } from '../../settings/types/templateBuilder';
import { supabase } from '../../../shared/services/supabase';
import { numberToKoreanAmount } from '../utils/amountFormatters';
import { QRCodeSVG } from 'qrcode.react';

interface CustomQuotationTemplateProps {
  companyInfo: any;
  clientInfo: any;
  estimate: Estimate;
  items: EstimateItem[];
  template: CustomTemplate;
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

const resolveImagePath = async (path: string | undefined | null): Promise<string> => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;

  // Electron 환경에서 로컬 파일일 경우, ipcRenderer로 읽어서 Blob URL로 변환 (Chromium 로컬 파일 보안 차단 원천 해결)
  if ((window as any).ipcRenderer) {
    try {
      const res = await (window as any).ipcRenderer.invoke('read-local-file', path);
      if (res.success && res.data) {
        const ext = path.toLowerCase().endsWith('.png') ? 'image/png' : path.toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/jpeg';
        const blob = new Blob([res.data], { type: ext });
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn('Failed to load local image via IPC:', e);
    }
  }

  // Supabase Storage 경로인 경우 (드라이브 문자가 없는 경우)
  if (!path.includes(':') && !path.startsWith('/') && !path.startsWith('\\')) {
    const { data } = supabase.storage.from('company_assets').getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }

  let normalizedPath = path.replace(/\\/g, '/');
  normalizedPath = normalizedPath.replace(/^file:\/\/\//i, '');
  
  if (import.meta.env.DEV) {
    return `/@fs/${normalizedPath}`;
  }
  return `file:///${normalizedPath}`;
};

export const CustomQuotationTemplate = React.forwardRef<HTMLDivElement, CustomQuotationTemplateProps>(({ companyInfo, clientInfo, estimate, items, template }, ref) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [sealSrc, setSealSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadImages = async () => {
      if (companyInfo?.logo_path) {
        const url = await resolveImagePath(companyInfo.logo_path);
        if (active) setLogoSrc(url);
      }
      if (companyInfo?.seal_path) {
        const url = await resolveImagePath(companyInfo.seal_path);
        if (active) setSealSrc(url);
      }
    };
    loadImages();
    return () => {
      active = false;
    };
  }, [companyInfo?.logo_path, companyInfo?.seal_path]);

  const [watermarkSrc, setWatermarkSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const loadWm = async () => {
      const wmPath = template.layout_json?.watermark?.imagePath;
      if (wmPath) {
        const url = await resolveImagePath(wmPath);
        if (active) setWatermarkSrc(url);
      }
    };
    loadWm();
    return () => {
      active = false;
    };
  }, [template.layout_json?.watermark?.imagePath]);

  const currency = estimate.currency || 'KRW';
  const isForeign = currency !== 'KRW';
  const fractionOpts = isForeign ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : { maximumFractionDigits: 0 };
  
  const symbol = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency;
  const calculatedTotalAmount = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  const totalAmount = estimate.total_amount || calculatedTotalAmount;
  const today = new Date().toISOString().split('T')[0];

  let layout = template.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch (e) {
      console.error('Failed to parse layout_json', e);
      layout = null;
    }
  }

  if (!layout) {
    return <div ref={ref} className="p-8 text-red-500">양식 데이터(layout_json)가 없습니다.</div>;
  }

  const headerHeight = layout.headerHeight || 220;
  const footerHeight = layout.footerHeight || 200;
  const blocks: TemplateBlock[] = layout.blocks || [];

  // Pagination Logic
  const PAGE_HEIGHT = 1123;
  const PAGE_WIDTH = 794;
  const headerBlocks = blocks.filter(b => b.band === 'header');
  const bodyBlocks = blocks.filter(b => b.band === 'body' && b.type !== 'item_table');
  const footerBlocks = blocks.filter(b => b.band === 'footer');
  const tableBlock = blocks.find(b => b.type === 'item_table') as ItemTableBlock | undefined;

  // Calculate items per page
  // Assume table header is ~32px and each row is ~32px.
  let itemsPerPage = items.length || 1;
  if (tableBlock && typeof tableBlock.height === 'number') {
    itemsPerPage = Math.max(1, Math.floor((tableBlock.height - 32) / 32));
  }

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  const renderBlock = (block: TemplateBlock, pageIndex: number, isFirstPage: boolean, isLastPage: boolean) => {
    // Only render header blocks on the first page, and footer blocks on the last page.
    if (block.band === 'header' && !isFirstPage) return null;
    if (block.band === 'footer' && !isLastPage) return null;

    const b = block as any;
    const style: React.CSSProperties = {
      position: 'absolute',
      left: b.x,
      top: b.band === 'footer' ? b.y - (PAGE_HEIGHT - footerHeight) + (PAGE_HEIGHT - footerHeight) : b.y, // Absolute Y is preserved from builder
      width: b.width,
      height: b.height,
    };

    switch (block.type) {
      case 'header':
        return (
          <div key={b.id} style={style} className="flex flex-col items-center justify-center relative">
            <h1 style={{ textAlign: b.align as any, fontSize: b.fontSize, fontWeight: b.fontWeight }} className="w-full tracking-widest text-black">
              {b.title || '견 적 서'}
            </h1>
          </div>
        );
      
      case 'receiver_info':
        return (
          <div key={b.id} style={{ ...style, fontSize: b.fontSize, textAlign: b.align || 'left' }} className="w-full h-full p-3 bg-transparent flex flex-col justify-center relative overflow-hidden">
            <h4 className="font-bold mb-2" style={{ fontSize: b.fontSize ? b.fontSize * 1.2 : 12 }}>수신자(고객사) 정보</h4>
            <div className="text-gray-600 space-y-1" style={{ fontSize: b.fontSize || 10 }}>
              <p>상호: <span className="font-bold">{clientInfo?.name || '귀하'}</span></p>
              {b.fields?.includes('manager_name') && <p>담당자: 담당자 귀하</p>}
              {b.fields?.includes('phone') && <p>연락처: {formatPhoneNumber(clientInfo?.phone || '')}</p>}
              {b.fields?.includes('email') && <p>이메일: {clientInfo?.email}</p>}
              {b.fields?.includes('fax') && <p>팩스: {formatPhoneNumber(clientInfo?.fax || '')}</p>}
            </div>
          </div>
        );

      case 'document_info':
        return (
          <div key={b.id} style={{ ...style, fontSize: b.fontSize, textAlign: b.align || 'left' }} className="w-full h-full p-3 bg-transparent flex flex-col justify-center relative overflow-hidden">
            <div className="text-gray-600 space-y-1" style={{ fontSize: b.fontSize || 10 }}>
              {b.fields?.includes('date') && <p>견적일자: {today}</p>}
              {b.fields?.includes('estimate_no') && <p>견적번호: EST-{(estimate.id || '').substring(0, 8).toUpperCase()}</p>}
            </div>
          </div>
        );

      case 'company_info':
        return (
          <div key={b.id} style={{ ...style, fontSize: b.fontSize, textAlign: b.align || 'left' }} className="w-full h-full p-3 bg-transparent flex flex-col justify-center relative overflow-hidden">
            <h4 className="font-bold mb-2" style={{ fontSize: b.fontSize ? b.fontSize * 1.2 : 12 }}>공급자(회사) 정보</h4>
            <div className="text-gray-600 space-y-1" style={{ fontSize: b.fontSize || 10 }}>
              <p>상호: {companyInfo?.name || '(주)우리회사'}</p>
              {b.fields?.includes('ceo_name') && <p>대표자: {companyInfo?.ceo_name}</p>}
              {b.fields?.includes('biz_num') && <p>사업자번호: {companyInfo?.biz_num}</p>}
              {b.fields?.includes('address') && <p>주소: {companyInfo?.address}</p>}
              {b.fields?.includes('phone') && <p>전화번호: {formatPhoneNumber(companyInfo?.phone || '')}</p>}
            </div>
            {b.showSeal && sealSrc && (
              <img src={sealSrc} alt="직인" className="absolute right-4 top-[calc(50%-24px)] w-12 h-12 object-contain mix-blend-multiply" />
            )}
          </div>
        );

      case 'summary':
        return (
          <div key={b.id} style={{ ...style, backgroundColor: 'transparent', fontSize: b.fontSize, justifyContent: 'center', alignItems: b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start' }} className="flex flex-col p-4">
            <div className="flex items-center gap-3">
              <span className="font-bold" style={{ fontSize: b.fontSize ? b.fontSize * 1.5 : 18 }}>합계금액 :</span>
              {b.showKoreanAmount && (
                <span className="font-bold text-gray-800" style={{ fontSize: b.fontSize ? b.fontSize * 1.5 : 18 }}>
                  {numberToKoreanAmount(totalAmount, currency)}
                </span>
              )}
              <span className="font-bold text-blue-700" style={{ fontSize: b.fontSize ? b.fontSize * 2 : 24 }}>
                ({symbol} {totalAmount.toLocaleString(undefined, fractionOpts)})
              </span>
              {b.showVatNote && <span className="text-gray-600 mt-1" style={{ fontSize: b.fontSize || 12 }}>(VAT 별도)</span>}
            </div>
            {b.validityText && (
              <div className="mt-2 text-gray-600" style={{ fontSize: b.fontSize || 12 }}>견적 유효기간: {b.validityText}</div>
            )}
          </div>
        );

      case 'condition':
        const titleMap: any = {
          payment_terms: '결제 조건',
          incoterms: '인도 조건',
          delivery_period: '납기',
          destination: '인도 장소',
          note: '비고'
        };
        const textMap: any = {
          payment_terms: companyInfo?.default_payment_terms,
          incoterms: companyInfo?.default_incoterms,
          delivery_period: companyInfo?.default_delivery_period,
          destination: companyInfo?.default_destination,
          note: companyInfo?.default_note
        };
        return (
          <div key={b.id} style={{ ...style, fontSize: b.fontSize, textAlign: b.align || 'left' }} className="p-3 bg-transparent rounded flex flex-col justify-center">
            {b.showTitle && <h4 className="font-bold mb-1" style={{ fontSize: b.fontSize ? b.fontSize * 1.2 : 12 }}>{titleMap[b.conditionType]}</h4>}
            <p className="text-gray-600 whitespace-pre-wrap" style={{ fontSize: b.fontSize || 11 }}>{textMap[b.conditionType] || '-'}</p>
          </div>
        );

      case 'label':
        return (
          <div key={b.id} style={{ ...style, color: b.color, fontSize: b.fontSize, fontWeight: b.fontWeight, justifyContent: b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start' }} className="flex items-center truncate">
            {b.text}
          </div>
        );

      case 'line':
        return (
          <div key={b.id} style={style} className="flex items-center justify-center">
            <div className="w-full" style={{ borderTopWidth: b.thickness, borderTopStyle: b.style, borderColor: b.color }} />
          </div>
        );

      case 'image':
        const imgPath = b.imageType === 'seal' ? sealSrc : logoSrc;
        if (!imgPath) return null;
        return (
          <div 
            key={b.id} 
            style={{ 
              ...style, 
              backgroundImage: `url(${imgPath})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }} 
            className="mix-blend-multiply"
            title={b.imageType}
          />
        );

      case 'page_number':
        const formatString = b.format || '{current} / {total}';
        const pageText = formatString.replace('{current}', (pageIndex + 1).toString()).replace('{total}', totalPages.toString());
        return (
          <div key={b.id} style={{ ...style, color: b.color, fontSize: b.fontSize, justifyContent: b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start' }} className="flex items-center truncate">
            {pageText}
          </div>
        );

      case 'free_text':
        let textContent = b.text || '';
        textContent = textContent.replace(/{고객사명}/g, clientInfo?.name || '');
        textContent = textContent.replace(/{견적총액}/g, totalAmount.toLocaleString());
        textContent = textContent.replace(/{견적번호}/g, estimate.estimate_no || '');
        textContent = textContent.replace(/{작성일자}/g, estimate.estimate_date || '');
        return (
          <div key={b.id} style={{ ...style, fontSize: b.fontSize, textAlign: b.align || 'left', fontWeight: b.fontWeight || 'normal' }} className="whitespace-pre-wrap">
            {textContent}
          </div>
        );

      case 'approval_line':
        const titles = b.titles || ['담당', '검토', '승인'];
        const boxWidth = b.boxWidth || 60;
        return (
          <div key={b.id} style={style} className="flex h-full border border-gray-400 bg-white w-fit">
            <div className="w-6 border-r border-gray-400 flex items-center justify-center bg-gray-100">
              <span className="text-[10px] font-bold" style={{ writingMode: 'vertical-rl' }}>결재</span>
            </div>
            {titles.map((title: string, i: number) => (
              <div key={i} className={`flex flex-col ${i < titles.length - 1 ? 'border-r border-gray-400' : ''}`} style={{ width: boxWidth }}>
                <div className="h-6 border-b border-gray-400 flex items-center justify-center bg-gray-50 text-[10px] font-bold">
                  {title}
                </div>
                <div className="flex-1 flex items-center justify-center"></div>
              </div>
            ))}
          </div>
        );

      case 'qrcode':
        let qrValue = '';
        if (b.valueType === 'estimate_no') {
          qrValue = estimate.estimate_no || '';
        } else if (b.valueType === 'project_name') {
          qrValue = estimate.project_name || '';
        } else if (b.valueType === 'company_info') {
          qrValue = `BEGIN:VCARD\nVERSION:3.0\nN:${companyInfo?.name || ''}\nFN:${companyInfo?.name || ''}\nORG:${companyInfo?.name || ''}\nTEL:${companyInfo?.phone || ''}\nEMAIL:${companyInfo?.email || ''}\nEND:VCARD`;
        }
        if (!qrValue) return null;
        return (
          <div key={b.id} style={style} className="flex items-center justify-center">
            <QRCodeSVG value={qrValue} size={b.size || 60} />
          </div>
        );

      default:
        return null;
    }
  };

  const renderTable = (block: ItemTableBlock, pageItems: EstimateItem[], pageIndex: number) => {
    let expandedColumns: string[] = [];
    block.columns.forEach(col => {
      expandedColumns.push(col);
    });

    return (
      <div key={block.id} style={{ position: 'absolute', left: block.x, top: block.y, width: block.width, height: block.height, fontSize: block.fontSize || 11 }}>
        <table className={`w-full border-collapse ${block.theme === 'striped' ? 'table-striped' : ''}`}>
          <thead>
            <tr style={{ backgroundColor: block.headerBgColor || '#f3f4f6' }}>
              {expandedColumns.map((col, i) => (
                <th key={i} className={`border border-gray-300 p-2 text-center ${col === 'No.' ? 'w-12' : ''}`} style={{ height: block.rowHeight || 28 }}>
                  {col.startsWith('(커스텀) ') ? col.replace('(커스텀) ', '') : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const globalIndex = pageIndex * itemsPerPage + index + 1;
              return (
                <tr key={index} className="border-b border-gray-200">
                  {expandedColumns.map((col, i) => {
                    let val: React.ReactNode = '';
                    if (col === 'No.') val = globalIndex;
                    else if (col === '품명') val = item.part_name;
                    else if (col === '품번') val = item.part_no;
                    else if (col === '규격') val = item.shape === 'round' ? `⌀${item.spec_w} x ${item.spec_d}L` : `${item.spec_w || 0}x${item.spec_d || 0}x${item.spec_h || 0}`;
                    else if (col === '재질') val = item.original_material_name || item.material_name || '-';
                    else if (col === '단위') val = 'EA';
                    else if (col === '수량') val = item.qty;
                    else if (col === '단가') val = (item.unit_price || 0).toLocaleString(undefined, fractionOpts);
                    else if (col === '공급가액') val = (item.supply_price || 0).toLocaleString(undefined, fractionOpts);
                    else if (col === '비고') val = item.note;
                    else if (col.startsWith('(커스텀) ')) {
                      const realCol = col.replace('(커스텀) ', '');
                      const customCost = item.custom_costs?.[realCol] || 0;
                      val = customCost.toLocaleString(undefined, fractionOpts);
                    }
                    
                    return <td key={i} className={`border border-gray-300 p-1.5 ${['수량', '단가', '공급가액'].includes(col) || col.startsWith('(커스텀) ') ? 'text-right' : 'text-center'}`} style={{ height: block.rowHeight || 28 }}>{val}</td>;
                  })}
                </tr>
              );
            })}
            {/* Fill empty rows if needed to keep height consistent */}
            {pageItems.length < itemsPerPage && Array.from({ length: itemsPerPage - pageItems.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                {expandedColumns.map((col, j) => (
                  <td key={j} className={`border border-gray-300 p-1.5 ${col === 'No.' ? 'text-center text-transparent' : ''}`} style={{ height: block.rowHeight || 28 }}>{col === 'No.' ? '-' : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const orientation = template.layout_json?.orientation || 'portrait';
  const wrapperClass = orientation === 'landscape' 
    ? "w-[1123px] h-[794px] bg-white text-black font-sans leading-normal relative box-border overflow-hidden print:w-[297mm] print:h-[210mm] print:overflow-hidden"
    : "w-[794px] h-[1122px] bg-white text-black font-sans leading-normal relative box-border overflow-hidden print:w-[210mm] print:h-[297mm] print:overflow-hidden";
  
  const watermarkConf = template.layout_json?.watermark;

  const pages = Array.from({ length: totalPages }).map((_, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;
    const pageItems = items.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

    return (
      <div 
        key={pageIndex} 
        className={wrapperClass}
        style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', margin: '0' }}
      >
        {/* 내부 컨텐츠를 96%로 축소하여 상하좌우 약 5mm 이상의 안전 여백(Safe Zone) 확보 */}
        <div className="w-full h-full" style={{ transform: 'scale(0.96)', transformOrigin: 'center' }}>
          {watermarkConf?.show && watermarkSrc && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: watermarkConf.opacity || 0.1, zIndex: 5 }}>
              <img 
                src={watermarkSrc} 
                alt="watermark" 
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${watermarkConf.scale || 1}) rotate(${watermarkConf.rotation || 0}deg)`
                }}
              />
            </div>
          )}

          <div className="relative z-10 w-full h-full">
            {/* Render Header blocks only on first page */}
            {headerBlocks.map(b => renderBlock(b, pageIndex, isFirstPage, isLastPage))}
            
            {/* Render Body blocks on all pages */}
            {bodyBlocks.map(b => renderBlock(b, pageIndex, isFirstPage, isLastPage))}
            
            {/* Render Table block */}
            {tableBlock && renderTable(tableBlock, pageItems, pageIndex)}
            
            {/* Render Footer blocks only on last page */}
            {footerBlocks.map(b => renderBlock(b, pageIndex, isFirstPage, isLastPage))}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div ref={ref} className="bg-white text-black flex flex-col items-center p-0 m-0">
      {pages}
    </div>
  );
});
