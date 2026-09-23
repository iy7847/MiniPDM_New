import http from 'http';

http.get('http://127.0.0.1:49152/api/logs', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const errors = (data.logs || []).filter(l => l.level >= 2 || l.message.toLowerCase().includes('error') || l.message.toLowerCase().includes('fail'));
      console.log('--- RECENT ERRORS ---');
      console.log(JSON.stringify(errors.slice(-15), null, 2));
      console.log('--- RECENT ALL LOGS (LAST 30) ---');
      console.log(JSON.stringify((data.logs || []).slice(-30), null, 2));
    } catch (e) {
      console.log('Raw:', body);
    }
  });
}).on('error', console.error);
