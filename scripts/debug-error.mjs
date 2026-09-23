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
  const logs = await apiRequest('/api/logs');
  console.log('최근 콘솔 로그:', JSON.stringify(logs, null, 2));
}

main().catch(console.error);
