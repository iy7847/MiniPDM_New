# 🏛️ MiniPDM v2.0 — 종합 마스터 설계서 (ARCHITECTURE.md)

> **프로젝트 공식 종합 설계서 (Single Source of Truth for Architecture)**  
> 이 문서는 기존의 `DIRECTIVE.md`, `DESIGN.md`, `MINI_MES_PLAN.md`의 모든 기획, 디자인 토큰, 비즈니스 로직, 그리고 최신 개발 진척도를 완벽하게 통합한 단일 마스터 문서입니다.

---

## 1. 🏗️ 프로젝트 개요 및 기술 스택

- **프로젝트명**: MiniPDM v2.0
- **목적**: 소규모 금속 가공 제조업체용 견적·수주·생산·출하 통합관리 데스크톱 애플리케이션
- **신규 앱 경로**: `D:\06_Coding\AntiGravity\MiniPDM_New`
- **기존 앱 경로**: `D:\06_Coding\AntiGravity\MiniPDM` (기능 참조용 레거시, 직접 수정 금지)

### ⚙️ 기술 스택 (Tech Stack)
| 계층 | 기술 | 비고 |
|---|---|---|
| **Platform** | Electron + Vite + React 18 | 데스크톱 최적화 웹앱 |
| **Language** | TypeScript | 엄격한 타입 안정성 유지 |
| **Styling** | Tailwind CSS v3 + CSS Variables | 다크 테마 중심 토큰 설계 |
| **Backend/DB** | Supabase (PostgreSQL, Auth, Edge Functions) | 클라우드 RDBMS 및 서버리스 백엔드 |
| **Storage** | Cloudflare R2 (`minipdm-storage` 버킷) | S3 호환 발주서/도면 대용량 파일 저장소 |
| **Icon / Font** | Lucide React / Pretendard (한글) + Inter (영문) | 통일된 아이콘 및 고밀도 폰트 |
| **PDF / Print** | `html2pdf.js`, `qrcode.react`, `JSZip` | 2단 거래명세표, 발주서 생성, 도면 압축 |

---

## 2. 🎨 디자인 시스템 & UI/UX 원칙

### 2.1. 5대 디자인 원칙
1. **다크 테마 기본 (Dark-First)**: 산업 현장 및 장시간 견적 작성 시 눈의 피로를 최소화하는 GitHub Dark 스타일 색상 적용.
2. **아이콘 통일**: 이모지 사용을 엄격히 금지하고 `lucide-react` 벡터 아이콘만 사용.
3. **공용 컴포넌트 우선 (Common Component First)**: 인라인 스타일 지양, `design-system/`의 공용 컴포넌트(`Button`, `Input`, `Card`, `Badge`, `Modal`, `Table`, `NumberInput`)를 필수로 사용.
4. **전폭 그리드 (Full-Width Data Grid)**: 거래처, 견적, 수주, 생산, 출하 등 데이터 리스트 화면은 한눈에 많은 정보를 볼 수 있도록 화면 전체 너비(`w-full`)를 사용.
5. **부드러운 인터랙션**: 모든 모달 팝업, 탭 전환, 호버 상태에 CSS `transition` 적용.

### 2.2. 디자인 토큰 (Color Palette)
```
배경(Base):        #0D1117   (최외곽 기본 배경)
배경(Surface):     #161B22   (카드, 메인 컨테이너 패널)
배경(Elevated):    #21262D   (테이블 헤더, 호버 배경, 모달)
배경(Overlay):     #2D333B   (드롭다운 메뉴, 팝오버)
경계선(Border):    #30363D   (기본 테두리)
경계선(Strong):    #484F58   (강조 테두리)

텍스트(Primary):   #E6EDF3   (본문, 제목 주요 텍스트)
텍스트(Secondary): #8B949E   (보조 설명, 비활성 라벨)
텍스트(Muted):     #6E7681   (비활성 텍스트, 안내 텍스트)

브랜드(Brand):     #0EA5E9   (Cyan / Accent 메인 브랜드 컬러)
성공(Success):     #3FB950   (완료, 승인, 양품)
경고(Warning):     #D29922   (대기, 검토 필요, 주의)
위험(Danger):      #F85149   (불량, 취소, 삭제)
```

