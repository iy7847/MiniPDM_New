import type { Order, OrderItem } from '../types';

export function exportOrderItemsToExcel(order: Order, items: OrderItem[]) {
  const headers = ['NO', '품번(Part No)', '품명(Part Name)', '규격(Spec)', '소재명', '수량', '단가', '공급가액', '납기일', '생산상태'];

  const rows = items.map((item, idx) => {
    const qty = item.quantity || item.qty || 1;
    const price = item.unit_price || 0;
    const supply = Math.ceil(price * qty);

    return [
      idx + 1,
      `"${item.part_no || ''}"`,
      `"${item.part_name || ''}"`,
      `"${item.spec || ''}"`,
      `"${item.material_name || ''}"`,
      qty,
      price,
      supply,
      `"${item.due_date || order.delivery_date || ''}"`,
      `"${item.production_status || 'PENDING'}"`
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  // Add UTF-8 BOM for Excel Korean support
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `수주내역_${order.po_no || order.order_number}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
