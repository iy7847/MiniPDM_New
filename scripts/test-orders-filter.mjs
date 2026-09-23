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
          const session = JSON.parse(localStorage.getItem('minipdm_auth_session') || '{}');
          const token = session.access_token;
          const companyId = '269355b0-7e60-40a5-84bd-acf30da807a6';
          
          // getOrdersWithFilters 쿼리 테스트
          const url = 'https://rbirnrvjmjztjmsorlgm.supabase.co/rest/v1/orders?company_id=eq.' + companyId + '&select=*,clients:client_id(id,name),estimates:estimate_id(id,project_name),order_items(count)&order=created_at.desc';
          
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
  console.log('수주 목록 fetch 결과:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
