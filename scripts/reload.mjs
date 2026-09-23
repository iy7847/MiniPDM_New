import http from 'http';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:49152' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch { resolve(b); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Reloading electron window...');
  const res = await post('/api/eval', {
    code: 'window.location.reload(); "reloading";'
  });
  console.log('Reload res:', res);
}

main().catch(console.error);
