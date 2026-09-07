> ⚠️ **[문서 통합 안내]**  
> 본 문서의 모든 최신 설계, 디자인 토큰, 아키텍처 및 7단계 개발 로드맵은 **[`docs/ARCHITECTURE.md`](file:///D:/06_Coding/AntiGravity/MiniPDM_New/docs/ARCHITECTURE.md)**로 완전 통합되었습니다.  
> 시스템 설계 및 최신 상태 파악 시 `docs/ARCHITECTURE.md`를 최우선으로 참조하세요.

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기존 앱 문제점 진단](#2-기존-앱-문제점-진단)
3. [디자인 시스템 (신규)](#3-디자인-시스템-신규)
4. [아키텍처 재설계](#4-아키텍처-재설계)
5. [화면별 재설계 명세](#5-화면별-재설계-명세)
6. [신규 추가 기능](#6-신규-추가-기능)
7. [데이터베이스 변경사항](#7-데이터베이스-변경사항)
8. [개발 원칙 및 규약](#8-개발-원칙-및-규약)
9. [마이그레이션 전략](#9-마이그레이션-전략)
10. [단계별 개발 로드맵](#10-단계별-개발-로드맵)

---

## 1. 프로젝트 개요

### 1.1 목적
소규모 금속 가공 제조업체(Job Shop)를 위한 **견적·수주·생산·출하 통합관리 시스템**을 완전히 새로운 디자인과 개선된 UX로 재구성한다. 기존의 기능은 100% 유지하되, 사용자가 처음 열었을 때 **전문 B2B SaaS** 수준의 첫인상을 받도록 한다.

### 1.2 핵심 방향
- **Dark-first 디자인**: 공장 환경(밝은 작업장 모니터)에 최적화된 다크 테마
- **정보 밀도 개선**: 한 화면에서 더 많은 정보를 직관적으로 파악
- **작업 흐름 최적화**: 견적 → 수주 → 생산 → 출하의 흐름이 끊기지 않도록
- **컴포넌트 시스템화**: 재사용 가능한 디자인 토큰 & 컴포넌트 라이브러리 구축

### 1.3 기술 스택 (유지/변경)

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| 플랫폼 | Electron + Vite + React | **유지** (Electron + Vite + React 18) |
| 언어 | TypeScript | **유지** |
| 스타일 | Tailwind CSS v3 | **유지** + CSS Variables 추가 |
| 상태관리 | React Hooks | **유지** + Zustand 도입 검토 |
| DB/백엔드 | Supabase (PostgreSQL) | **유지** |
| 차트 | Chart.js | **유지** + 추가 차트 타입 |
| 폰트 | 시스템 기본 | **변경**: `Pretendard` (한글) + `Inter` (영문) |
| 아이콘 | 이모지 혼용 | **변경**: `Lucide React` 통일 |

---

## 2. 기존 앱 문제점 진단

### 2.1 디자인 문제점

```
❌ 라이트 배경(slate-50/white)이 공장 모니터에서 눈부심
❌ 사이드바와 콘텐츠 영역의 시각적 구분이 약함
❌ 색상 팔레트가 통일되지 않음 (이모지 아이콘, 다양한 accent 색상 혼용)
❌ 카드 컴포넌트가 단조로움 (흰 배경 + 약한 그림자)
❌ 버튼 계층(Primary/Secondary/Danger)이 명확하지 않음
❌ 모달이 너무 크고 무거운 느낌 (EstimateItemModal: 48KB)
❌ 테이블 행 가독성 부족 (border 의존, zebra stripe 없음)
❌ 타이포그래피 위계가 약함 (제목/본문/캡션 구분 모호)
```

### 2.2 UX/기능 문제점

```
❌ 견적 상세 → 수주 전환 시 흐름이 불연속적 (페이지 이동 필요)
❌ 생산 현황을 칸반(Kanban) 형태로 볼 수 없음
❌ 납기 D-day 알림 / 경고 시각화 없음
❌ 견적 품목 일괄 편집(선택 후 일괄 단가 변경 등) 불편
❌ 대시보드 KPI가 단순 숫자 나열, 트렌드 직관성 부족
❌ 거래처별 매출 분석 화면 없음
❌ 모바일/저해상도에서 레이아웃 붕괴
❌ 견적서 미리보기가 모달 내 PDF라 조작이 불편
❌ 파일(도면) 관리가 분산됨 (품목 단위 파일 → 프로젝트 단위 뷰 없음)
❌ 설정 화면이 너무 단일 파일(47KB)에 집중됨
```

### 2.3 코드 품질 문제점

```
❌ 페이지 컴포넌트가 너무 거대함 (EstimateItemModal: 48KB, Settings: 47KB)
❌ Supabase 쿼리가 각 컴포넌트에 분산됨 (서비스 레이어 없음)
❌ 타입 정의가 estimate.ts에 집중됨 (order.ts: 1.7KB, shipment.ts: 887B)
❌ 비즈니스 로직과 UI 로직이 혼재
```

---

## 3. 디자인 시스템 (신규)

### 3.1 컬러 팔레트

```css
/* 기본 테마: Dark Mode First */

/* === 배경 레이어 === */
--color-bg-base:       #0D1117;   /* 앱 최외곽 배경 */
--color-bg-surface:    #161B22;   /* 카드/패널 배경 */
--color-bg-elevated:   #21262D;   /* 모달/드롭다운 배경 */
--color-bg-overlay:    #2D333B;   /* 호버/선택 상태 */

/* === 경계선 === */
--color-border-subtle: #21262D;   /* 미묘한 구분선 */
--color-border-default:#30363D;   /* 일반 경계선 */
--color-border-strong: #484F58;   /* 강조 경계선 */

/* === 텍스트 === */
--color-text-primary:  #E6EDF3;   /* 주요 텍스트 */
--color-text-secondary:#8B949E;   /* 보조 텍스트 */
--color-text-muted:    #6E7681;   /* 비활성/힌트 */
--color-text-inverse:  #0D1117;   /* 반전 (밝은 배경 위) */

/* === 브랜드 (Accent) — 시안/청록 계열 === */
--color-brand-400:     #38BDF8;   /* 가장 밝음 */
--color-brand-500:     #0EA5E9;   /* 기본 브랜드 */
--color-brand-600:     #0284C7;   /* 버튼 클릭 */
--color-brand-bg:      rgba(14,165,233,0.12); /* 배경 틴트 */

/* === 상태 색상 === */
--color-success:       #3FB950;
--color-success-bg:    rgba(63,185,80,0.12);
--color-warning:       #D29922;
--color-warning-bg:    rgba(210,153,34,0.12);
--color-danger:        #F85149;
--color-danger-bg:     rgba(248,81,73,0.12);
--color-info:          #58A6FF;
--color-info-bg:       rgba(88,166,255,0.12);

/* === 상태 뱃지 색상 === */
/* draft:    bg=#21262D, text=#8B949E, border=#30363D */
/* sent:     bg=rgba(210,153,34,0.15), text=#E3B341, border=rgba(210,153,34,0.3) */
/* ordered:  bg=rgba(63,185,80,0.15), text=#3FB950, border=rgba(63,185,80,0.3) */
/* archived: bg=#21262D, text=#6E7681, border=#30363D */
```

### 3.2 타이포그래피

```css
/* 폰트 패밀리 */
--font-sans:   'Pretendard', 'Inter', -apple-system, sans-serif;
--font-mono:   'JetBrains Mono', 'Fira Code', monospace;

/* 폰트 사이즈 스케일 */
--text-xs:   11px;  /* 캡션, 뱃지 */
--text-sm:   13px;  /* 테이블 셀, 보조 */
--text-base: 14px;  /* 기본 본문 */
--text-md:   15px;  /* 강조 본문 */
--text-lg:   17px;  /* 소제목 */
--text-xl:   20px;  /* 섹션 제목 */
--text-2xl:  24px;  /* 페이지 제목 */
--text-3xl:  30px;  /* KPI 숫자 */

/* 굵기 */
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;
--font-black:     900;
```

### 3.3 간격(Spacing) & 반경(Border Radius)

```css
/* Spacing (4px 단위) */
--space-1:  4px;   --space-2:  8px;   --space-3:  12px;
--space-4:  16px;  --space-5:  20px;  --space-6:  24px;
--space-8:  32px;  --space-10: 40px;  --space-12: 48px;

/* Border Radius */
--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  14px;
--radius-xl:  20px;
--radius-full: 9999px;
```

### 3.4 컴포넌트 명세

#### 카드 (Card)
```
배경: --color-bg-surface
경계: 1px solid --color-border-default
반경: --radius-lg
패딩: --space-6
그림자: 없음 (경계선으로 구분)
호버: border-color → --color-brand-500 (0.3s transition)
```

#### 버튼 계층
```
Primary:   bg=brand-500, text=white, hover=brand-600
Secondary: bg=bg-overlay, text=text-primary, border=border-default
Ghost:     bg=transparent, text=text-secondary, hover=bg-overlay
Danger:    bg=danger-bg, text=danger, border=danger(0.3)
Icon:      32px 정사각, bg=transparent, hover=bg-overlay
```

#### 인풋 (Input)
```
배경: --color-bg-elevated
경계: 1px solid --color-border-default
반경: --radius-md
포커스: border-color → brand-500, box-shadow: 0 0 0 3px brand-bg
```

#### 테이블
```
헤더: bg=bg-elevated, text=text-muted, text-xs, uppercase, letter-spacing
행:   bg=transparent, border-bottom=border-subtle
홀수행 호버: bg=bg-overlay
선택행: bg=brand-bg, border-left=3px solid brand-500
```

#### 사이드바
```
너비: 220px (펼침) / 60px (접힘)
배경: --color-bg-surface
경계: 1px solid --color-border-default (우측)
메뉴 아이템: icon(20px) + 텍스트, 패딩 10px 16px
활성: bg=brand-bg, color=brand-400, border-left=3px solid brand-500
호버: bg=bg-overlay
```

### 3.5 마이크로 애니메이션

```css
/* 기본 전환 */
transition-colors:    color, background-color, border-color 150ms ease;
transition-transform: transform 200ms cubic-bezier(0.34,1.56,0.64,1);
transition-opacity:   opacity 200ms ease;

/* 모달 진입 */
@keyframes modal-in {
  from { opacity:0; transform: scale(0.95) translateY(8px); }
  to   { opacity:1; transform: scale(1)    translateY(0);   }
}

/* 숫자 카운트업 */
@keyframes count-up { from { opacity:0; transform:translateY(10px) } }

/* 페이지 전환 (슬라이드) */
@keyframes page-slide-in {
  from { opacity:0; transform: translateX(16px); }
  to   { opacity:1; transform: translateX(0);    }
}

/* 토스트 알림 */
@keyframes toast-slide-up {
  from { opacity:0; transform: translateY(20px) scale(0.95); }
  to   { opacity:1; transform: translateY(0)    scale(1);    }
}
```

---

## 4. 아키텍처 재설계

### 4.1 디렉토리 구조

```
src/
├── app/                    # 앱 진입점
│   ├── App.tsx
│   ├── Router.tsx          # [NEW] 중앙 라우터 (SPA)
│   └── providers/          # [NEW] Context 통합 Provider
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
│
├── design-system/          # [NEW] 디자인 시스템 패키지
│   ├── tokens.css          # CSS 변수 정의
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Spinner.tsx
│   │   └── index.ts
│   └── icons/              # Lucide 아이콘 래퍼
│
├── layout/                 # 레이아웃 컴포넌트
│   ├── AppShell.tsx        # 사이드바 + 메인 영역
│   ├── Sidebar.tsx         # (재설계)
│   ├── TopBar.tsx          # [NEW] 상단 바 (검색, 알림, 프로필)
│   └── CommandPalette.tsx  # [NEW] Cmd+K 전역 검색
│
├── features/               # [NEW] 기능별 도메인 모듈
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── components/
│   │   └── hooks/useDashboardStats.ts
│   │
│   ├── estimates/          # 견적 관리
│   │   ├── EstimatesPage.tsx      (목록)
│   │   ├── EstimateDetailPage.tsx (상세/편집)
│   │   ├── EstimateSearchPage.tsx (검색)
│   │   ├── components/
│   │   │   ├── EstimateHeader.tsx
│   │   │   ├── EstimateTable.tsx
│   │   │   ├── ItemDrawer.tsx     [NEW] 모달 → 우측 드로어
│   │   │   ├── QuotationPrint.tsx
│   │   │   └── SmartImporter.tsx
│   │   ├── hooks/
│   │   │   ├── useEstimateLogic.ts
│   │   │   └── useItemCalculator.ts  [NEW] 계산 로직 분리
│   │   └── services/
│   │       └── estimateService.ts    [NEW] Supabase 쿼리 분리
│   │
│   ├── orders/             # 수주 관리
│   ├── production/         # 생산 관리
│   ├── shipments/          # 출하 관리
│   ├── clients/            # 거래처 관리
│   ├── materials/          # 자재 관리
│   ├── analytics/          # [NEW] 통합 분석
│   └── settings/           # 설정 (탭별 분리)
│
├── shared/                 # 공유 유틸
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── services/
│       └── supabase.ts     # Supabase 클라이언트
│
└── electron/               # Electron 메인 프로세스
```

### 4.2 서비스 레이어 도입

각 도메인마다 `services/` 폴더를 두어 Supabase 쿼리를 캡슐화한다.

```typescript
// features/estimates/services/estimateService.ts
export const estimateService = {
  getList:    (companyId, filters) => supabase.from('estimates')...,
  getDetail:  (estimateId)         => supabase.from('estimates')...,
  create:     (data)               => supabase.from('estimates').insert(data),
  update:     (id, data)           => supabase.from('estimates').update(data).eq('id', id),
  delete:     (id)                 => supabase.from('estimates').delete().eq('id', id),
};
```

### 4.3 상태 관리 방향

- **로컬 UI 상태**: `useState` 유지
- **서버 데이터 캐싱**: React Query (TanStack Query) 도입 검토
- **전역 공유 상태**: Zustand (로그인 사용자, 회사 정보, 테마)

---

## 5. 화면별 재설계 명세

### 5.1 전체 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (220px)  │  TOP BAR (56px, 검색 / 알림)    │
│  ─────────────    │─────────────────────────────────│
│  로고              │                                  │
│  ─────────────    │     MAIN CONTENT AREA            │
│  📊 대시보드       │     (overflow-y: auto)           │
│  📝 견적 관리      │                                  │
│  📦 수주 관리      │                                  │
│  🔧 생산 관리      │                                  │
│  🚚 출하 관리      │                                  │
│  ─────────────    │                                  │
│  🧱 자재 관리      │                                  │
│  🏢 거래처         │                                  │
│  ─────────────    │                                  │
│  📈 분석           │                                  │
│  ⚙️  설정           │                                  │
│  ─────────────    │                                  │
│  👤 사용자 정보    │                                  │
└─────────────────────────────────────────────────────┘
```

**사이드바 개선 포인트:**
- 섹션 그룹핑 + 구분선
- 아이콘 통일 (Lucide React)
- 접힘 시 아이콘만 표시 + Tooltip
- 하단 고정: 프로필 + 로그아웃

**[NEW] 상단 바 (TopBar):**
- 현재 페이지 제목 (Breadcrumb)
- 🔍 전역 검색 입력창 (Cmd+K)
- 🔔 알림 아이콘 (납기 D-day 경고)
- 회사명 표시

---

### 5.2 대시보드 (Dashboard)

**레이아웃:**
```
┌── KPI 카드 4개 (가로 배열) ────────────────────────┐
│  이번달 매출   │ 진행 수주   │ 대기 견적  │ 전환율  │
└──────────────────────────────────────────────────┘

┌── 매출 차트 (2/3) ──┬── 납기 알림 (1/3) ─────────┐
│  12개월 라인 차트   │  🔴 D-1  삼성전자 브라켓    │
│  전월비 증감 표시   │  🟡 D-3  현대모비스 샤프트  │
│                     │  🟢 D-7  LG전자 케이싱      │
└─────────────────────┴──────────────────────────────┘

┌── 최근 견적 (1/2) ──┬── 생산 현황 요약 (1/2) ────┐
│  견적 목록 5건      │  미시작 / 진행 / 완료 도넛차트│
└─────────────────────┴──────────────────────────────┘
```

**신규 KPI 항목:**
- 이번 달 매출 (전월 대비 % 증감)
- 진행 중 수주 건수 (납기 임박 강조)
- 회신 대기 견적 건수
- 이번 달 견적 → 수주 전환율

---

### 5.3 견적 목록 (Estimates)

**개선 포인트:**
- 상태별 탭 필터 (전체 / DRAFT / SENT / ORDERED / ARCHIVED)
- 테이블 열 정렬 가능
- 행 우클릭 → 컨텍스트 메뉴 (복사, 삭제, 수주전환)
- **[NEW]** 빠른 상태 변경 (inline badge 클릭)
- **[NEW]** 견적 카드뷰 / 테이블뷰 전환 버튼

**테이블 컬럼:**
```
☐  | 견적번호 | 프로젝트명 | 거래처 | 품목수 | 총액 | 통화 | 상태 | 작성일 | 작업
```

---

### 5.4 견적 상세 (EstimateDetail) ⭐ 핵심

**레이아웃 재설계 (2-Panel):**
```
┌── 헤더 (프로젝트명 / 거래처 / 상태 / 저장버튼) ───┐

┌── 품목 테이블 (좌, 70%) ──┬── 품목 상세 드로어 (우, 30%) ──┐
│  번호 | 품명 | 소재 | 단가│  ← 품목 클릭 시 오른쪽 슬라이드  │
│  1    | 브라켓 | SUS │    │  품번/품명/형상/소재             │
│  2    | 샤프트 | SCM │    │  치수 (가로/세로/두께)           │
│  ...  |        |     │    │  가공시간/난이도/이익률          │
│                           │  열처리/후처리                  │
│  [+ 품목 추가]            │  첨부파일                       │
│  [일괄: 드래그 편집]      │  계산 결과 (실시간 미리보기)     │
└───────────────────────────┴─────────────────────────────────┘

┌── 하단 액션바 ─────────────────────────────────────┐
│  [견적서 출력]  [엑셀 내보내기]  [수주로 전환] [저장]│
└────────────────────────────────────────────────────┘
```

**[개선] 품목 드로어 (기존 모달 대체):**
- 우측에서 슬라이드인 (모달 대신 드로어)
- 품목 목록과 동시에 보임
- 실시간 단가 계산 결과 표시
- 탭: `기본정보` / `원가분석` / `첨부파일`

**[NEW] 인라인 셀 편집:**
- 수량, 단가 셀 클릭 → 즉시 편집 가능
- Enter로 다음 행 이동

**[NEW] 일괄 편집 툴바:**
- 품목 다중 선택 시 상단에 툴바 표시
- 일괄: 납기일 변경 / 이익률 변경 / 삭제

---

### 5.5 수주 목록 & 상세 (Orders)

**개선 포인트:**
- 수주 목록 테이블에 납기 D-day 뱃지 강조
- **[NEW]** 납기 캘린더 뷰 추가 (월별 납기 분포 확인)
- 수주 상세에서 생산 진행률 진행바 표시
- 견적 원본 연결 링크

---

### 5.6 생산 관리 (Production) ⭐ 대폭 개선

**레이아웃 선택 (뷰 전환):**

**① 리스트 뷰 (현재):** 테이블 형태, 필터링, 일괄 처리

**② 칸반 뷰 (신규):**
```
┌── 대기 ────────┬── 진행 중 ───┬── QC 검사 ──┬── 완료 ───┐
│ [브라켓] D-3   │[샤프트] D-1 │[케이스] D+1 │[플레이트]  │
│  LG전자        │ 삼성전자     │ 현대 모비스 │            │
│  SUS304 Ø50   │ SCM415      │             │            │
│  10개          │ 5개         │ 2개         │            │
└────────────────┴─────────────┴─────────────┴────────────┘
```
- 드래그&드롭으로 상태 변경
- 카드에 소재, 수량, 납기, 담당자 요약

**③ 타임라인 뷰 (신규):**
- Gantt 차트 형태의 납기 타임라인
- 거래처별 색상 구분

---

### 5.7 출하 관리 (Shipments)

**개선 포인트:**
- **[NEW]** 출하 계획 캘린더 (주간/월간 뷰)
- 라벨 인쇄 → 미리보기 개선 (실제 크기 시뮬레이션)
- 다중 출하 항목 선택 → 일괄 출하 처리
- 출하 이력 타임라인 표시

---

### 5.8 분석 (Analytics) ⭐ 신규 강화

기존 `ExpenseAnalysis` 를 `Analytics` 로 통합 확장.

**탭 구성:**
```
[매출 분석] [거래처 분석] [원가 분석] [생산 효율] [견적 전환]
```

| 탭 | 내용 |
|----|------|
| 매출 분석 | 월별 매출 라인 차트 (전년 대비 오버레이), 분기별 누적 바 차트 |
| 거래처 분석 | 거래처별 매출 파이/도넛 차트, 거래처별 품목 단가 이력 |
| 원가 분석 | 소재비/가공비/외주비/이익 스택 바 차트, 난이도별 수익성 분석 |
| 생산 효율 | 납기 준수율, 외주 비율 추이 |
| 견적 전환 | 거래처별 전환율 히트맵, 견적 금액 구간별 전환율 |

---

### 5.9 자재 관리 (Materials)

**개선 포인트:**
- **[NEW]** 카테고리별 탭 (철강 / 스테인리스 / 알루미늄 / 기타)
- **[NEW]** 단가 이력 관리 (업데이트할 때마다 이력 기록)
- **[NEW]** 단가 변동 그래프 (미니 스파크라인)
- 빠른 검색 + 필터 인라인 배치

---

### 5.10 거래처 관리 (Clients)

**개선 포인트:**
- **[NEW]** 거래처 카드뷰 (이름, 담당자, 최근 거래일, 총 거래액)
- 거래처 상세 패널: 거래처 정보 + 견적 이력 + 수주 이력 탭
- **[NEW]** 통화 설정 (거래처별 기본 통화 설정)

---

### 5.11 설정 (Settings)

**탭 분리 (기존 단일 페이지 → 탭 기반):**

```
[🏢 회사정보] [💰 단가/할인] [📄 견적서 양식] [🖨️ 라벨] [👥 사용자] [🔗 연동]
```

| 탭 | 내용 |
|----|------|
| 회사 정보 | 회사명, 사업자번호, 대표자, 주소, 로고, 인감 |
| 단가/할인 | 기본 시간당 임률, 환율, 이익률 단계, 할인 정책 테이블 |
| 견적서 양식 | 템플릿 타입, 결제조건, Incoterms, 유효기간, 비고 기본값 |
| 라벨 설정 | 라벨 크기, 프린터 설정, 미리보기 |
| 사용자 관리 | 초대, 역할 변경, 비활성화 |
| 연동 설정 | NAS 경로, Supabase 연결, 자동업데이트 |

---

## 6. 신규 추가 기능

### 6.1 🔍 전역 검색 / 커맨드 팔레트 (Cmd+K)

```
────────── 전역 검색 ──────────
🔍  [ 검색어 입력... ]

최근 방문
  📝 삼성전자_2026_Q2견적
  📦 PO-2026-0045

검색 결과
  📝 견적  "브라켓"  → LG전자 2026-06
  📦 수주  "PO-2026-0033" → 현대 모비스
  🏢 거래처 "현대"  → 현대모비스, 현대글로비스
```

### 6.2 🔔 납기 알림 시스템

- 앱 실행 시 납기 D-3 이내 항목 자동 감지
- 사이드바 상단 빨간 뱃지 + 상단 바 알림 벨
- 클릭 시 해당 수주/생산 화면으로 바로 이동
- Windows 네이티브 알림 (Electron의 `Notification` API) 지원

### 6.3 📊 거래처별 단가 이력 조회

- 같은 품번(part_no)을 거래처에 얼마에 팔았는지 이력 확인
- 견적 작성 시 과거 단가 자동 제안 (우측 드로어에 표시)

### 6.4 🔄 견적 복사 & 버전 관리

- 견적 복사 → 새 버전 생성
- 원본 견적과 연결된 버전 트리 표시
- 버전 간 금액 비교

### 6.5 📁 프로젝트 단위 파일 뷰어

- 견적의 모든 첨부 파일을 프로젝트 단위로 그리드 표시
- 썸네일 미리보기 (PDF, 이미지)
- 도면 번호로 정렬/필터

### 6.6 🌍 다국어 견적서 개선

- 한글 / 영문 견적서를 탭으로 전환하여 동시 미리보기
- 회사 로고 고해상도 자동 처리

### 6.7 📦 자재 발주서 자동 생성 (기존 기능 강화)

- 선택한 수주 품목의 소재를 집계
- 거래처별 자재 발주서 Excel 자동 생성

---

## 7. 데이터베이스 변경사항

### 7.1 신규 테이블

```sql
-- 7.1.1 납기 알림 설정
CREATE TABLE public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    alert_days INTEGER[] DEFAULT '{1, 3, 7}',
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.1.2 단가 이력
CREATE TABLE public.material_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id)
);

-- 7.1.3 생산 칸반 상태 (기존 order_items에 컬럼 추가)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS
    production_status TEXT DEFAULT 'PENDING'
    CHECK (production_status IN ('PENDING','IN_PROGRESS','QC','DONE'));

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS
    production_note TEXT;

-- 7.1.4 견적 버전
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS
    parent_estimate_id UUID REFERENCES estimates(id);
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS
    version INTEGER DEFAULT 1;
```

### 7.2 기존 테이블 수정

```sql
-- companies 테이블 확장
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS
    alert_days_before_deadline INTEGER[] DEFAULT '{1,3,7}';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS
    theme TEXT DEFAULT 'dark';

-- estimate_items에 외주비 추가
ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS
    outsource_cost NUMERIC DEFAULT 0;
ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS
    outsource_company TEXT;
```

---

## 8. 개발 원칙 및 규약

### 8.1 코드 분리 원칙

```
컴포넌트 크기 제한:
  - UI 컴포넌트:      200줄 이하 권고
  - 페이지 컴포넌트:  300줄 이하 권고
  - 훅(Hook):         500줄 이하 권고
  - 서비스:           200줄 이하 권고

초과 시 분리 기준:
  - 논리적으로 독립된 섹션 → 별도 컴포넌트
  - Supabase 쿼리 집합 → 서비스 레이어
  - 계산 로직 → 유틸 함수 또는 전용 훅
```

### 8.2 네이밍 컨벤션

```typescript
// 컴포넌트: PascalCase
EstimateItemDrawer.tsx

// 훅: camelCase + use 접두사
useItemCalculator.ts

// 서비스: camelCase + Service 접미사
estimateService.ts

// 타입/인터페이스: PascalCase
type EstimateItem = { ... }

// 상수: UPPER_SNAKE_CASE
const DIFFICULTY_FACTOR = { ... }
```

### 8.3 한국어 주석 규약

- 모든 함수, 클래스, 중요 변수에 한국어 주석 필수
- 복잡한 비즈니스 로직은 단계별로 주석 작성
- `Scales.md` 참조가 필요한 계산식은 반드시 주석에 명시

### 8.4 DB 무결성 규칙

```
- 스키마 변경 시 반드시 supabase/migrations/ 에 .sql 파일 생성
- 파일명 형식: YYYYMMDD_HHMMSS_description.sql
- 마이그레이션 후 schema.sql도 동기화
- RLS 정책: 개발 단계에서도 company_id 기반으로 점진 전환
```

---

## 9. 마이그레이션 전략

### 9.1 기존 데이터 호환성

```
✅ 기존 Supabase 프로젝트 재사용 (URL, API Key 동일)
✅ 기존 테이블 구조 유지 (데이터 손실 없음)
✅ ALTER TABLE로 신규 컬럼 추가 (NOT NULL 없이)
⚠️  companies 테이블 reserved_ 필드를 실제 필드로 전환
```

### 9.2 코드 마이그레이션 순서

```
Phase 1: 디자인 시스템 구축
  → design-system/ 폴더에 모든 기본 컴포넌트 작성
  → 다크 테마 CSS 변수 정의

Phase 2: 레이아웃 재구성
  → AppShell, Sidebar, TopBar 재작성
  → 라우팅 구조 확립

Phase 3: 핵심 기능 화면 이식 (기능 우선)
  → 대시보드 → 견적 → 수주 → 생산 → 출하 순서

Phase 4: 신규 기능 추가
  → 칸반 뷰, 전역 검색, 알림 시스템 등

Phase 5: 분석/설정 화면 완성

Phase 6: 테스트 & 배포
```

---

## 10. 단계별 개발 로드맵

### Phase 1 — 디자인 시스템 & 레이아웃 (1주)

- [ ] `tailwind.config.js` 다크 테마 토큰 확장
- [ ] `design-system/tokens.css` CSS 변수 정의
- [ ] 기본 컴포넌트: Button, Card, Input, Select, Badge, Modal, Table
- [ ] `AppShell.tsx` (사이드바 + 콘텐츠 영역)
- [ ] `Sidebar.tsx` 재설계 (아이콘 통일, 그룹핑)
- [ ] `TopBar.tsx` 신규 (검색 + 알림 + 프로필)

### Phase 2 — 대시보드 (3일)

- [ ] KPI 카드 4종 (카운트업 애니메이션)
- [ ] 매출 추이 차트 (12개월 + 전년비)
- [ ] 납기 알림 패널
- [ ] 최근 활동 피드

### Phase 3 — 견적 기능 (2주)

- [ ] 견적 목록 (테이블 뷰 + 카드 뷰)
- [ ] 견적 상세 (2-Panel 레이아웃)
- [ ] 품목 드로어 (기존 모달 대체)
- [ ] 인라인 셀 편집
- [ ] SmartPdfImporter 이식
- [ ] 견적서 출력 템플릿 개선

### Phase 4 — 수주 / 생산 / 출하 (2주)

- [ ] 수주 목록 + 납기 뱃지
- [ ] 생산 칸반 뷰
- [ ] 생산 타임라인 뷰
- [ ] 출하 관리 + 라벨 개선

### Phase 5 — 신규 기능 (1주)

- [ ] 전역 검색 / 커맨드 팔레트 (Cmd+K)
- [ ] 납기 알림 시스템 (Electron Notification)
- [ ] 거래처별 단가 이력 조회
- [ ] 분석 화면 통합 강화

### Phase 6 — 자재 / 거래처 / 설정 (1주)

- [ ] 자재 관리 (단가 이력 + 스파크라인)
- [ ] 거래처 (카드뷰 + 상세 패널)
- [ ] 설정 (6탭 분리)

### Phase 7 — QA & 배포 (3일)

- [ ] 전체 기능 테스트 (기존 데이터 연동)
- [ ] Electron 빌드 & 패키징
- [ ] v2.0.0 릴리즈 노트 작성
- [ ] 자동 업데이트 검증

---

## 📎 참고 레퍼런스 (디자인 영감)

| 레퍼런스 | 참고 포인트 |
|----------|------------|
| GitHub (Dark Mode) | 색상 팔레트, 컴포넌트 구조 |
| Linear | 칸반 뷰, 커맨드 팔레트 |
| Notion | 사이드바 구조, 드로어 |
| Vercel Dashboard | KPI 카드, 분석 차트 |
| Plane.so | 생산 관리 칸반 |
| shadcn/ui | 컴포넌트 디자인 패턴 |

---

> **기존 앱 경로**: `D:\06_Coding\AntiGravity\MiniPDM`  
> **신규 앱 경로**: `D:\06_Coding\AntiGravity\MiniPDM_New`  
> 두 프로젝트를 병행 운영하며, 신규 앱 안정화 후 기존 앱을 레거시로 전환합니다.
