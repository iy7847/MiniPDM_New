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
  const result = await apiRequest('/api/eval', 'POST', {
    code: `
      (async () => {
        try {
          // getOrderWithItems 쿼리를 supabase로 직접 재현
          // Vite 모듈 임포트 대신 window.fetch로 supabase 직접 조회
          const session = JSON.parse(localStorage.getItem('minipdm_auth_session') || '{}');
          const token = session.access_token;
          const url = 'https://rbirnrvjmjztjmsorlgm.supabase.co/rest/v1/orders?id=eq.c0add03b-67fb-4c37-b7e7-42f432967904&select=*,clients:client_id(id,name),estimates:estimate_id(id,base_exchange_rate,currency),order_items(*,materials:material_id(code),files(*),estimate_items:estimate_item_id(*,files(*),post_processings:post_processing_id(name),heat_treatments:heat_treatment_id(name)))';
          
          const resp = await fetch(url, {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaXJucnZqbWp6dGptc29ybGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDcwMzUsImV4cCI6MjA4MTU4MzAzNX0.vmQPRDtWRkQIl3_EweFFHuAbPNatL_9vEytTCnQEy6Q',
              'Authorization': 'Bearer ' + token
            }
          });
          const json = await resp.json();
          return { status: resp.status, data: json };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `
  });
  console.log('직접 fetch 결과:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
