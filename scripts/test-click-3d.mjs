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
  console.log('Clicking 3D button...');
  const clickRes = await post('/api/eval', {
    code: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn3d = buttons.find(b => b.textContent.includes('3D'));
        if (btn3d) {
          btn3d.click();
          return { ok: true, text: btn3d.textContent };
        }
        return { ok: false, error: '3D button not found' };
      })()
    `
  });
  console.log('Click res:', clickRes);

  setTimeout(async () => {
    const snap = await post('/api/screenshot', { targetPath: 'D:/06_Coding/AntiGravity/MiniPDM_New/tests/screenshots/12_cad_modal_open.png' });
    console.log('Snap:', snap);
  }, 2000);
}

run().catch(console.error);
