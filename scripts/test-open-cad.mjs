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
  console.log('1. Finding 3D badge...');
  const badgeRes = await post('/api/eval', {
    code: `
      (() => {
        // '3D' 텍스트를 포함하는 모든 엘리먼트 찾기
        const all = Array.from(document.querySelectorAll('*'));
        const badge = all.find(el => el.textContent && el.textContent.includes('3D') && el.textContent.includes('(1)') && el.getAttribute('title') === '클릭하여 파일 목록 보기');
        if (badge) {
          badge.click();
          return { ok: true, found: 'badge clicked' };
        }
        return { ok: false, error: 'badge not found' };
      })()
    `
  });
  console.log('Badge click:', badgeRes);

  // 팝오버 뜬 화면 스냅샷
  await new Promise(r => setTimeout(r, 600));
  await post('/api/screenshot', { targetPath: 'D:/06_Coding/AntiGravity/MiniPDM_New/tests/screenshots/13_badge_popover.png' });

  // 팝오버 내부 파일 클릭
  console.log('2. Clicking file item in popover...');
  const fileRes = await post('/api/eval', {
    code: `
      (() => {
        const fileItems = Array.from(document.querySelectorAll('*')).filter(el => {
          const t = el.textContent || '';
          return t.includes('.x_t') || t.includes('.stp') || t.includes('.step') || t.includes('306SM014');
        });
        const target = fileItems.find(el => el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'BUTTON');
        if (target) {
          target.click();
          return { ok: true, clicked: target.textContent?.slice(0, 30) };
        }
        return { ok: false, foundCount: fileItems.length };
      })()
    `
  });
  console.log('File click:', fileRes);

  // 1.5초 후 CAD 뷰어 모달 스냅샷
  await new Promise(r => setTimeout(r, 1500));
  await post('/api/screenshot', { targetPath: 'D:/06_Coding/AntiGravity/MiniPDM_New/tests/screenshots/14_cad_viewer_open.png' });
}

run().catch(console.error);
