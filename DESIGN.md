# 🎨 MiniPDM 디자인 분석 & v2.0 제안서

> **작성일**: 2026-07-03  
> **분석 대상**: MiniPDM v0.3.1 기존 앱  
> **적용 대상**: MiniPDM v2.0 신규 개발

---

## 📌 현재 디자인 심층 분석

### 문제점 1 — 색상 시스템 혼재 (Identity Crisis)

기존 코드에서 발견된 색상 충돌:

| 위치 | 사용 색상 | 문제 |
|------|----------|------|
| `tailwind.config.js` brand | `#6366f1` (인디고/보라) | 기본 브랜드 색상 |
| `Sidebar.tsx` 배경 | `#1e2330` (네이비 다크) | 콘텐츠 영역은 라이트 |
| `Login.tsx` 버튼 | `bg-blue-600` (파랑) | 브랜드와 다른 색상 |
| `Button.tsx` primary | `brand-600` (인디고) | 일관성 없음 |
| `Dashboard.tsx` 차트 | `rgb(59, 130, 246)` (파랑) | 또 다른 색상 |

**→ 결론: 앱 내에서 최소 3가지 서로 다른 "파란 계열" 색상이 혼용됨**

---

### 문제점 2 — 하이브리드 테마 (Dark + Light 혼재)

```
사이드바:  다크 (#1e2330) ← 의도적 다크
콘텐츠:    라이트 (bg-slate-50, white)
카드:      흰 배경 + 약한 그림자
모달:      흰 배경
```

**→ 결론: 반은 다크, 반은 라이트인 불일치 디자인**

---

### 문제점 3 — 이모지 아이콘 = 비전문성

```tsx
// 현재 코드 (Sidebar.tsx)
<SidebarButton page="estimates"  icon="💰" label="견적 관리" />
<SidebarButton page="orders"     icon="📦" label="수주/발주" />
<SidebarButton page="production" icon="🏭" label="생산 관리" />
<SidebarButton page="shipments"  icon="🚛" label="출하 관리" />
<SidebarButton page="settings"   icon="⚙️" label="환경 설정" />
```

이모지는 OS/폰트/렌더러마다 다르게 보이며 전문 B2B 앱과 어울리지 않음

---

### 문제점 4 — 카드 컴포넌트 단조로움

```tsx
// 현재 Card.tsx
'bg-white rounded-2xl shadow-soft border border-slate-100'
```
- 흰 배경에 slate-100 테두리 → 공장 밝은 모니터에서 눈부심
- 카드 간 시각적 구분이 그림자에만 의존 (라이트 배경에서 취약)
- hover 상태 없음 (인터랙션 부재)

---

### 문제점 5 — 버튼 variant 과잉 (8종)

```typescript
// 현재 Button.tsx — 8가지 variant
'primary' | 'secondary' | 'danger' | 'ghost' |
'outline' | 'success' | 'warning' | 'glass' | 'gradient'
```
너무 많은 버튼 스타일로 인해 어느 상황에 무엇을 쓸지 일관성이 없음

---

### 문제점 6 — 로그인 화면

```tsx
// Login.tsx — 최소 스타일
<div className="flex min-h-screen items-center justify-center bg-slate-100">
  <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl">
```
- 흰 카드 on 회색 배경 → 2010년대 스타일
- 브랜드 아이덴티티 없음
- 비주얼 임팩트 없음

---

## ✅ v2.0 디자인 시스템 제안

### 🎨 컬러 팔레트 비교