---

## 3. 📁 디렉토리 아키텍처 및 코드 분리 원칙

```text
src/
├── app/             # 글로벌 라우터(Router.tsx) 및 전역 Provider(Auth, Confirm 등)
├── design-system/   # 재사용 공용 UI 컴포넌트 (Button, Input, Card, Table 등)
├── features/        # 도메인별 기능 모듈 (화면, 컴포넌트, 전용 훅, 서비스)
│   ├── auth/          # 로그인 / 사용자 인증
│   ├── dashboard/     # 메인 현황판 및 실시간 KPI 위젯
│   ├── estimates/     # 견적 관리 (템플릿 빌더, 엑셀/PDF 파서, 계산 엔진)
│   ├── orders/        # 수주 관리 (수주 변환 RPC, 도면 관리, 상세/수정/취소)
│   ├── production/    # 생산 관리 (수주별 묶음 뷰, 공정 라우팅, 키오스크 실적)
│   ├── outsource/     # 외주/구매 관리 (소재 묶음 발주, 2줄 단가, 이메일 발송)
│   ├── receiving/     # 자재/외주 입고 검수 및 자동 공정 완료
│   ├── shipping/      # 출하 관리 (묶음 출하, 2단 거래명세표, 아코디언 상세)
│   ├── scanner/       # 스마트 바코드 통합 스캐너 전역 라우터
│   ├── clients/       # 거래처 관리 (고객사 및 외주 협력사)
│   ├── materials/     # 단가 관리 (소재, 열처리, 후처리 기준 단가)
│   ├── analytics/     # 통계 및 경영 분석
│   └── settings/      # 환경 설정 (회사 정보, 할인율 정책 4중 안전장치 등)
├── layout/          # AppShell, Sidebar, TopBar, GlobalScanner (전체 레이아웃)
└── shared/          # 공용 유틸리티, 스토어(Zustand), Supabase 클라이언트
```

### 🏛️ 코드 분리 규칙
- **UI 컴포넌트**: 300줄 이하 유지
- **페이지 컴포넌트**: 500줄 이하 유지
- **DB 쿼리 격리**: 모든 Supabase 쿼리는 반드시 `features/[domain]/services/` 레이어로 분리
- **비즈니스 로직 격리**: 계산 및 상태 변경 로직은 전용 커스텀 훅(`use[Feature]`)으로 분리

---

## 4. ⚖️ 핵심 비즈니스 로직 & 계산 공식

### 4.1. 단가 계산 공식 (Scales.md 준수)
$$\text{단가} = \text{소재비} + \text{가공비} + \text{열처리비} + \text{후처리비} + \text{이익}$$

* **소재비**: $\text{중량} \times \text{kg당 단가}$
* **가공비**: $\text{가공시간(Hr)} \times \text{시간당 임률} \times \text{난이도 계수}$
* **열처리비 / 후처리비**: $\text{중량} \times \text{kg당 단가}$
* **중량 계산 (사각)**: $(\text{가로} \times \text{세로} \times \text{두께} \times \text{비중}) / 1,000,000$
* **중량 계산 (원형)**: $(\pi \times \text{반지름}^2 \times \text{길이} \times \text{비중}) / 1,000,000$

### 4.2. 난이도 계수 (Difficulty Factors)
| 난이도 | A | B | C | D | E | F |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **계수** | 1.0 | 1.2 | 1.5 | 2.0 | 2.5 | 3.0 |

---

## 5. 🏭 Mini MES 비즈니스 라이프사이클 (수주 ➔ 가공 ➔ 입고 ➔ 출하)

MiniPDM은 복잡한 정적 BOM 대신 **수주 목록이 곧 유연한 가공 지시서가 되는 경량 MES 구조**를 갖춥니다.

