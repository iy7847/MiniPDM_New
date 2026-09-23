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
      (() => {
        const session = localStorage.getItem('minipdm_auth_session');
        const storageKeys = Object.keys(localStorage);
        return {
          hasSession: !!session,
          storageKeys
        };
      })()
    `
  });
  console.log('Auth check:', result);
}

main().catch(console.error);
