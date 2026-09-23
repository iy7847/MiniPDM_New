import fs from 'fs';
import path from 'path';

const srcDir = 'D:/06_Coding/AntiGravity/React3DViewer/public';
const destDir = path.resolve('public');

const files = ['occt-import-js.wasm', 'occt-import-js.js'];

for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log(`Copied ${file} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) to ${dest}`);
}
console.log('Done copying WASM assets!');
