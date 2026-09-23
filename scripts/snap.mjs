import http from 'http';

const req = http.request('http://127.0.0.1:49152/api/screenshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  res.pipe(process.stdout);
});

const targetPath = process.argv[2] || 'D:/06_Coding/AntiGravity/MiniPDM_New/tests/screenshots/current_screen.png';
req.write(JSON.stringify({ targetPath }));
req.end();
