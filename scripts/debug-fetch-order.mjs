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
          // getOrderWithItems 직접 실행 (supabase 클라이언트 이용)
          const session = JSON.parse(localStorage.getItem('minipdm_auth_session') || '{}');
          return {
            hash: window.location.hash,
            hasSession: !!session.access_token
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `
  });
  console.log('디버그 결과:', res);
}

main().catch(console.error);