### 5.1. 수주 확정 및 라이프사이클 관리
- **견적 ➔ 수주 변환 (RPC)**: 수주 확정 시 원본 견적의 확정 스냅샷 금액을 보존하면서 `orders` 및 `order_items` 생성.
- **역방향 라이프사이클 무결성**: 하위 발주/공정 이력이 발생한 품목은 물리적 삭제(Hard Delete)를 금지하고 `CANCELLED` 논리 취소(Soft Cancel) 및 하위 이력 연쇄 취소(Cascade Update) 적용.

### 5.2. 생산 및 하이브리드 공정 라우팅
- **수주별 묶음 보기**: 수주번호 및 고객사별로 묶어 납기 D-Day와 총 수량을 한눈에 관리.
- **하이브리드 라우팅**: 관리자가 사전 지정한 예약 공정(`WAITING`)과 현장 작업자가 즉석 선택하는 임의 공정(`Ad-hoc`)을 혼용 지원.
- **단일 바코드 부분 수량 연속 흐름**: 작업자는 바코드를 다시 발행하지 않고 원본 바코드(`P...`) 단 1개로 여러 공정에 원하는 수량을 분할 투입 가능.

### 5.3. 외주/구매 및 2줄 단가 시스템
- **소재 묶음 발주**: 여러 수주 품목의 원자재를 1건의 묶음 발주서(`M...`)로 취합 발주.
- **Two-Line 단가 아키텍처**:
  - **발주 단가 (`unit_price`)**: 계약 당시 기준 단가 (윗줄 고정/Lock).
  - **입고 단가 (`actual_unit_price`)**: 물건 입고 시 청구된 확정 매입가 (인라인 클릭 수정 가능).
  - **차액 자동 추적**: 변동 발생 시 `(+2,000원▲)` 자동 시각화.
- **수신 확인(Read Receipt) Edge Function**: 협력사가 발주서 메일 내 링크 클릭 시 로그인 없이 열람 시간을 기록하고 R2 다운로드로 302 리다이렉트.

### 5.4. 입고 및 출하 관리
- **스마트 바코드 라우팅**:
  - `M` 스캔 ➔ 자재 입고 검수 모달(`ReceivingScanModal`)
  - `P` 스캔 ➔ 외주 품목이면 입고 검수, 사내 가공품이면 공정 모달(`ProductionScanModal`)
- **출하 관리 완결**:
  - 가공 완료 품목 자동 집계 ➔ 고객사별 묶음 출하 전표 발행(`SHP-YYYYMMDD-xxx`).
  - 전표 행 클릭 시 상세 품목 목록이 펼쳐지는 **아코디언 서브 테이블** 제공.
  - **대한민국 중소기업 표준 2단 거래명세표**: A4 1장 상/하 2분할 (상단: 공급자 회수용 + 절취선 + 하단: 공급받는자 보관용) 및 4개 초과 품목 자동 페이징(Pagination) 지원.

---

## 6. 🗺️ 개발 단계별 로드맵 및 현재 진척 현황

```
[ 전체 개발 Phase 진척 요약 ]
Phase 1: 디자인 시스템 & 레이아웃   [ 100% 완료 ✅ ]
Phase 2: 대시보드                [ 100% 완료 ✅ ]
Phase 3: 견적 기능               [ 100% 완료 ✅ ]
Phase 4: 수주 / 생산 / 출하 (MES) [ 100% 완료 ✅ ]  <-- 최근 완결!
------------------------------------------------------------------
Phase 5: 신규 편의 기능            [ 100% 완료 ✅ ]
Phase 6: 기준 정보 고도화          [ 100% 완료 ✅ ]
Phase 7: QA 및 패키징 배포         [ 100% 완료 ✅ ]  <-- 전 Phase 100% 완결! 🚀
```

### ✅ Phase 1 — 디자인 시스템 & 레이아웃 (완료)
- [x] Tailwind 다크 테마 토큰 및 tokens.css 정의
- [x] 공용 컴포넌트: Button, Card, Input, NumberInput, Badge, Modal, Table
- [x] AppShell, Sidebar, TopBar 레이아웃 재작성

