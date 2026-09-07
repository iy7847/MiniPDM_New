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

  // Create real 1024x1024 PNG
  const pngBase64_1024 = await page.evaluate(async (uri) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 1024, 1024);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = uri;
    });
  }, dataUri);

  // Create real 256x256 PNG for ICO
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

  const realPng1024 = Buffer.from(pngBase64_1024, 'base64');
  const realPng256 = Buffer.from(pngBase64_256, 'base64');

  // Verify PNG signature (0x89 0x50 0x4E 0x47)
  console.log('1024 PNG Signature:', realPng1024.slice(0, 4).toString('hex')); // should be 89504e47
  console.log('1024 Width:', realPng1024.readUInt32BE(16), 'Height:', realPng1024.readUInt32BE(20));

  // Save to public/kep_logo.png
  fs.writeFileSync(path.join(rootDir, 'public', 'kep_logo.png'), realPng1024);
  console.log('Saved real 1024x1024 PNG to public/kep_logo.png');

  // Ensure build/ exists
  const buildDir = path.join(rootDir, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Save to build/icon.png
  fs.writeFileSync(path.join(buildDir, 'icon.png'), realPng1024);
  console.log('Saved real 1024x1024 PNG to build/icon.png');

  // Create standard Windows 256x256 ICO file using genuine PNG data
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0); // reserved
  iconDir.writeUInt16LE(1, 2); // type 1 = ICO
  iconDir.writeUInt16LE(1, 4); // 1 image

  const iconEntry = Buffer.alloc(16);
  iconEntry.writeUInt8(0, 0); // 256px width
  iconEntry.writeUInt8(0, 1); // 256px height
  iconEntry.writeUInt8(0, 2); // colors
  iconEntry.writeUInt8(0, 3); // reserved
  iconEntry.writeUInt16LE(1, 4); // color planes
  iconEntry.writeUInt16LE(32, 6); // bits per pixel
  iconEntry.writeUInt32LE(realPng256.length, 8); // image data size
  iconEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([iconDir, iconEntry, realPng256]);

  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  console.log('Saved real 256x256 ICO to build/icon.ico');

  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoBuffer);
  console.log('Saved real 256x256 ICO to public/favicon.ico');
}

main().catch(console.error);
