import http from 'http';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:49152' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  const hash = process.argv[2] || '#/orders';
  const snapName = process.argv[3] || 'orders_table_live.png';

  console.log(`Navigating to ${hash}...`);
  const nav = await post('/api/navigate', { hash });
  console.log('Nav:', nav);

  setTimeout(async () => {
    const snap = await post('/api/screenshot', { targetPath: `D:/06_Coding/AntiGravity/MiniPDM_New/tests/screenshots/${snapName}` });
    console.log('Snap:', snap);
  }, 1500);
}

run().catch(console.error);