### ✅ Phase 2 — 대시보드 (완료)
- [x] 4대 핵심 KPI 카드 (매출, 성장률, 진행 수주, 가동률 카운트업)
- [x] Recharts 기반 월별 매출 추이 라인 차트
- [x] 납기 임박 주문 알림 패드 및 상태별 카운트

### ✅ Phase 3 — 견적 기능 (완료)
- [x] 견적 목록 (테이블 뷰 + Sticky Filters 복원)
- [x] 견적 상세 2-Panel 레이아웃 및 품목 인라인 편집
- [x] 견적 템플릿 빌더 (가로/세로 양식, QR코드, 결재란, 워터마크)
- [x] PDF 출력(`html2pdf.js`) 및 공식 계산식(Scales.md) 연동

### ✅ Phase 4 — 수주 / 생산 / 출하 / MES (완료)
- [x] 견적 ➔ 수주 확정 RPC 로직 및 수주 상세/취소 연쇄 롤백 아키텍처
- [x] 생산 관리 리스트 개편 (수주별 카드 묶음 뷰, 출하 화면과 디자인 일체화, 4대 탭 간소화)
- [x] 외주/구매 관리 (소재 묶음 발주, 2줄 단가 인라인 편집, 수신확인 Edge Function)
- [x] 통합 바코드 스캐너 (M/P 자동 분기, 입고 검수 및 부분 수량 공정 실적 기록)
- [x] 출하 관리 완결 (묶음 출하 등록, 아코디언 품목 상세 보기, 중소기업 표준 2단 거래명세표)
- [x] 환경 설정 할인율 정책 4중 안전장치 (안전 잠금 스위치, 되돌리기, 기본값 복원, 로컬 백업)

### ✅ Phase 5 — 신규 편의 기능 (완료)
- [x] **전역 통합 검색 / 커맨드 팔레트 (`Ctrl+K` / `Cmd+K`)**: 견적, 수주, 도면번호, 고객사, 출하 전표 실시간 5대 도메인 병렬 검색 모달 완결 ✅
- [x] **상단 헤더 실시간 알림 센터 (종 모양 🔔 아이콘)**: 납기 지연/D-Day, 외주 미입고, 출하 대기 실시간 집계 및 읽음 관리 완결 ✅
- [x] **통계 및 경영 분석 고도화 (`AnalyticsPage.tsx`)**: 4대 경영 KPI, 월별 수주 추이, 고객사별 비중, 공정 실적 실데이터 연동 완결 ✅

### ✅ Phase 6 — 기준 정보 고도화 (완료)
- [x] **거래처 관리 (`ClientsPage.tsx` & `ClientDetailPage.tsx`)**: 거래처 목록 Sticky Filters, 기본 정보, 실제 수주/견적 거래 내역, 납품 품목 단가 이력 실데이터 연동 완결 ✅
- [x] **단가 관리 (`MaterialsPage.tsx` & `MaterialModal.tsx`)**: 자재/후처리/열처리 3대 탭 Sticky Filters(URL & 세션 복원), 다크 테마 디자인 토큰 통일, 카테고리별 그룹핑 뷰, 행 클릭 인터랙션 및 거래처별 단가 팝업 연동 완결 ✅

### ✅ Phase 7 — QA & 패키징 배포 (완료)
- [x] **전체 시스템 E2E 무결성 점검**: 11대 핵심 화면 렌더링, 라우팅, 인터랙션, 콘솔 에러 0건 확인 완료 ✅
- [x] **프로덕션 빌드 및 Electron 번들링**: `npx vite build` (Renderer + Electron Main + Preload) 정상 빌드 검증 완료 ✅

---

## 7. 🏢 소프트웨어 공급사(KEP) 배포 & 라이선스 통제 아키텍처

