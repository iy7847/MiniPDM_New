import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('tests/screenshots');
const destDir = 'C:/Users/박일용/.gemini/antigravity/brain/ee36c275-a781-45f0-b1ff-579e5a6335b2';

const files = [
  'playwright_01_dashboard.png',
  'playwright_02_orders_list.png',
  'playwright_03_order_detail.png',
  'playwright_04_cad_stable.png',
  'playwright_05_files_verified.png'
];

files.forEach(f => {
  const src = path.join(srcDir, f);
  const dest = path.join(destDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${f}`);
  }
});
