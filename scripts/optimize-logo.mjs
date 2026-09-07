import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  const jpgPath = path.join(rootDir, 'public', 'kep_logo.jpg');
  if (!fs.existsSync(jpgPath)) {
    console.error('No kep_logo.jpg found');
    process.exit(1);
  }

  const jpgBase64 = fs.readFileSync(jpgPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${jpgBase64}`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 256x256 최적화 PNG 생성 (UI용)
  const pngBase64_256 = await page.evaluate(async (uri) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 256, 256);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = uri;
    });
  }, dataUri);

  await browser.close();

  const realPng256 = Buffer.from(pngBase64_256, 'base64');

  // src/assets/kep_logo.png 및 public/kep_logo.png에 최적화된 파일 저장
  const srcAssetsLogo = path.join(rootDir, 'src', 'assets', 'kep_logo.png');
  const publicLogo = path.join(rootDir, 'public', 'kep_logo.png');

  fs.writeFileSync(srcAssetsLogo, realPng256);
  fs.writeFileSync(publicLogo, realPng256);

  console.log(`최적화 완료! 용량: ${(realPng256.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
