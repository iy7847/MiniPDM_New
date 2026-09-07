import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pngPath = path.join(rootDir, 'public', 'kep_logo.png');
const buildDir = path.join(rootDir, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 1. Read PNG header to inspect size
const buf = fs.readFileSync(pngPath);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`Input PNG Dimensions: ${width}x${height}, Size: ${(buf.length / 1024).toFixed(1)} KB`);

// 2. Copy to build/icon.png
const targetPng = path.join(buildDir, 'icon.png');
fs.copyFileSync(pngPath, targetPng);
console.log(`Copied PNG to: ${targetPng}`);

// 3. Create Windows Vista+ PNG-embedded ICO file
// ICONDIR header (6 bytes): reserved (0), type (1 = icon), count (1)
const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0); // reserved
iconDir.writeUInt16LE(1, 2); // type 1 = ICO
iconDir.writeUInt16LE(1, 4); // 1 image

// ICONDIRENTRY (16 bytes):
// width (1 byte, 0 = 256), height (1 byte, 0 = 256), colorCount (1 byte, 0), reserved (1 byte, 0)
// planes (2 bytes, 1), bitCount (2 bytes, 32), bytesInRes (4 bytes), imageOffset (4 bytes = 6 + 16 = 22)
const iconEntry = Buffer.alloc(16);
const wByte = width >= 256 ? 0 : width;
const hByte = height >= 256 ? 0 : height;
iconEntry.writeUInt8(wByte, 0);
iconEntry.writeUInt8(hByte, 1);
iconEntry.writeUInt8(0, 2); // colors
iconEntry.writeUInt8(0, 3); // reserved
iconEntry.writeUInt16LE(1, 4); // color planes
iconEntry.writeUInt16LE(32, 6); // bits per pixel
iconEntry.writeUInt32LE(buf.length, 8); // image data size
iconEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([iconDir, iconEntry, buf]);

const targetIco = path.join(buildDir, 'icon.ico');
fs.writeFileSync(targetIco, icoBuffer);
console.log(`Created Windows ICO at: ${targetIco} (${(icoBuffer.length / 1024).toFixed(1)} KB)`);

const publicIco = path.join(rootDir, 'public', 'favicon.ico');
fs.writeFileSync(publicIco, icoBuffer);
console.log(`Created Public Favicon ICO at: ${publicIco}`);
