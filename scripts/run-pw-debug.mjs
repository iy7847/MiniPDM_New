import { execSync } from 'child_process';

try {
  const out = execSync('node ./node_modules/@playwright/test/cli.js test --reporter=list', {
    encoding: 'utf-8',
    cwd: process.cwd()
  });
  console.log('OUTPUT:\n', out);
} catch (e) {
  console.log('=== STDOUT ===\n', e.stdout);
  console.log('=== STDERR ===\n', e.stderr);
  console.log('=== ERROR MESSAGE ===\n', e.message);
}
