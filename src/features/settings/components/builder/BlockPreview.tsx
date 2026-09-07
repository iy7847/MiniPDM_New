import React from 'react';
import { Image } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { TemplateBlock } from '../../types/templateBuilder';
import { getLocalImagePath } from './templateUtils';

interface BlockPreviewProps {
  block: TemplateBlock;
  form: any;
}

export const BlockPreview: React.FC<BlockPreviewProps> = ({ block, form }) => {
  switch (block.type) {
    case 'header':
      return (
        <div className="flex flex-col justify-center w-full h-full relative">
          <div className="font-bold w-full" style={{ textAlign: block.align as any, fontSize: `${block.fontSize || 24}px`, fontWeight: block.fontWeight === 'normal' ? 400 : block.fontWeight === 'bold' ? 700 : 900 }}>{block.title}</div>
        </div>
      );
    case 'receiver_info':
      return (
        <div className="w-full h-full p-3 bg-transparent flex flex-col justify-center relative overflow-hidden" style={{ fontSize: (block as any).fontSize, textAlign: (block as any).align || 'left' }}>
          <h4 className="font-bold mb-2" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 1.2 : 12 }}>수신자(고객사) 정보</h4>
          <div className="text-gray-600 space-y-1" style={{ fontSize: (block as any).fontSize || 10 }}>
            <p>상호: (수신자 상호명)</p>
            {(block as any).fields?.includes('manager_name') && <p>담당자: (수신자 담당자명)</p>}
            {(block as any).fields?.includes('phone') && <p>연락처: (수신자 연락처)</p>}
            {(block as any).fields?.includes('email') && <p>이메일: (수신자 이메일)</p>}
            {(block as any).fields?.includes('fax') && <p>팩스: (수신자 팩스)</p>}
          </div>
        </div>
      );
    case 'item_table':
      return (
        <div className={`w-full h-full bg-white flex flex-col overflow-hidden ${block.theme === 'bordered' ? 'border border-gray-300' : ''}`} style={{ fontSize: block.fontSize || 10 }}>
          <table className={`w-full text-center ${block.theme !== 'simple' ? 'border-collapse' : ''}`}>
            <thead>
              <tr style={{ backgroundColor: block.headerBgColor || (block.theme === 'striped' ? '#f3f4f6' : '#f9fafb') }}>
                {block.columns.map((col: string) => (
                  <th key={col} className={`p-1.5 font-bold ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`} style={{ height: block.rowHeight || 24 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {block.columns.map((col: string) => (
                  <td key={`row1-${col}`} className={`p-1.5 text-gray-400 ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`} style={{ height: block.rowHeight || 24 }}>내용</td>
                ))}
              </tr>
              <tr className={block.theme === 'striped' ? 'bg-gray-50' : ''}>
                {block.columns.map((col: string) => (
                  <td key={`row2-${col}`} className={`p-1.5 text-gray-400 ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`} style={{ height: block.rowHeight || 24 }}>내용</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    case 'terms_notes':
      return (
        <div className="text-sm w-full text-left p-4 bg-gray-50 border border-gray-200 rounded h-full overflow-hidden">
          <h4 className="font-bold mb-2">발행 조건 및 비고</h4>
          {block.showPaymentTerms && <p className="text-gray-600 text-xs">- 결제 조건: {form?.default_payment_terms || '(기본 결제 조건 표시됨)'}</p>}
          {block.showIncoterms && <p className="text-gray-600 text-xs">- 인도 조건: {form?.default_incoterms || '(기본 인도 조건 표시됨)'}</p>}
          {block.showDeliveryPeriod && <p className="text-gray-600 text-xs">- 납기: {form?.default_delivery_period || '(기본 납기 표시됨)'}</p>}
          {block.showDestination && <p className="text-gray-600 text-xs">- 인도 장소: {form?.default_destination || '(기본 인도 장소 표시됨)'}</p>}
          {block.showNote && <p className="text-gray-600 text-xs mt-2 whitespace-pre-wrap">{form?.default_note || '(기본 비고 사항 내용이 여기에 표시됩니다.)'}</p>}
        </div>
      );
    case 'condition':
      const titleMap: Record<string, string> = {
        payment_terms: '결제 조건',
        incoterms: '인도 조건',
        delivery_period: '납기',
        destination: '인도 장소',
        note: '비고'
      };
      const textMap: Record<string, string> = {
        payment_terms: form?.default_payment_terms || '(기본 결제 조건)',
        incoterms: form?.default_incoterms || '(기본 인도 조건)',
        delivery_period: form?.default_delivery_period || '(기본 납기)',
        destination: form?.default_destination || '(기본 인도 장소)',
        note: form?.default_note || '(기본 비고 사항)'
      };
      return (
        <div className="w-full h-full p-3 bg-transparent rounded flex flex-col justify-center relative overflow-hidden" style={{ fontSize: (block as any).fontSize, textAlign: (block as any).align || 'left' }}>
          {block.showTitle && <h4 className="font-bold mb-1" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 1.2 : 12 }}>{titleMap[block.conditionType]}</h4>}
          <p className="text-gray-600 whitespace-pre-wrap" style={{ fontSize: (block as any).fontSize || 11 }}>{textMap[block.conditionType]}</p>
        </div>
      );
    case 'label':
      return <div className="text-sm font-bold truncate h-full flex items-center p-2" style={{ color: (block as any).color, fontSize: (block as any).fontSize, justifyContent: (block as any).align === 'center' ? 'center' : (block as any).align === 'right' ? 'flex-end' : 'flex-start' }}>{(block as any).text}</div>;
    case 'line':
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <div className="w-full" style={{ borderTopWidth: (block as any).thickness, borderTopStyle: (block as any).style, borderColor: (block as any).color }}></div>
        </div>
      );
    case 'image':
      const imgPath = (block as any).imageType === 'seal' ? form?.seal_path : form?.logo_path;
      if (imgPath) {
        return (
          <div 
            className="w-full h-full mix-blend-multiply" 
            style={{ 
              backgroundImage: `url(${getLocalImagePath(imgPath)})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }} 
            title={(block as any).imageType}
          />
        );
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded text-text-muted">
          <Image className="w-6 h-6 mb-1 text-gray-400" />
          <span className="text-[10px] font-bold">{(block as any).imageType === 'seal' ? '회사 직인' : '회사 로고'}</span>
        </div>
      );
    case 'page_number':
      const formatString = (block as any).format || '{current} / {total}';
      const sampleText = formatString.replace('{current}', '1').replace('{total}', '2');
      return (
        <div className="w-full h-full flex items-center p-2" style={{ color: (block as any).color, fontSize: (block as any).fontSize, justifyContent: (block as any).align === 'center' ? 'center' : (block as any).align === 'right' ? 'flex-end' : 'flex-start' }}>
          {sampleText}
        </div>
      );
    case 'company_info':
      const sealPath = form?.seal_path;
      return (
        <div className="w-full h-full p-3 bg-transparent flex flex-col justify-center relative overflow-hidden" style={{ fontSize: (block as any).fontSize, textAlign: (block as any).align || 'left' }}>
          <h4 className="font-bold mb-2" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 1.2 : 12 }}>공급자(회사) 정보</h4>
          <div className="text-gray-600 space-y-1" style={{ fontSize: (block as any).fontSize || 10 }}>
            <p>상호: {form?.name || '(주)우리회사'}</p>
            {(block as any).fields?.includes('ceo_name') && <p>대표자: {form?.ceo_name || '김대표'}</p>}
            {(block as any).fields?.includes('biz_num') && <p>사업자번호: {form?.biz_num || '123-45-67890'}</p>}
            {(block as any).fields?.includes('address') && <p>주소: {form?.address || '서울특별시 강남구 테헤란로 123'}</p>}
          </div>
          {(block as any).showSeal && (
            sealPath ? (
              <img src={getLocalImagePath(sealPath)} alt="직인" className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 object-contain mix-blend-multiply" />
            ) : (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border-2 border-red-200 text-red-200 rounded-full flex items-center justify-center text-[8px] rotate-[-15deg]">
                직인
              </div>
            )
          )}
        </div>
      );
    case 'document_info':
      return (
        <div className="w-full h-full p-2 bg-transparent flex flex-col justify-center relative overflow-hidden" style={{ fontSize: (block as any).fontSize, textAlign: (block as any).align || 'left' }}>
          <div className="text-gray-600 space-y-1" style={{ fontSize: (block as any).fontSize || 10 }}>
            {(block as any).fields?.includes('date') && <p>견적일자: 2024-01-01</p>}
            {(block as any).fields?.includes('estimate_no') && <p>견적번호: EST-12345678</p>}
          </div>
        </div>
      );
    case 'summary':
      return (
        <div style={{ backgroundColor: 'transparent', fontSize: (block as any).fontSize, justifyContent: 'center', alignItems: (block as any).align === 'center' ? 'center' : (block as any).align === 'right' ? 'flex-end' : 'flex-start' }} className="w-full h-full flex flex-col p-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="font-bold" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 1.5 : 18 }}>합계금액 :</span>
            {(block as any).showKoreanAmount && (
              <span className="font-bold text-gray-800" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 1.5 : 18 }}>일금 일백만원정</span>
            )}
            <span className="font-bold text-blue-700" style={{ fontSize: (block as any).fontSize ? (block as any).fontSize * 2 : 24 }}>(￦ 1,000,000)</span>
            {(block as any).showVatNote && <span className="text-gray-600 mt-1" style={{ fontSize: (block as any).fontSize || 12 }}>(VAT 별도)</span>}
          </div>
        </div>
      );
    case 'free_text':
      // Very basic preview of dynamic variables
      let textContent = block.text || '여기에 텍스트를 입력하세요.';
      textContent = textContent.replace(/{고객사명}/g, '(고객사명)');
      textContent = textContent.replace(/{견적총액}/g, '(견적총액)');
      textContent = textContent.replace(/{견적번호}/g, '(견적번호)');
      textContent = textContent.replace(/{작성일자}/g, '2024-01-01');
      return (
        <div className="w-full h-full whitespace-pre-wrap" style={{ fontSize: block.fontSize || 12, textAlign: block.align || 'left', fontWeight: block.fontWeight || 'normal' }}>
          {textContent}
        </div>
      );
    case 'approval_line':
      const titles = block.titles || ['담당', '검토', '승인'];
      const boxWidth = block.boxWidth || 60;
      return (
        <div className="flex h-full border border-gray-400 bg-white" style={{ width: 'fit-content' }}>
          <div className="w-6 border-r border-gray-400 flex items-center justify-center bg-gray-100">
            <span className="text-[10px] font-bold" style={{ writingMode: 'vertical-rl' }}>결재</span>
          </div>
          {titles.map((title: string, i: number) => (
            <div key={i} className={`flex flex-col ${i < titles.length - 1 ? 'border-r border-gray-400' : ''}`} style={{ width: boxWidth }}>
              <div className="h-6 border-b border-gray-400 flex items-center justify-center bg-gray-50 text-[10px] font-bold">
                {title}
              </div>
              <div className="flex-1 flex items-center justify-center">
                {/* 빈 공간 (도장) */}
              </div>
            </div>
          ))}
        </div>
      );
    case 'qrcode':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <QRCodeSVG value="SAMPLE_DATA" size={block.size || 60} />
        </div>
      );
    default:
      return <div>Unknown Block</div>;
  }
};
