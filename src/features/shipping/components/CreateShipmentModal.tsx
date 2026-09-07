import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/shared/services/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { BaseInput } from '../../../design-system/BaseInput';
import { toast } from '@/shared/stores/useToastStore';
import type { PendingShippingItem } from '../hooks/useShippingList';

interface CreateShipmentModalProps {
  selectedItems: PendingShippingItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({ selectedItems, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    courier: '',
    tracking_no: '',
    recipient_name: selectedItems[0]?.client_name || '',
    recipient_contact: '',
    recipient_address: '',
    memo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      const companyId = profile?.company_id;
      if (!companyId) throw new Error('회사 정보를 찾을 수 없습니다.');

      // 1. Create Shipment
      const clientId = selectedItems[0]?.client_id;
      
      const shipmentNo = `SHP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          company_id: companyId,
          client_id: clientId,
          shipment_no: shipmentNo,
          status: 'shipped',
          courier: formData.courier,
          tracking_no: formData.tracking_no,
          recipient_name: formData.recipient_name,
          recipient_contact: formData.recipient_contact,
          recipient_address: formData.recipient_address,
          memo: formData.memo,
          shipped_at: new Date().toISOString(),
          created_by: user.id
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // 2. Create Shipment Items
      const shipmentItems = selectedItems.map(item => ({
        company_id: companyId,
        shipment_id: shipment.id,
        order_item_id: item.id,
        quantity: item.shippable_qty
      }));

      const { error: itemsError } = await supabase
        .from('shipment_items')
        .insert(shipmentItems);

      if (itemsError) throw itemsError;

      // 3. Update order_items production_status to 'COMPLETED'
      const itemIds = selectedItems.map(i => i.id);
      const now = new Date().toISOString();
      const { error: updateItemsError } = await supabase
        .from('order_items')
        .update({ production_status: 'COMPLETED', updated_at: now })
        .in('id', itemIds);
      if (updateItemsError) throw updateItemsError;

      // 4. Update orders shipping_status and status if all items completed
      const orderIds = [...new Set(selectedItems.map(i => i.order_id))];
      
      for (const orderId of orderIds) {
        const { data: allItems } = await supabase
          .from('order_items')
          .select('id, production_status')
          .eq('order_id', orderId);

        const allCompleted = allItems && allItems.length > 0 && allItems.every(i => i.production_status === 'COMPLETED' || i.production_status === 'CANCELLED');

        await supabase
          .from('orders')
          .update({ 
            shipping_status: allCompleted ? 'shipped' : 'partially_shipped',
            status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            updated_at: now
          })
          .eq('id', orderId);
      }

      toast.success('출하가 성공적으로 등록되었습니다.');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('출하 등록 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl bg-bg-elevated border-border-default shadow-2xl flex flex-col max-h-[90vh]">
        <CardHeader className="py-4 border-b border-border-default flex flex-row items-center justify-between shrink-0">
          <CardTitle>출하 등록</CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-bg-surface rounded-full text-text-secondary">
            <X size={20} />
          </button>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="shipment-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selected Items Summary */}
            <div className="bg-bg-surface p-4 rounded-lg border border-border-default">
              <h3 className="font-bold text-sm text-text-primary mb-3">출하 대상 품목 ({selectedItems.length}건)</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b border-border-default pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-text-primary">{item.part_name} <span className="text-text-secondary">({item.part_no})</span></div>
                      <div className="text-xs text-text-secondary mt-0.5">{item.client_name} / {item.po_no}</div>
                    </div>
                    <div className="font-bold text-brand-500">
                      {item.shippable_qty}개
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">수령인 (회사명/담당자)</label>
                <BaseInput 
                  required
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                  placeholder="예: 알파산업 담당자"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">연락처</label>
                <BaseInput 
                  value={formData.recipient_contact}
                  onChange={(e) => setFormData({...formData, recipient_contact: e.target.value})}
                  placeholder="예: 010-1234-5678"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">배송지 주소</label>
                <BaseInput 
                  value={formData.recipient_address}
                  onChange={(e) => setFormData({...formData, recipient_address: e.target.value})}
                  placeholder="배송지 상세 주소 입력"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">택배사 / 화물</label>
                <BaseInput 
                  value={formData.courier}
                  onChange={(e) => setFormData({...formData, courier: e.target.value})}
                  placeholder="예: 경동택배, 용달"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">송장 번호</label>
                <BaseInput 
                  value={formData.tracking_no}
                  onChange={(e) => setFormData({...formData, tracking_no: e.target.value})}
                  placeholder="송장 번호 입력"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">전달 메모</label>
                <BaseInput 
                  value={formData.memo}
                  onChange={(e) => setFormData({...formData, memo: e.target.value})}
                  placeholder="배송 기사님이나 수령인에게 남길 메모"
                />
              </div>
            </div>

          </form>
        </CardContent>

        <div className="p-4 border-t border-border-default flex justify-end gap-2 bg-bg-surface shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button type="submit" form="shipment-form" variant="primary" disabled={loading}>
            {loading ? '등록 중...' : '출하 등록'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