| 요소 | 기존 (v0.3) | 신규 (v2.0) |
|------|------------|------------|
| 앱 배경 | `bg-slate-50` (#f8fafc) | `#0D1117` |
| 카드 배경 | `bg-white` (#ffffff) | `#161B22` |
| 모달 배경 | `bg-white` (#ffffff) | `#21262D` |
| 호버 상태 | `bg-slate-50` | `#2D333B` |
| 경계선 | `border-slate-100` | `#30363D` |
| 주요 텍스트 | `text-slate-800` | `#E6EDF3` |
| 보조 텍스트 | `text-slate-500` | `#8B949E` |
| **브랜드** | **`#6366f1` 인디고** | **`#0EA5E9` 시안** |
| 성공 | `emerald-600` | `#3FB950` |
| 경고 | `amber-500` | `#D29922` |
| 위험 | `red-600` | `#F85149` |

> 브랜드 컬러를 **인디고(보라) → 시안(청록)**으로 교체하는 이유:  
> 제조업·산업용 앱에서 시안은 '정밀함', '기술력'을 연상시키며  
> 다크 배경에서 훨씬 더 선명하게 발광하는 효과를 냄

---

### 🔤 타이포그래피 시스템

```
기존: 폰트 스케일 없음, Pretendard 적용 시도했으나 불일치
신규: 엄격한 7단계 스케일

xs   → 11px : 뱃지, 레이블 캡션
sm   → 13px : 테이블 셀, 보조 정보
base → 14px : 기본 본문
md   → 15px : 강조 본문
lg   → 17px : 소제목
xl   → 20px : 섹션 제목
2xl  → 24px : 페이지 제목
3xl  → 30px : KPI 숫자
```

---

### 🧩 컴포넌트 Before / After

#### 카드 (Card)
```
[Before]
배경: 흰색(#fff)
테두리: border-slate-100 (거의 안 보임)
그림자: shadow-soft (0 4px 20px rgba(0,0,0,0.05))
hover: 없음 / 선택감: 없음

[After]
배경: #161B22
테두리: 1px solid #30363D (선명한 구분)
그림자: 없음 (테두리로 구분)
hover: border-color → #0EA5E9 (0.3s transition)
선택감: 있음 (브랜드 색 테두리 강조)
```

#### 버튼 (Button)
```
[Before] 8가지 variant (혼란)
primary / secondary / danger / ghost /
outline / success / warning / glass / gradient

[After] 4가지 핵심 variant (명확한 계층)
Primary  → bg-[#0EA5E9] text-white      ← 주요 행동
Ghost    → bg-[#2D333B] text-[#E6EDF3]  ← 보조 행동
Outlined → border-[#484F58]             ← 중립 행동
Danger   → bg-danger-bg text-danger     ← 위험 행동
```

#### 사이드바 메뉴 아이템
```
[Before]
active: 그라디언트 bg (from-brand-600 to-indigo-600)
        left indicator: w-1.5 (너무 두꺼움)
        이모지 아이콘 (💰📦🏭)

[After]
active: bg-brand-bg (#0EA5E9 at 12% opacity)
        left indicator: 3px solid #0EA5E9 (선명)
        색상: text-[#38BDF8]
        Lucide 아이콘 (FileText, Package, Factory...)
hover:  bg-[#2D333B] (미묘한 overlay)
```

#### 입력 필드 (Input)
```
[Before]
배경: white / 테두리: border-slate-300
focus: ring-blue-500 (브랜드 불일치)

[After]
배경: #21262D (어두운 elevated)
테두리: 1px solid #30363D
focus: border → #0EA5E9
       box-shadow: 0 0 0 3px rgba(14,165,233,0.12)
```

#### 테이블
```
[Before]
헤더: bg-slate-50 text-slate-500
행:   border 없이 나열 / 선택: 없음

[After]
헤더:  bg-[#21262D] text-[#8B949E] text-xs uppercase tracking-wider
행:    border-b border-[#21262D]
hover: bg-[#2D333B]
선택행: bg-brand-bg border-l-[3px] border-brand-500
```

---

## 📱 화면별 디자인 변경 요약

### 1. 전체 레이아웃
- 전체 배경을 `#0D1117` 다크로 통일
- 사이드바/콘텐츠 경계를 `#30363D` 선으로 구분
- 상단 TopBar 신규 추가 (검색 Cmd+K, 알림벨, 회사명)
- KPI 카드에 전월 대비 증감율 표시 (↑↓)

### 2. 견적 상세 (핵심)
- 거대 모달 → 우측 슬라이드 드로어 방식으로 교체
- 품목 목록과 입력 폼을 동시에 표시 (2-Panel)
- 실시간 단가 계산 결과를 드로어 하단에 즉시 표시

### 3. 상태 뱃지 통일
```
DRAFT    → 회색          bg:#21262D  text:#8B949E
SENT     → 황금/노랑     bg:amber/15 text:#E3B341
ORDERED  → 초록          bg:green/15 text:#3FB950
ARCHIVED → 회색(어두움)  bg:#21262D  text:#6E7681
```

### 4. 로그인 화면 완전 교체
```
기존: 흰 카드 on 회색 배경

신규:
- 전체 배경: #0D1117
- 좌측: 브랜드 그라디언트 패널 + 앱 소개
- 우측: 로그인 폼 (다크 카드 #161B22)
- 로고: "M" 시안 그라디언트 아이콘
- 인풋: 다크 스타일, 시안 포커스 링
- 버튼: 시안 Primary
```

---

## 🗓️ 구현 우선순위

| 순위 | 항목 | 예상 | 임팩트 |
|------|------|------|--------|
| 1 | `tailwind.config.js` + `tokens.css` 색상 시스템 | 2h | ★★★★★ |
| 2 | `Sidebar.tsx` Lucide 아이콘 + 다크 통일 | 3h | ★★★★★ |
| 3 | `Card`, `Button`, `Input` 컴포넌트 교체 | 4h | ★★★★★ |
| 4 | `TopBar.tsx` 신규 생성 | 2h | ★★★★ |
| 5 | `Login.tsx` 완전 교체 | 3h | ★★★★ |
| 6 | 테이블 스타일 통일 | 3h | ★★★★ |
| 7 | 상태 뱃지 컴포넌트 통일 | 2h | ★★★ |
| 8 | 대시보드 KPI 카드 개선 | 3h | ★★★ |
| 9 | 견적 상세 2-Panel 드로어 | 8h | ★★★★★ |
| 10 | 생산 칸반 뷰 | 6h | ★★★★ |

---


> **원칙**: 구현은 반드시 **디자인 시스템 → 레이아웃 → 각 화면** 순서로 진행  
> 토큰과 컴포넌트 없이 개별 화면부터 만들면 또다시 불일치가 발생함

---

## 📦 채택 라이브러리 (테이블/리스트)

> 모두 **MIT 라이선스** — 상업 이용 완전 무료

### 용도별 선택

| 용도 | 라이브러리 | 패키지 |
|------|-----------|--------|
| 견적/수주/생산/출하 **목록 테이블** | TanStack Table v8 | `@tanstack/react-table` |
| 견적 상세 **품목 인라인 편집** | react-datasheet-grid | `react-datasheet-grid` |
| 생산 칸반 **드래그앤드롭** | dnd-kit | `@dnd-kit/core` |

### 선택 이유

**TanStack Table v8** (목록형)
- 완전 헤드리스 → 우리 다크 디자인 시스템에 100% 통합 가능
- 정렬·필터·페이지네이션·다중 선택 모두 내장
- 번들 크기 ~15KB (가벼움)
- TypeScript 완전 지원

**react-datasheet-grid** (편집형)
- 셀 클릭 → Excel처럼 즉시 편집
- Tab / Enter / 방향키 내비게이션
- 복사·붙여넣기 지원
- 커스텀 셀 렌더러 (드롭다운, 숫자 입력 등)

**@dnd-kit/core** (칸반)
- React 전용 드래그앤드롭, 가볍고 접근성 지원
- 생산 칸반 뷰에서 카드 상태 변경용

### 사용하지 않는 것

| 라이브러리 | 제외 이유 |
|-----------|----------|
| AG Grid Community | 번들 298KB, 다크 테마 커스터마이징 불편, 고급 기능 유료 |
| MUI X DataGrid | 정렬·필터 등 핵심 기능이 Pro(유료) |
| Handsontable | 상업 이용 유료 (EULA) |
| react-table v7 | TanStack v8로 대체된 구버전 |

