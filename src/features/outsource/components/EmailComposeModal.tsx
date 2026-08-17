import React, { useState, useEffect } from 'react';
import { Search, Loader2, Send } from 'lucide-react';
import { supabase } from '@/shared/services/supabase';
import { toast } from '@/shared/stores/useToastStore';
import { Button, BaseInput, Checkbox } from '@/design-system';
import type { ProcurementOrder } from '../hooks/useProcurementList';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FileBadge } from '@/features/estimates/components/FileBadge';
import { EXT_3D } from '@/shared/utils/fileMatching';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  selectedOrders: ProcurementOrder[];
  updates: { id: string; type: any; unit_price: number; note: string }[];
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
  supplierManagerName?: string;
  expectedDate: string;
  processBatchOrder: (updates: any[], supplierId: string, supplierName: string, expectedDate: string, token: string) => Promise<any>;
}

export const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  selectedOrders,
  updates,
  supplierId,
  supplierName,
  supplierEmail,
  supplierManagerName,
  expectedDate,
  processBatchOrder
}) => {
  const [emailBody, setEmailBody] = useState('');
  const [subject, setSubject] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(supplierEmail || '');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  // 수신 확인 및 묶음 발주용 식별 토큰
  const [receiptToken] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const init = async () => {
      let cName = '우리 회사';
      let uName = '담당자';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id, name').eq('id', user.id).single();
        if (profile) {
          if (profile.name) uName = profile.name;
          if (profile.company_id) {
            const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
            if (company?.name) {
              cName = company.name;
            }
          }
        }
      }
      setCompanyName(cName);
      setUserName(uName);

      const recipientName = supplierManagerName ? `${supplierManagerName} 님` : '담당자님';
      const senderName = uName !== '담당자' ? `${uName} 님` : '담당자';

      // 기본 메일 양식 세팅
      const defaultBody = `안녕하세요. ${supplierName} ${recipientName}.\n\n첨부와 같이 발주하오니 확인 후 진행 부탁드립니다.\n문의 사항은 ${cName} ${senderName}에게 문의 바랍니다.`;
      setEmailBody(defaultBody);
      setSubject(`[${cName}] 발주 요청건 (${new Date().toLocaleDateString()})`);
    };
    init();

    const allFileIds = new Set<string>();
    const isMaterialOrder = selectedOrders.length > 0 && selectedOrders.every(o => o.type === 'MATERIAL');
    
    if (!isMaterialOrder) {
      selectedOrders.forEach(o => {
        (o.files || []).forEach(f => {
          allFileIds.add(f.id);
        });
      });
    }
    setSelectedFileIds(allFileIds);
  }, [supplierName, selectedOrders]);

  if (!isOpen) return null;

  const toggleFile = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleSendEmail = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. 발주 품목 상세 HTML 생성 (테이블 형태)
      const tableRows = selectedOrders.map((order, idx) => {
        const updateInfo = updates.find(u => u.id === order.id);
        const qty = order.quantity;
        const isMaterial = order.type === 'MATERIAL';
        const price = updateInfo?.unit_price || order.unit_price || 0;
        const total = qty * price;
        const qtyDisplay = qty === 0 ? '-' : qty;
        const priceDisplay = (price === 0 || isMaterial) ? '-' : `₩${price.toLocaleString()}`;
        const totalDisplay = (total === 0 || isMaterial) ? '-' : `₩${total.toLocaleString()}`;
        
        let displayPartNo = order.part_no || '-';
        let displayPartName = order.item_name || '-';
        if (isMaterial) {
          let shape = order.shape || '';
          
          // If shape is "일반 판재", just show "판재"
          if (shape.includes('일반 판재')) shape = '판재';
          
          displayPartNo = `${order.item_name || '-'}${shape ? `[${shape}]` : ''}`;
          displayPartName = '';
        }

        return `
          <tr>
            <td style="border: 1px solid #ccc; padding: 4px 8px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ccc; padding: 4px 8px; text-align: center;">
              ${order.order_item_no ? `<img src="https://barcodeapi.org/api/code128/${order.order_item_no}" style="height: 24px; display: block; margin: 0 auto;" alt="바코드"/>` : '-'}
            </td>
            <td style="border: 1px solid #ccc; padding: 4px 8px;">
              <div style="font-weight: bold; margin-bottom: 2px;">${displayPartNo}</div>
              ${displayPartName ? `<div style="color: #666; font-size: 11px;">${displayPartName}</div>` : ''}
            </td>
            <td style="border: 1px solid #ccc; padding: 4px 8px;">${order.item_spec || '-'}</td>
            <td style="border: 1px solid #ccc; padding: 4px 8px; text-align: right;">${qtyDisplay}</td>
            <td style="border: 1px solid #ccc; padding: 4px 8px; text-align: right;">${priceDisplay}</td>
            <td style="border: 1px solid #ccc; padding: 4px 8px; text-align: right; font-weight: bold;">${totalDisplay}</td>
            <td style="border: 1px solid #ccc; padding: 4px 8px;">${updateInfo?.note || ''}</td>
          </tr>
        `;
      }).join('');

      const totalOrderSum = selectedOrders.reduce((sum, order) => {
        if (order.type === 'MATERIAL') return sum;
        const updateInfo = updates.find(u => u.id === order.id);
        const qty = order.quantity || order.qty || 1;
        const price = updateInfo?.unit_price || order.unit_price || 0;
        return sum + (qty * price);
      }, 0);

      const itemDetailsHtml = `
        <table style="border-collapse: collapse; width: 100%; text-align: left; font-size: 12px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; width: 40px; text-align: center;">번호</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; width: 100px; text-align: center;">바코드</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: left;">${selectedOrders.every(o => o.type === 'MATERIAL') ? '재질 (형태)' : '품번 / 품명'}</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: left;">규격</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: right;">수량</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: right;">단가</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: right;">금액</th>
              <th style="border: 1px solid #ccc; padding: 6px 8px; background-color: #f9f9f9; text-align: left;">비고</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="background-color: #f9f9f9; font-weight: bold;">
              <td colspan="6" style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">총 발주 금액</td>
              <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right; color: #0284c7;">${totalOrderSum === 0 ? '-' : `₩${totalOrderSum.toLocaleString()}`}</td>
              <td style="border: 1px solid #ccc; padding: 6px 8px;"></td>
            </tr>
          </tfoot>
        </table>
      `;

      // 2. 발주서 PDF 생성
      const poHtml = `
        <div style="padding: 30px; font-family: 'Malgun Gothic', sans-serif; color: #111827; background: #fff; width: 1040px; box-sizing: border-box;">
          <h1 style="text-align: center; border-bottom: 2px solid #111827; padding-bottom: 15px; margin-bottom: 30px; font-size: 28px;">발주서</h1>
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px;">
            <div>
              <p style="margin: 0 0 8px 0;"><strong>수신:</strong> ${supplierName} ${supplierManagerName ? supplierManagerName + ' 귀하' : '담당자 귀하'}</p>
              <p style="margin: 0;"><strong>납기일:</strong> ${expectedDate}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0 0 8px 0;"><strong>발신:</strong> ${companyName}</p>
              <p style="margin: 0;"><strong>발주일:</strong> ${new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
          ${itemDetailsHtml}
        </div>
      `;

      const pdfBuffer = await html2pdf().set({
        margin: 10,
        filename: 'PO.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: true,
          windowWidth: 1040,
          windowHeight: 800
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      }).from(poHtml).output('arraybuffer');

      // 3. 첨부파일 읽기 및 ZIP 압축
      const zip = new JSZip();
      const poFileName = `발주서_${supplierName}_${new Date().toISOString().split('T')[0]}.pdf`;
      zip.file(poFileName, pdfBuffer);

      for (const order of selectedOrders) {
        const orderFiles = (order.files || []).filter(f => selectedFileIds.has(f.id));
        for (const file of orderFiles) {
          const filePath = file.file_path || file.name;
          if (!filePath) continue;
          
          try {
            const res = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
            if (res.success) {
              const originalName = file.original_name || file.file_name || 'document';
              zip.file(originalName, res.data);
            }
          } catch (err) {
            console.error('Failed to read file for zip:', filePath, err);
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: 'uint8array' });

      // 4. 단일 ZIP 파일 R2 업로드
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
          secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
        },
      });

      const zipKey = `batch_orders/${Date.now()}-발주문서모음.zip`;
      await s3.send(new PutObjectCommand({
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: zipKey,
        Body: zipContent,
        ContentType: 'application/zip'
      }));

      const zipUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${zipKey}`;

      const payload = {
        supplier_email: recipientEmail,
        supplier_name: supplierName,
        zip_url: zipUrl,
        user_email: user?.email || 'noreply@minipdm.app',
        company_name: companyName || '우리 회사',
        custom_message: emailBody.replace(/\n/g, '<br/>'),
        receipt_token: receiptToken,
        subject: subject
      };

      // 3. 메일 발송 전 DB 업데이트 (토큰 저장)
      const res = await processBatchOrder(updates, supplierId, supplierName, expectedDate, receiptToken);
      if (!res.success) {
        throw new Error(res.error);
      }

      // 4. 메일 발송
      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: payload
      });
        
      if (error) throw error;

      toast.success('메일 발송 및 발주 처리가 완료되었습니다.');
      onComplete();

    } catch (err: any) {
      toast.error('발송 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-elevated border border-border-default rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border-default">
          <h2 className="text-xl font-bold text-text-primary">발주 메일 발송</h2>
          <p className="text-sm text-text-secondary mt-1">발송할 메일 내용과 첨부파일을 확인하세요.</p>
        </div>

        <div className="p-6 flex-1 overflow-auto custom-scrollbar flex flex-col gap-6">
          {/* 수신자 이메일 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">받는 사람 (이메일)</label>
            <BaseInput 
              type="email"
              className="w-full"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="수신자 이메일 주소"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">메일 제목</label>
            <BaseInput 
              type="text" 
              className="w-full text-lg font-bold"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="메일 제목을 입력하세요"
            />
          </div>

          {/* 발주 내용 요약 (발주서 웹페이지 미리보기) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">발주 내용 확인 (공급사 열람용 발주서 미리보기)</label>
            <div className="border border-border-default rounded-md overflow-hidden bg-white p-8 custom-scrollbar max-h-[400px] overflow-y-auto relative text-gray-900 shadow-inner">
              <div className="absolute top-4 right-4 opacity-50 select-none pointer-events-none text-2xl font-bold text-gray-200">
                PREVIEW
              </div>
              <div className="flex justify-between items-center border-b-2 border-gray-900 pb-2 mb-3">
                <div className="flex items-baseline gap-4">
                  <h1 className="text-xl font-bold tracking-tight">발주서</h1>
                  <p className="text-gray-600 text-sm"><strong>발주번호:</strong> {receiptToken.split('-')[0].toUpperCase()}</p>
                  <p className="text-gray-600 text-sm"><strong>발주일자:</strong> {new Date().toISOString().split('T')[0]}</p>
                </div>
                <div className="text-right flex flex-col items-end justify-end">
                  <h2 className="text-xl font-bold text-brand-600">{companyName}</h2>
                </div>
              </div>

              <div className="flex justify-between gap-4 mb-4 text-sm">
                <div className="flex-1 bg-gray-50 p-2 border border-gray-200 rounded flex items-center gap-4">
                  <h3 className="font-bold text-gray-700 pr-4 border-r border-gray-200 text-sm whitespace-nowrap">공급사</h3>
                  <div className="flex gap-4">
                    <p className="text-gray-600 text-xs"><span className="text-gray-500 mr-1">상호명:</span> <strong className="text-gray-900">{supplierName}</strong></p>
                    <p className="text-gray-600 text-xs"><span className="text-gray-500 mr-1">담당자:</span> {supplierManagerName || '담당자'}</p>
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 p-2 border border-gray-200 rounded flex items-center gap-4">
                  <h3 className="font-bold text-gray-700 pr-4 border-r border-gray-200 text-sm whitespace-nowrap">발주처</h3>
                  <div className="flex gap-4">
                    <p className="text-gray-600 text-xs"><span className="text-gray-500 mr-1">상호명:</span> <strong className="text-gray-900">{companyName}</strong></p>
                    <p className="text-gray-600 text-xs"><span className="text-gray-500 mr-1">납기일:</span> <strong className="text-red-600">{expectedDate}</strong></p>
                  </div>
                </div>
              </div>
              
              <table className="w-full text-sm text-left border-collapse border border-gray-300">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold w-10 text-center text-xs">번호</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold w-24 text-center text-xs">바코드</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-xs text-left">{selectedOrders.every(o => o.type === 'MATERIAL') ? '재질 (형태)' : '품번 / 품명'}</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-xs">규격</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-right text-xs">수량</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-right text-xs">단가</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-right text-xs">금액</th>
                    <th className="px-2 py-1.5 border border-gray-300 font-bold text-xs">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrders.map((order, idx) => {
                    const qty = order.quantity || order.qty || 1;
                    const price = updates.find(u => u.id === order.id)?.unit_price || 0;
                    const total = qty * price;
                    const isMaterial = order.type === 'MATERIAL';
                    
                    let displayPartNo = order.part_no || '-';
                    let displayPartName = order.item_name || '-';
                    
                    if (isMaterial) {
                      let shape = order.shape || '';
                      if (shape.includes('일반 판재')) shape = '판재';
                      
                      displayPartNo = `${order.item_name || '-'}${shape ? `[${shape}]` : ''}`;
                      displayPartName = '';
                    }

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 text-xs">
                        <td className="px-2 py-1.5 border border-gray-300 text-center">{idx + 1}</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center">
                          {order.order_item_no ? (
                            <img src={`https://barcodeapi.org/api/code128/${order.order_item_no}`} alt="바코드" className="h-6 object-contain block mx-auto" />
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <div className="font-bold text-gray-900 text-[11px] mb-0.5">{displayPartNo}</div>
                          {displayPartName && <div className="text-gray-600 font-medium">{displayPartName}</div>}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-gray-600">{order.item_spec}</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right">{qty === 0 ? '-' : qty}</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right">{(price === 0 || isMaterial) ? '-' : `₩${price.toLocaleString()}`}</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-medium">{(total === 0 || isMaterial) ? '-' : `₩${total.toLocaleString()}`}</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-[10px] text-gray-500">{updates.find(u => u.id === order.id)?.note || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td colSpan={6} className="px-2 py-1.5 border border-gray-300 text-right font-bold text-gray-700 text-xs">총 발주 금액</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-bold text-brand-600 text-sm">
                      {(() => {
                        const sum = selectedOrders.reduce((sum, order) => {
                          if (order.type === 'MATERIAL') return sum;
                          return sum + ((order.quantity || order.qty || 1) * (updates.find(u => u.id === order.id)?.unit_price || 0));
                        }, 0);
                        return sum === 0 ? '-' : `₩${sum.toLocaleString()}`;
                      })()}
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 본문 편집 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">메일 본문</label>
            <textarea 
              className="w-full bg-bg-surface border border-border-default rounded-md p-3 text-text-primary text-sm h-48 focus:outline-none focus:border-brand-500 custom-scrollbar"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
          </div>

          {/* 첨부파일 선택 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">첨부파일 선택</label>
            <div className="border border-border-default rounded-md bg-bg-surface overflow-hidden">
              {selectedOrders.map(order => {
                const files = order.files || [];
                if (files.length === 0) return null;
                return (
                  <div key={order.id} className="border-b border-border-default last:border-0 p-3">
                    <div className="font-medium text-sm text-text-primary mb-2">
                      [{order.po_no}] {order.item_name}
                    </div>
                    <div className="flex flex-col gap-2 pl-2">
                      {files.map(file => {
                        const fileName = file.original_name || file.file_name || file.name || '알 수 없는 파일';
                        const isChecked = selectedFileIds.has(file.id);
                        const is3D = EXT_3D.includes('.' + (fileName.split('.').pop()?.toLowerCase() || ''));
                        
                        return (
                          <label key={file.id} className="flex items-center gap-2 cursor-pointer group w-fit">
                            <Checkbox 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) toggleFile(file.id);
                                else toggleFile(file.id);
                              }}
                            />
                            <div className="flex items-center gap-1.5 text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${is3D ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {is3D ? '3D' : '2D'}
                              </span>
                              {fileName}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!selectedOrders.some(o => (o.files || []).length > 0) && (
                <div className="p-4 text-center text-sm text-text-tertiary">
                  첨부 가능한 도면 파일이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-default flex justify-end gap-3 bg-bg-surface rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            뒤로가기
          </Button>
          <Button variant="primary" onClick={handleSendEmail} disabled={isSubmitting}>
            {isSubmitting ? '발송 중...' : '발송 및 발주 확정'}
          </Button>
        </div>
      </div>
    </div>
  );
};
