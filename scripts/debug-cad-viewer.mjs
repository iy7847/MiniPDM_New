import { _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function debugCadViewer() {
  console.log('===============================================================');
  console.log('🔍 CadViewer 자동 종료 버그 재현 및 추적 디버깅 스크립트 시작');
  console.log('===============================================================\n');

  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      PW_TEST: 'true',
      NODE_ENV: 'development',
    },
  });

  const page = await app.firstWindow();

  // 브라우저 모든 콘솔 및 에러 리스너 등록
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('🚨 [Browser Uncaught Exception]:', err.message, err.stack);
  });

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // 대시보드 로딩 확인
  await page.waitForSelector('text=종합 대시보드', { timeout: 10000 });
  console.log('대시보드 기동 확인 완료.');

  // Supabase에서 견적 조회
  const estimateInfo = await page.evaluate(async () => {
    try {
      const res = await fetch('https://vdohfepwugxomjfeveea.supabase.co/rest/v1/estimates?select=id,project_name,created_at&order=created_at.desc&limit=10', {
        headers: {
          'apikey': window.__SUPABASE_ANON_KEY__ || '',
          'Authorization': `Bearer ${window.__SUPABASE_ANON_KEY__ || ''}`
        }
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('REST 조회 결과:', estimateInfo);

  // 견적 목록 페이지로 이동
  console.log('1. 견적 목록(#/estimates) 이동...');
  await page.evaluate(() => { window.location.hash = '#/estimates'; });
  await page.waitForTimeout(3000);

  const shotList = path.join(SCREENSHOT_DIR, 'debug_00_estimates_list.png');
  await page.screenshot({ path: shotList });
  console.log('   📸 견적 목록 스크린샷 저장:', shotList);

  // 테이블 행 또는 링크 찾기
  const targetLink = page.locator('text=EST-EF0311D7').first();
  const anyEstLink = page.locator('a[href*="/estimates/"], tr td:has-text("EST-")').first();

  if (await targetLink.isVisible()) {
    console.log('   EST-EF0311D7 발견! 클릭...');
    await targetLink.click();
  } else if (await anyEstLink.isVisible()) {
    console.log('   EST- 항목 발견! 클릭...');
    await anyEstLink.click();
  } else {
    console.log('   직접 행 클릭 시도...');
    await page.locator('tbody tr').first().click();
  }

  await page.waitForTimeout(3000);
  console.log('   현재 URL:', page.url());

  const shotDetail = path.join(SCREENSHOT_DIR, 'debug_01_estimate_detail.png');
  await page.screenshot({ path: shotDetail });
  console.log('   📸 견적 상세 스크린샷 저장:', shotDetail);

  // 3D 뱃지 확인
  console.log('2. 3D 뱃지 탐색...');
  const badge3D = page.locator('text=3D').first();
  
  if (await badge3D.isVisible()) {
    console.log('   3D 뱃지 발견! 클릭...');
    await badge3D.click();
  } else {
    console.log('   ❌ 3D 뱃지를 찾을 수 없습니다.');
    await app.close();
    return;
  }

  await page.waitForTimeout(1000);

  const shotModalOpen = path.join(SCREENSHOT_DIR, 'debug_02_cad_modal_open.png');
  await page.screenshot({ path: shotModalOpen });
  console.log('   📸 뱃지 클릭 직후 스크린샷 저장:', shotModalOpen);

  console.log('3. 1초 간격으로 10초 동안 뷰어 모달 생존 여부 모니터링...');
  for (let sec = 1; sec <= 10; sec++) {
    await page.waitForTimeout(1000);
    const canvasCount = await page.locator('canvas').count();
    const isModalVisible = canvasCount > 0;

    console.log(`   [${sec}초 경과] 캔버스 개수: ${canvasCount}, 뷰어 유지 여부: ${isModalVisible ? '✅ 유지 중' : '❌ 소멸/종료됨'}`);

    if (!isModalVisible && sec > 1) {
      console.log(`   🚨 [버그 재현!] ${sec}초 시점에 3D CAD 뷰어가 자동으로 종료(소멸)되었습니다!`);
      const shotClosed = path.join(SCREENSHOT_DIR, `debug_03_cad_modal_closed_at_${sec}s.png`);
      await page.screenshot({ path: shotClosed });
      console.log('   📸 종료 시점 스크린샷 저장:', shotClosed);
      break;
    }

    if (sec === 5) {
      const shot5s = path.join(SCREENSHOT_DIR, 'debug_04_cad_alive_at_5s.png');
      await page.screenshot({ path: shot5s });
      console.log('   📸 5초 시점 스크린샷 저장:', shot5s);
    }
  }

  console.log('\n디버깅 완료, 일렉트론 종료 중...');
  try {
    await app.close();
  } catch {}
}

debugCadViewer().catch(err => {
  console.error('디버그 스크립트 실행 오류:', err);
  process.exit(1);
});
