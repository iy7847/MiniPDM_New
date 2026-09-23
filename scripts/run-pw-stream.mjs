import { spawn } from 'child_process';
import fs from 'fs';

const logFile = 'tests/playwright-run.log';
fs.writeFileSync(logFile, '=== START ===\n');

const child = spawn('node', ['./node_modules/@playwright/test/cli.js', 'test', '--reporter=list'], {
  cwd: process.cwd(),
  env: { ...process.env, FORCE_COLOR: '0' }
});

child.stdout.on('data', (d) => {
  fs.appendFileSync(logFile, d.toString());
  process.stdout.write(d.toString());
});

child.stderr.on('data', (d) => {
  fs.appendFileSync(logFile, '[ERR] ' + d.toString());
  process.stderr.write(d.toString());
});

child.on('exit', (code) => {
  const msg = `\n=== EXIT CODE: ${code} ===\n`;
  fs.appendFileSync(logFile, msg);
  console.log(msg);
  process.exit(code || 0);
});
