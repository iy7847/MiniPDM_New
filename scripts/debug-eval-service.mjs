import http from 'http';

function apiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, 'http://127.0.0.1:49152');
    const req = http.request(url, {
      method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const res = await apiRequest('/api/eval', 'POST', {
    code: `
      (async () => {
        try {
          const mod = await import('/src/features/orders/services/orderService.ts');
          const data = await mod.getOrderWithItems('c0add03b-67fb-4c37-b7e7-42f432967904');
          return { ok: true, poNo: data.po_no, itemsCount: data.order_items?.length };
        } catch (e) {
          return { ok: false, error: e.message, stack: e.stack };
        }
      })()
    `
  });
  console.log('결과:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
