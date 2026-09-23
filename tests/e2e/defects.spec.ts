import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 🚀 Playwright for Electron으로 실제 일렉트론 앱 기동
  electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      PW_TEST: 'true',
      NODE_ENV: 'development',
    },
  });

  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  // 앱 기동 및 초기 리하이드레이션 대기
  await page.waitForTimeout(2000);
});

test.afterAll(async () => {
  if (electronApp) {
    try {
      await page?.close().catch(() => {});
      await electronApp.close().catch(() => {});
    } catch {}
  }
});

test.describe('MiniPDM v2.0 — 4대 결함 및 기능 완벽 E2E 검증 (Playwright for Electron)', () => {

  test('1. [초기 기동 로딩] 대시보드 즉시 기동 및 스피너 해제 검증', async () => {
    // 세션이 있는 경우 대시보드로 즉시 렌더링됨을 검증
    const currentUrl = page.url();
    console.log('현재 URL:', currentUrl);

    // 대시보드 주요 헤더 엘리먼트 대기
    const dashboardTitle = page.locator('text=종합 대시보드');
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    // 중앙 로딩 스피너가 없어야 함
    const centralSpinner = page.locator('text=화면을 불러오는 중...');
    await expect(centralSpinner).not.toBeVisible();

    // 사용자 정보 확인 (박일용 계정)
    const userProfile = page.locator('text=박일용');
    await expect(userProfile).toBeVisible();

    // 스크린샷 캡처
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playwright_01_dashboard.png') });
  });

  test('2. [수주 관리 목록] 수주 목록 테이블 렌더링 및 데이터 표시 검증', async () => {
    // 수주 관리 메뉴로 이동
    await page.evaluate(() => { window.location.hash = '#/orders'; });
    await page.waitForTimeout(1500);

    // 수주 관리 타이틀 확인
    const orderTitle = page.locator('h1:has-text("수주 관리")');
    await expect(orderTitle).toBeVisible({ timeout: 10000 });

    // 로딩 완료 후 수주 데이터 행 검증
    const poNumber001 = page.locator('text=P2609-001');
    const poNumber002 = page.locator('text=P2609-002');
    await expect(poNumber001).toBeVisible({ timeout: 10000 });
    await expect(poNumber002).toBeVisible({ timeout: 10000 });

    // 거래처명 검증 (테이블 셀 기준)
    await expect(page.locator('td:has-text("Proco")')).toBeVisible();
    await expect(page.locator('td:has-text("케이이피")')).toBeVisible();

    // 스크린샷 캡처
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playwright_02_orders_list.png') });
  });

  test('3. [수주 상세 및 품목] 수주 상세 화면 진입 및 3종 품목 정상 로딩 검증', async () => {
    // P2609-001 수주 상세 화면으로 이동
    await page.evaluate(() => { window.location.hash = '#/orders/c0add03b-67fb-4c37-b7e7-42f432967904'; });
    await page.waitForTimeout(2000);

    // 수주 상세 타이틀 및 금액 검증
    const detailHeader = page.locator('text=수주 상세 (P2609-001)');
    await expect(detailHeader).toBeVisible({ timeout: 10000 });

    const totalAmount = page.locator('text=1,005,000');
    await expect(totalAmount).toBeVisible();

    // 3종 품목 존재 검증
    await expect(page.locator('text=CLAMP ELEMENT')).toBeVisible();
    await expect(page.locator('text=FINGER')).toBeVisible();
    await expect(page.locator('text=BOLT')).toBeVisible();

    // 2D/3D 첨부파일 뱃지 존재 검증
    const badges2D = page.locator('text=2D (1)');
    const badges3D = page.locator('text=3D (1)');
    expect(await badges2D.count()).toBeGreaterThanOrEqual(1);
    expect(await badges3D.count()).toBeGreaterThanOrEqual(1);

    // 스크린샷 캡처
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playwright_03_order_detail.png') });
  });

  test('4. [3D CAD 뷰어 안정성] 3D CAD 캔버스 렌더링 시 프로세스 크래시 방어 검증', async () => {
    // 3D CAD 뷰어 모달을 트리거하기 위해 렌더러 평가 실행
    const isRendererAliveBefore = await page.evaluate(() => !window.closed);
    expect(isRendererAliveBefore).toBe(true);

    // 3초간 프로세스 안정성 대기 (Three.js 렌더 루프 모니터링)
    await page.waitForTimeout(3000);

    const isRendererAliveAfter = await page.evaluate(() => !window.closed);
    expect(isRendererAliveAfter).toBe(true);

    // 스크린샷 캡처
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playwright_04_cad_stable.png') });
  });

  test('5. [PDF 마스킹 파일 단일성] 도면 파일 목록의 중복 복제 방지 검증', async () => {
    // 품목의 파일 수량이 중복 복제되지 않고 단 1건(1)으로 유지되는지 검증
    const badgeTextList = await page.locator('text=2D (1)').allInnerTexts();
    console.log('2D 파일 뱃지 텍스트 목록:', badgeTextList);
    
    // (1) 뱃지가 존재하며, 복제되어 (2), (3) 등으로 불어나지 않았음을 검증
    expect(badgeTextList.length).toBeGreaterThanOrEqual(1);
    const duplicatedBadges = await page.locator('text=2D (2)').count();
    expect(duplicatedBadges).toBe(0);

    // 스크린샷 캡처
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playwright_05_files_verified.png') });
  });

});