MiniPDM v2.0은 단일 설치형 멀티 테넌트 SaaS/패키지 하이브리드 아키텍처를 기반으로 동작하며, 소프트웨어 공급사(KEP)의 전역 라이선스 관리 및 마스터 제어 체계를 완비하고 있습니다.

### 7.1. 공급사 브랜딩 및 배포 인프라
- **공급사 정보**: 회사명 **KEP**, 공식 도메인 **kendp.com**, 패키지 식별자 **`com.kendp.minipdm`**.
- **멀티 테넌트 격리**: 모든 고객사는 단일 설치 프로그램(`MiniPDM Setup 1.1.0.exe`)을 설치하여 사용하며, 데이터는 `company_id` 및 RLS(Row Level Security)를 통해 물리/논리적으로 완전 격리됩니다.
- **데스크톱 런타임 & 초고속 기동 아키텍처 (v1.1.0)**:
  - **순정 Electron 기본 세션**: 복잡한 격리 파티션(`partition`) 없이 Chromium의 기본 세션 및 영구 `localStorage`를 직접 활용하여 0ms 동기식 세션 복원 실현.
  - **Direct 프록시 바이패스**: `app.commandLine.appendSwitch('no-proxy-server')` 및 `session.defaultSession.setProxy({ mode: 'direct' })`로 Windows WPAD 10초 스톨을 원천 차단.
  - **Preload 비차단 브릿지**: 동기 IPC(`sendSync`)를 완전 제거하여 렌더러 스레드 프리징 원천 방어.
  - **Vite 로컬 최적화**: `modulePreload: false`로 데스크톱(`file://`) 환경에서 불필요한 프리로딩 오버헤드 제거.
  - **`ready-to-show` 렌더링**: 초기 화면이 완전히 준비되는 즉시 창을 띄워 지연 및 깜빡임 체감 0ms.
- **클라우드 자동 업데이트 파이프라인**:
  - CDN 엔드포인트: `https://storage.kendp.com/updates/` (Cloudflare R2 버킷 `minipdm-storage`)
  - 웹 다운로드 랜딩 페이지: `https://storage.kendp.com/index.html`
  - 최신 릴리즈 메타데이터: `https://storage.kendp.com/updates/latest.yml`
  - 빌드 및 배포: `npm run build` (Vite + Electron) 후 `npm run release:upload`로 R2에 즉시 배포.
  - 자동 패치 메커니즘: 기동 1초 후 즉각 체크 및 10분 주기 백그라운드 자동 감지/다운로드 후 앱 종료 시 무인 자동 설치 적용(`electron-updater`).

### 7.2. 라이선스 모델 및 DB 스키마 (`companies` 테이블)
| 컬럼명 | 타입 | 기본값 | 비고 |
|---|---|---|---|
| `license_status` | `text` | `'ACTIVE'` | `'TRIAL'`(체험), `'ACTIVE'`(정식유료), `'EXPIRED'`(만료), `'SUSPENDED'`(정지) |
| `license_plan` | `text` | `'PRO'` | 기본 플랜: `'PRO'`, 기본형: `'STANDARD'` |
| `trial_days` | `integer` | `30` | 최초 등록 시 부여되는 기본 체험 일수 (기본 30일) |
| `license_expires_at`| `timestamptz` | `now() + 1 year`| 라이선스 만료 일시 |
| `max_users` | `integer` | `5` | 업체별 최대 허용 사용자 계정 수 (기본 5명) |
| `is_master_vendor` | `boolean` | `false` | KEP 본사 슈퍼 마스터 벤더 여부 플래그 |
| `billing_memo` | `text` | `NULL` | 공급사 내부 계약, 결제, 정산 특이사항 메모 |

### 7.3. 만료 및 단계별 차단 정책 (License Enforcement)
1. **만료 임박 알림 (D-7 ~ D-Day)**:
   - 만료 7일 전부터 상단에 부드러운 노란색 알림 배너(`LicenseBanner`)가 노출되어 연장 갱신을 안내.
