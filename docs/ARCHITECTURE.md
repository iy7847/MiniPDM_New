# 🏛️ MiniPDM v2.0 Architecture & Implementation Status

이 문서는 사용자와 AI 에이전트가 동일한 이해(Context)를 바탕으로 개발을 진행하기 위해, 현재까지의 전체 코드와 아키텍처, 그리고 구현 현황을 순서대로 분석하여 기록한 문서입니다.

## 1. ⚙️ 기술 스택 (Tech Stack)
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v3 (CSS Variables 활용 다크 테마)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Cloud Storage**: Cloudflare R2 (S3 API 호환, `minipdm-storage` 버킷)
- **PDF Generation**: `html2pdf.js`, `JSZip` (브라우저 사이드 렌더링 및 압축)

---

## 2. 📁 디렉토리 아키텍처 (Directory Structure)
애플리케이션은 기능(Feature) 단위로 완전히 분리된 응집도 높은 구조를 가집니다.

```
src/
├── app/             # 글로벌 라우터(Router.tsx) 및 전역 Provider 설정
├── design-system/   # 공용 UI 컴포넌트 (Button, Input, Card 등)
├── features/        # 도메인별 기능 모듈 (메뉴별 격리)
│   ├── auth/        # 로그인/회원가입
│   ├── dashboard/   # 메인 현황판
│   ├── settings/    # (1) 시스템 설정
│   ├── materials/   # (2) 단가 관리
│   ├── clients/     # (3) 거래처 관리
│   ├── estimates/   # (4) 견적 관리
│   ├── orders/      # (5) 수주 관리
│   ├── production/  # (6) 생산 관리 (목록 및 키오스크)
│   ├── outsource/   # (7) 외주/구매 관리 (이메일 발송, PDF 변환)
│   ├── receiving/   # 입고 처리 (진행 예정)
│   └── shipping/    # 출하 관리 (진행 예정)
├── layout/          # AppShell, Sidebar, TopBar (전체 레이아웃)
└── shared/          # 공용 유틸리티, 타입 정의, Supabase 클라이언트
```

---

## 3. 🗺️ 메뉴 구성 및 구현 현황 (Implementation Status)

현재 사이드바(`Sidebar.tsx`)에 매핑된 메뉴를 기준으로 구현 완료(✅), 부분 완료(⏳), 미구현(❌) 상태를 진단합니다.

### ✅ 1. 시스템 설정 (`/settings`)
- **구현 상태**: 기본 환경설정 UI 구성.
- **주요 기능**: 사용자 프로필 관리, 회사 기본 정보(사업자등록번호, 주소 등) 입력.

### ✅ 2. 단가 관리 (`/materials`)
- **구현 상태**: UI 및 목록 조회 구현 완료.
- **주요 기능**: 소재별(원형, 사각 등) 단가 및 비중(Scales.md 공식 연동) 기준 정보 관리.

### ✅ 3. 거래처 관리 (`/clients`)
- **구현 상태**: 목록 및 상세 조회(`ClientDetailPage`) 구현 완료.
- **주요 기능**: 고객사 및 외주 협력사 정보 등록, 담당자(수신처) 연락처 관리.

### ✅ 4. 견적 관리 (`/estimates`)
- **구현 상태**: 생성, 상세, 인쇄(`PrintEstimatePage`)까지 완료.
- **주요 기능**: 단가 공식을 활용한 견적 계산, 견적서 PDF 인쇄 및 이메일 발송 기반 마련.

### ⏳ 5. 수주 관리 (`/orders`)
- **구현 상태**: 견적 → 수주 전환(Order Conversion RPC), 목록 조회 완료. (일부 연계 로직 점검 필요)
- **주요 기능**: `MINI_MES_PLAN.md`에 명시된 0단계 수주 확정 로직 완료. 도면 파일 관리 및 수주 상세(`OrderDetailPage`).

### ⏳ 6. 생산 관리 (`/production`)
- **구현 상태**: 생산 목록(`ProductionListPage`) 및 현장 실적 등록(`ShopFloorPage`) 뼈대 구축.
- **주요 기능**: 바코드 스캐너 연동을 통한 공정 처리(대기 → 가공 → 완료). 키오스크 형태의 현장 UI 최적화 진행 중.

### ✅ 7. 외주/구매 관리 (`/outsource`)
- **구현 상태**: 이메일 템플릿, PDF 발주서 자동 생성, 도면 압축(ZIP), Cloudflare R2 업로드 및 Edge Function 연동 완료.
- **주요 기능**: 다중 발주 건 선택 ➡️ 협력사별 이메일 발송 ➡️ Edge Function(`po-read-receipt`)을 통한 302 리다이렉트(다운로드) 및 열람 시간 기록. 
- **특이사항**: R2 버킷 `batch_orders/` 폴더에 7일 자동 삭제(Lifecycle) 적용 완료.

### ❌ 기타 미구현 / 예정 메뉴
- **입고 처리 (`/receiving`)**: 외주(조달) 나갔던 품목이 들어왔을 때 바코드를 찍어 입고 잡는 기능.
- **출하 관리 (`/shipping`)**: 수주 완료된 품목을 고객사로 출하하기 위한 명세서 생성 및 재고 차감 기능.
- **통계 분석 (`/analytics`)**: 매출, 이익률, 불량률 등 대시보드 데이터 시각화.

---

## 4. 🗄️ 백엔드 및 클라우드 연동 아키텍처

1. **데이터 통신 원칙**
   - 불필요한 서버 부하를 막기 위해 `Auto-save` 대신 명시적인 **[저장] 버튼 기반의 일괄 반영(Batch Upsert)** 처리.
   - 모든 데이터 목록(List) 조회 시 브라우저 과부하를 막기 위해 **서버 사이드 페이징(`.range()`)** 및 필터링 적용.

2. **상태 동기화 (Sticky Filters)**
   - 리스트 페이지 진입/이탈 시 컨텍스트 유지를 위해 `sessionStorage`와 URL Query Parameter(`?search=...&page=...`)를 결합하여 상태 복원(Re-hydrate) 구현.

3. **Supabase Edge Functions**
   - `send-po-email`: Resend API를 이용한 협력사 발주 이메일(HTML 템플릿) 발송 로직 처리.
   - `po-read-receipt`: 이메일 내 "발주서/도면 다운로드" 버튼 클릭 시, 수신 확인 시간(`read_at`)을 DB에 기록한 뒤 R2 다운로드 링크로 `302 Redirect` 시켜주는 미들웨어 역할.

---

## 5. 🚀 향후 Action Plan (Next Steps)

현재 개발 상황(`Phase 4 - 수주/생산/출하` 진입)에 비추어 볼 때 다음 단계로 진행해야 할 우선순위는 다음과 같습니다.

1. **생산 관리(Shopfloor) 바코드 인터랙션 고도화**
   - USB 바코드 스캐너(키보드 에뮬레이션) 글로벌 이벤트 리스너의 완벽한 적용 및 UI 피드백.
2. **입고 처리(`/receiving`) 및 출하 관리(`/shipping`) 페이지 개발**
   - 수주 → 발주 → 입고 → 출하로 이어지는 데이터 라이프사이클의 마무리.
3. **사용자 권한 및 파트너 접근 분리**
   - 외주 협력사가 제한된 권한으로 접근할 수 있는 `SharedOrderPage` 기능의 완성도 향상.
