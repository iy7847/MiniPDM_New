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
  const evalRes = await apiRequest('/api/eval', 'POST', {
    code: `
      (() => {
        const cached = localStorage.getItem('minipdm_cached_profile');
        const session = localStorage.getItem('minipdm_auth_session');
        return {
          profile: cached ? JSON.parse(cached) : null,
          hasSession: !!session
        };
      })()
    `
  });
  console.log('현재 세션 상태:', JSON.stringify(evalRes, null, 2));

  // 현재 orders 테이블 조회
  const ordersCheck = await apiRequest('/api/eval', 'POST', {
    code: `
      (async () => {
        // window.__SUPABASE__ 또는 직접 fetch
        const profile = JSON.parse(localStorage.getItem('minipdm_cached_profile') || '{}');
        return { companyId: profile.company_id };
      })()
    `
  });
  console.log('Company ID:', ordersCheck);
}

main().catch(console.error);
