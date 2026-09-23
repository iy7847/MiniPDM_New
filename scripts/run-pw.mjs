import { spawn } from 'child_process';

const pw = spawn('npx.cmd', ['playwright', 'test', '--reporter=list'], {
  shell: true,
  cwd: process.cwd()
});

pw.stdout.on('data', d => process.stdout.write(d));
pw.stderr.on('data', d => process.stderr.write(d));

pw.on('exit', (code) => {
  console.log('\nPlaywright finished with code:', code);
  process.exit(code || 0);
});
