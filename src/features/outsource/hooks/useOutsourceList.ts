import { useState, useEffect } from 'react';
import { supabase } from '@/shared/services/supabase';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { toast } from '@/shared/stores/useToastStore';

export interface OutsourceOrder {
  id: string;
  po_no?: string; // from order_items
  order_item_id: string;
  supplier_id: string;
  supplier_name: string;
  process_name: string;
  quantity: number;
  status: string;
  order_date: string;
  expected_date?: string;
  order_items: {
    id: string;
    part_name: string;
    part_no: string;
    spec: string;
    material_name?: string;
    files: any[];
  };
}

export function useOutsourceList() {
  const [orders, setOrders] = useState<OutsourceOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('outsource_orders')
        .select(`
          id, order_item_id, supplier_id, supplier_name, process_name, quantity, status, order_date, expected_date,
          order_items ( id, part_name, part_no, spec, material_name, files ( id, file_name, file_path, original_name ) )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setOrders([]);
      } else {
        // Map data to ensure files is an array (even if empty) and map po_no if it exists via join or otherwise
        const mapped = data.map((d: any) => ({
          ...d,
          po_no: d.id.substring(0, 8).toUpperCase(), // Using ID prefix as pseudo PO if we don't have a real one joined
          order_items: {
            ...d.order_items,
            files: Array.isArray(d.order_items?.files) ? d.order_items.files : []
          }
        }));
        setOrders(mapped as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const sendEmail = async (order: OutsourceOrder) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const itemName = order.order_items?.part_name || '알 수 없는 품목';
      const itemSpec = order.order_items?.spec || '';
      const qty = order.quantity;

      // Use files that were fetched with the list
      const filesData = order.order_items?.files || [];

      // 2. Upload files to Cloudflare R2
      const downloadLinks: { name: string, url: string }[] = [];
      
      if (filesData && filesData.length > 0) {
        // Initialize S3 client for Cloudflare R2
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
            secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
          },
        });

        for (const file of filesData) {
          try {
            const filePath = file.file_path || file.name;
            if (!filePath) continue;
            
            // Read local file using IPC
            const res = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
            if (!res.success) {
              console.warn('Failed to read file:', filePath, res.error);
              continue;
            }

            const buffer = res.data;
            const originalName = file.original_name || file.file_name || 'document';
            const fileKey = `orders/${order.id}/${Date.now()}-${originalName}`;

            // Upload to R2
            await s3.send(new PutObjectCommand({
              Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
              Key: fileKey,
              Body: new Uint8Array(buffer),
            }));

            // Public URL
            const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileKey}`;
            downloadLinks.push({ name: originalName, url: publicUrl });
            
          } catch (uploadErr) {
            console.error('Error uploading file to R2:', uploadErr);
          }
        }
      }

      // Format item_details with HTML br instead of \n to fix Naver Mail issue
      const itemDetailsHtml = `품명: ${itemName}<br/>규격: ${itemSpec}<br/>수량: ${qty}개<br/>공정: ${order.process_name}`;

      const payload = {
        outsource_order_id: order.id,
        supplier_email: user?.email || 'test@gmail.com', // 테스트를 위해 로그인한 사용자 본인에게 발송
        supplier_name: order.supplier_name || '미지정 업체',
        item_details: itemDetailsHtml,
        public_url: `https://minipdm.app/shared/order/${order.id}`,
        user_email: user?.email || 'noreply@minipdm.app',
        company_name: '한국가공(주)',
        download_links: downloadLinks
      };

      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: payload
      });
        
      if (error) throw error;
      
      toast.success(`${order.supplier_name || '업체'}에게 발주 메일을 성공적으로 발송했습니다.`);
      
      // 목록 새로고침
      fetchOrders();
    } catch (err: any) {
      toast.error('메일 발송 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendBatchEmails = async (orderIds: string[]) => {
    // 발송 가능한 오더 필터링
    const targetOrders = orders.filter(o => orderIds.includes(o.id) && o.status === '발주대기');
    if (targetOrders.length === 0) return { success: false, error: '발송 가능한(발주대기) 항목이 없습니다.' };

    try {
      setLoading(true);
      for (const order of targetOrders) {
        // 병렬 또는 순차 발송, 여기서는 순차 발송으로 구현하여 R2 리미트 이슈 방지
        await sendEmail(order);
      }
      return { success: true, count: targetOrders.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
      fetchOrders();
    }
  };

  const undoBatchOrders = async (orderIds: string[]) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('outsource_orders')
        .update({ status: '발주대기' })
        .in('id', orderIds);

      if (error) throw error;
      return { success: true, count: orderIds.length };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
      fetchOrders();
    }
  };

  return { orders, loading, sendEmail, sendBatchEmails, fetchOrders, undoBatchOrders };
}
