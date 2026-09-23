import fs from 'fs';
import path from 'path';

const srcDir = 'D:\\06_Coding\\AntiGravity\\React3DViewer\\src\\cad-viewer';
const destDir = 'D:\\06_Coding\\AntiGravity\\MiniPDM_New\\src\\shared\\components\\cad-viewer';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  console.log(`Copying from ${srcDir} to ${destDir}...`);
  copyRecursiveSync(srcDir, destDir);
  console.log('Copy complete!');
} catch (err) {
  console.error('Copy failed:', err);
  process.exit(1);
}
