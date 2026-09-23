import fs from 'fs';
import path from 'path';

const srcDir = 'D:\\06_Coding\\AntiGravity\\React3DViewer\\dist\\samples';
const destDir = 'D:\\06_Coding\\AntiGravity\\MiniPDM_New\\public\\samples';

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.readdirSync(srcDir).forEach(file => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    console.log(`Copied sample: ${file}`);
  });
}
