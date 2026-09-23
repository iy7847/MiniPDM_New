import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. .env 파일 파싱
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
      }
    }
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };

const accountId = env.VITE_R2_ACCOUNT_ID || env.R2_ACCOUNT_ID;
const accessKeyId = env.VITE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID;
const secretAccessKey = env.VITE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
const bucketName = env.VITE_R2_BUCKET_NAME || env.R2_BUCKET_NAME || 'minipdm-storage';
const publicUrl = env.VITE_R2_PUBLIC_URL || 'https://storage.kendp.com';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Cloudflare R2 인증 정보가 .env에 설정되어 있지 않습니다.');
  process.exit(1);
}

// 2. S3 클라이언트 초기화 (Cloudflare R2)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  const releaseDir = path.join(rootDir, 'release');
  if (!fs.existsSync(releaseDir)) {
    console.error(`❌ release 디렉터리를 찾을 수 없습니다: ${releaseDir}`);
    console.log('먼저 "npm run build" 명령어로 앱을 패키징해주세요.');
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const currentVersion = pkgJson.version;
  console.log(`📌 현재 릴리즈 버전: v${currentVersion}`);

  const allFiles = fs.readdirSync(releaseDir);
  // 업로드 대상 파일: latest.yml, 현재 버전의 *.exe 및 *.blockmap
  const targetFiles = allFiles.filter(f => 
    f === 'latest.yml' || 
    (f.includes(currentVersion) && (f.endsWith('.exe') || f.endsWith('.blockmap')))
  );

  if (targetFiles.length === 0) {
    console.warn('⚠️ release 폴더에 업로드할 파일(latest.yml, *.exe, *.blockmap)이 없습니다.');
    return;
  }

  console.log('====================================================');
  console.log('🚀 MiniPDM 자동 업데이트 패키지 R2 배포 시작');
  console.log(`📦 대상 버킷: ${bucketName}`);
  console.log(`🌐 공개 베이스 URL: ${publicUrl}/updates/`);
  console.log(`📁 업로드 대상 파일 수: ${targetFiles.length}개`);
  console.log('====================================================\n');

  for (const file of targetFiles) {
    const filePath = path.join(releaseDir, file);
    const fileStream = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);
    const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);

    const s3Key = `updates/${file}`;

    // Content-Type & Content-Disposition 결정
    let contentType = 'application/octet-stream';
    let contentDisposition = undefined;

    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      contentType = 'text/yaml; charset=utf-8';
    } else if (file.endsWith('.exe')) {
      contentType = 'application/x-msdownload';
      contentDisposition = `attachment; filename="${encodeURIComponent(file)}"`;
    }

    console.log(`⏳ 업로드 중: ${file} (${fileSizeMB} MB) -> ${s3Key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
        ContentLength: stat.size,
        ...(contentDisposition ? { ContentDisposition: contentDisposition } : {}),
      });

      await s3.send(command);
      console.log(`✅ 완료: ${publicUrl}/${s3Key}`);
    } catch (err) {
      console.error(`❌ ${file} 업로드 실패:`, err.message);
      process.exit(1);
    }
  }

  // 4. 공식 다운로드 웹페이지(Landing Page) 업로드 (버전 자동 동기화)
  const landingHtmlPath = path.join(__dirname, 'landing', 'index.html');
  if (fs.existsSync(landingHtmlPath)) {
    console.log('\n📄 KEP 공식 다운로드 랜딩 웹페이지 업로드 중...');
    let htmlContent = fs.readFileSync(landingHtmlPath, 'utf8');
    // 버전 번호 및 다운로드 파일 링크 자동 동기화
    htmlContent = htmlContent.replace(/MiniPDM%20Setup%20[\d.]+\.exe/g, `MiniPDM%20Setup%20${currentVersion}.exe`);
    htmlContent = htmlContent.replace(/\(v[\d.]+\)/g, `(v${currentVersion})`);
    htmlContent = htmlContent.replace(/공식 정식 릴리즈 v[\d.]+/g, `공식 정식 릴리즈 v${currentVersion}`);

    const landingBuffer = Buffer.from(htmlContent, 'utf8');
    const landingKeys = ['index.html', 'updates/index.html', 'download/index.html'];
    
    for (const key of landingKeys) {
      try {
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: landingBuffer,
          ContentType: 'text/html; charset=utf-8',
          ContentLength: landingBuffer.length,
        }));
        console.log(`✅ 랜딩 페이지 배포: ${publicUrl}/${key}`);
      } catch (err) {
        console.warn(`⚠️ 랜딩 페이지(${key}) 업로드 실패:`, err.message);
      }
    }
  }

  // 5. KEP 공식 로고 이미지 에셋 업로드
  const logoPath = path.join(rootDir, 'public', 'kep_logo.png');
  if (fs.existsSync(logoPath)) {
    console.log('\n🖼️ KEP 공식 브랜드 로고 이미지 업로드 중...');
    const logoKeys = ['kep_logo.png', 'updates/kep_logo.png', 'download/kep_logo.png'];
    for (const key of logoKeys) {
      try {
        const logoStream = fs.createReadStream(logoPath);
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: logoStream,
          ContentType: 'image/png',
        }));
        console.log(`✅ 브랜드 로고 배포: ${publicUrl}/${key}`);
      } catch (err) {
        console.warn(`⚠️ 브랜드 로고(${key}) 업로드 실패:`, err.message);
      }
    }
  }

  console.log('\n🎉 모든 업데이트 파일, 랜딩 페이지 및 브랜드 로고가 Cloudflare R2에 성공적으로 배포되었습니다!');
  console.log(`🔗 공식 다운로드 페이지: ${publicUrl}/index.html`);
  console.log(`🔗 자동 업데이트 엔드포인트: ${publicUrl}/updates/latest.yml`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