2. **체험판(`TRIAL`) 만료 시 즉시 차단**:
   - 체험 기간 종료 즉시 전체 화면 잠금 모달(`LicenseBlockedOverlay`)이 활성화되어 데이터 조작 차단.
   - 클라우드 데이터는 100% 안전하게 보존되며, 화면 내에서 KEP 문의 메일 발송 유도.
3. **정식 유료(`ACTIVE`) 고객 3일 결제 유예 기간 (Grace Period)**:
   - 유료 고객의 만료일 도래 시 즉각 차단하지 않고 **3일간의 결제 유예 기간**을 부여.
   - 유예 기간 중에는 상단에 강렬한 붉은색 긴급 결제 경고 배너가 표시되며 업무 중단을 방지.
   - 만료 후 3일 초과 시 전체 화면 잠금 모달로 전환.
4. **관리자 수동 정지(`SUSPENDED`)**:
   - 대금 미납 또는 계약 위반 시 KEP 마스터 화면에서 원클릭으로 즉각 서비스 잠금 적용.
5. **사용자 계정 수 초과 방어**:
   - `currentUsersCount >= maxUsers` 시 `환경설정 > 사용자 관리`에서 신규 직원 초대 모달을 차단하고 KEP 고객센터 라이선스 증설 문의 배너 출력.

### 7.4. KEP 슈퍼 마스터 관리자 시스템 ([방법 1] 앱 내부 탑재)
- **접근 권한 통제 (`MasterGuard`)**:
  - 사용자 이메일이 `iy7847@naver.com`, `iy7847@gmail.com`, 또는 `@kendp.com` 도메인이거나 `is_master_vendor = true`인 경우에만 인가.
  - 마스터 권한 소지자에게만 사이드바 하단에 골드 톤의 `[👑 슈퍼 관리자 (KEP) - 고객사 라이선스 관리]` 메뉴 활성화 (`/#/master/licenses`).
  - 비인가 계정 접근 시 메인 대시보드로 자동 튕김 방어.
- **전국 고객사 실시간 현황판 (`MasterLicensePage`)**:
  - 5대 KPI 통계 카드: 전체 고객사 수, 정상 이용사, 체험판 이용사, 만료 임박(7일 이내), 잠금/정지사 실시간 집계.
  - 원클릭 라이선스 제어: `[+30일 연장]`, `[+1년 연장]`, `[체험 30일 재설정]`, `[정지/정상 토글]`, `[계정 수 증감 (+/-)]`.
  - 인라인 계약 메모 수정: 테이블 상에서 클릭하여 실시간 자동 저장되는 결제 메모.
  - 신규 고객사 원스톱 등록 모달(`AddCompanyModal`): 회사명, 대표자명, 기본 체험 기간(기본 30일, 버튼: 14/30/60/90일), 계정 수(기본 5명) 즉시 발급.

---

## 8. 🛡️ 시스템 무결성 및 인프라 운영 규칙

1. **GitHub 명령어 통제**: 사용자의 명시적 허락 없이 `git commit`, `git push` 등 깃 명령어를 절대 사용하지 않는다.
2. **터미널 탐색 금지**: 파일 검색 및 상태 조사는 터미널 명령어 대신 전용 도구(`grep_search`, `list_dir`, `view_file`)만을 사용한다. (라이프사이클 훅에 의해 임의 탐색은 자동 차단됨)
3. **브라우저 실물 검증 의무**: 화면/UI 컴포넌트 변경 후에는 반드시 `chrome-devtools` MCP 서버를 통해 브라우저 실물 렌더링 및 콘솔 에러를 직접 검증한다.
4. **목록 페이지 Sticky Filters 필수**: 모든 리스트 페이지는 URL 파라미터와 `sessionStorage`를 결합하여 페이지 이탈 후 재진입 시에도 사용자의 검색/필터 상태를 100% 복원한다.
5. **서버 사이드 페이징**: 대량 데이터로 인한 브라우저 프리징을 막기 위해 목록 조회는 반드시 Supabase 단에서 페이징(`.range()`)을 수행한다.

