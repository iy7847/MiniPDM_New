# 🧠 에이전트 자율 기억 저장소 (MEMORY.md)

> **목적**: 제미나이(Antigravity) 에이전트가 세션 간 기억 상실(Context Loss)을 방지하고, 프로젝트의 숨겨진 아키텍처 특성이나 과거의 실수(오답 노트)를 영구적으로 기억하기 위해 스스로 기록하고 참조하는 파일입니다.
> **규칙**: 
> 1. 새로운 세션을 시작하거나 복잡한 작업을 하기 전, 반드시 이 파일을 가장 먼저 읽고 과거의 컨텍스트를 뇌에 업로드하세요.
> 2. 전체 프로젝트의 메뉴 구성과 아키텍처 구현 현황을 파악하려면 `docs/ARCHITECTURE.md` 파일을 반드시 읽고 시작하세요.

---

## 🧠 에이전트 핵심 행동 원칙 및 인수인계 사항

### 1. Database & API 통신 원칙 (매우 중요)
- **Supabase 원본 소스 규칙**: 로컬의 `supabase/migrations/*.sql` 파일들은 보조적인 역할(형상 관리용)입니다. 에이전트가 데이터 무결성을 검증하거나 스키마를 확인할 때는 **반드시 실제 Supabase Cloud (Pooler URL: `aws-1-ap-northeast-2.pooler.supabase.com`)의 응답을 Source of Truth(절대적 진리)로 취급**해야 합니다.
- **수동 저장(Manual Save) 기본 원칙**: 빈번한 API 호출로 인한 서버 부하(Supabase 비용 등)를 최소화하기 위해, 폼(견적, 수주 등) 입력 시에는 즉각적인 DB 업데이트(Auto-save)를 지양하고, 반드시 명시적인 **[저장] 버튼을 눌렀을 때 일괄 반영(Batch Update/Upsert)하는 방식을 기본 아키텍처 원칙**으로 삼습니다. 파일 업로드 등 불가피한 경우가 아니면 이 원칙을 최우선으로 지켜야 합니다.

### 2. 채번(Numbering) 룰 (2026.07.30 확정)

## 🛑 [매우 중요] DB 스키마 구조 파악 시 절대 주의사항 (2026-07-29 기록)

1. **로컬 마이그레이션 파일 맹신 금지**
   - 현재 프로젝트(`MiniPDM_New`)의 `supabase/migrations/` 폴더 내 SQL 스크립트만으로는 데이터베이스의 100%를 파악할 수 없습니다. 
   - 과거에 사용자가 Supabase 대시보드(웹 GUI)를 통해 수동으로 생성/수정한 컬럼들(예: `order_items` 테이블의 `work_days`, `due_date` 등)이 로컬 마이그레이션 파일 추적망을 벗어나 존재하고 있습니다.
2. **진실의 공급원 (Single Source of Truth)**
   - **DB 스키마 확인**: 현재 `database.types.ts`는 손상되어 사용할 수 없습니다. 테이블 구조나 컬럼을 확인할 때는 **반드시 `.agents/DB_SCHEMA.md` 파일을 최우선으로 열어 확인(팩트 체크)하세요.** (이 파일은 DB에서 직접 추출한 정확한 스키마 덤프입니다.)
   - 절대로 에이전트의 자체 지식이나 구형 마이그레이션 SQL만으로 DB 컬럼의 존재 여부를 짐작(Hallucination)하지 마세요. (예: `estimate_items`에 없는 `spec` 컬럼 조회 시도 금지)
   - 단편적인 파일 하나만 보고 "이 컬럼이 없네?" 하고 새로 만들거나 지우는 즉흥적인 판단은 치명적인 버그를 낳습니다. 전체 맥락을 먼저 연결하세요.

## 🛡️ 사이드 이펙트(Side Effect) 방어 원칙

1. **수정 전 크로스 레퍼런스(Cross-reference) 체크 필수**
   - 백엔드(RPC, 테이블)를 수정하기 전에 그 데이터가 프론트엔드(`types.ts`, 컴포넌트 렌더링 로직)에서 어떻게 기대되고 있는지 무조건 `grep_search`로 선행 스캔하세요.
   - 단편적인 파일 하나만 보고 "이 컬럼이 없네?" 하고 새로 만들거나 지우는 즉흥적인 판단은 치명적인 버그를 낳습니다. 전체 맥락을 먼저 연결하세요.

## 🌐 Supabase 다이렉트 연결 (IPv4 로컬 환경) 오답 노트 (2026-07-29 기록)

1. **IPv4 환경에서는 Direct Connection(IPv6) 사용 불가**
   - 로컬 윈도우 환경(IPv4)에서 다이렉트 연결 주소(\postgresql://postgres:[PASSWORD]@[project_ref].supabase.co\)를 사용하면 \ENOTFOUND\ 에러가 발생합니다.
   - 반드시 대시보드의 Connection string 설정에서 **\Session pooler\**를 선택하여 나오는 주소(포트 5432)를 사용해야 합니다.

2. **Pooler 호스트 주소의 함정**
   - Pooler 주소를 임의로 유추(\ws-0-ap-northeast-2...\)하지 마십시오. 프로젝트마다 노드 번호(\ws-1\ 등)가 다를 수 있습니다. 반드시 대시보드의 **Connection parameters**를 팩트 체크해야 합니다.

3. **비밀번호 변경 시 동기화 딜레이 (클라우드 특성)**
   - 비밀번호를 막 변경(초기화)한 직후에는 올바른 비밀번호를 입력해도 \28P01 (password authentication failed)\ 에러가 발생할 수 있습니다.
   - 이는 새 비밀번호가 Pooler 노드망에 동기화되는 물리적 지연(약 1~3분) 때문이므로, 당황하지 말고 기다린 뒤 재시도해야 합니다.

4. **CLI 기반 SQL 다이렉트 실행 우회법 (2026-09-02 기록)**
   - 로컬 마이그레이션 이력이 꼬여서 `npx supabase db push`가 충돌(`LegacyDbPushApplyError`)하는 경우, `.env` 파일의 `DATABASE_URL`과 `supabase db query`를 이용해 원격 DB에 쿼리를 직접 실행할 수 있습니다. (예: `npx supabase db query -f "temp.sql" --db-url "..."`)
   - 단일 파일에 여러 쿼리가 있을 경우 "cannot insert multiple commands" 에러가 발생합니다. 반드시 SQL 내용을 `DO $$ BEGIN ... END $$;` 익명 블록으로 감싸 하나의 구문으로 만들거나, 쿼리를 하나씩 분리하여 실행해야 합니다.
   - 쿼리 반영 후 프론트엔드가 이를 즉시 인식하게 하려면, `NOTIFY pgrst, 'reload schema';` 쿼리도 별도로 실행하여 스키마 캐시를 갱신해야 합니다.

## 🏭 생산 현장 및 스캐너 아키텍처 (2026-08-19 기록)

1. **글로벌 스마트 스캐너 (Smart Global Scanner)**
   - `AppShell` 레벨에서 `useBarcodeScanner` 훅을 통해 글로벌하게 바코드를 감지합니다.
   - 바코드 접두어(**P: 품목/작업지시서**, **M: 소재발주**) 단 두 가지만을 사용합니다.
   - **스마트 라우팅 (P 바코드)**: `P` 바코드 스캔 시 시스템이 DB 상태(`production_type`, `supply_type`, `process_logs` 상태)를 판단하여 자동으로 분기합니다.
     - 사내 가공 대기 중 -> **[생산 실적 팝업]**
     - 전체 외주/구매품 입고 대기 또는 중간 외주 복귀 -> **[외주/구매 입고 팝업]**
   - **M 바코드**: 자재 입고 처리용으로 고정.

2. **하이브리드 공정 라우팅 (Hybrid Process Routing)**
   - 관리자의 "사전 공정 설계(Pre-planned)"와 작업자의 "동적 공정 선택(Ad-hoc)"을 별도의 복잡한 테이블 없이 `process_logs`의 **상태(Status)**만으로 융합합니다.
   - 관리자가 공정을 3개 지정하면 `process_logs`에 `대기` 상태 레코드 3개가 생성됩니다. 스캔 시 Kiosk 화면은 `대기` 중인 첫 공정을 찾아서 띄워주고, 없다면 작업자가 직접 공정을 고르게 하는 방식입니다.
   - **수동 스캔 기능**: 바코드 훼손 시 작업자가 키보드로 바코드를 직접 쳐서 검색할 수 있는 "수동 검색 모드(Manual Input)"를 키오스크 화면에 함께 제공해야 합니다.


## 🔢 수주/품목 채번(PO) 규칙 및 무결성 정책 (2026-07-30 기록)

1. **무결성 제약 원칙**
   - 시스템 내부용 번호(`po_no`, `order_item_no`)는 시스템이 100% 자동 채번하며, DB 단에서 `UNIQUE` 제약 조건으로 중복을 원천 차단해야 합니다.
   - 외부 고객사 발주 번호는 사용자가 자유롭게 기입할 수 있도록 별도의 `client_po_no` 컬럼으로 분리하여 관리합니다.

2. **하이브리드(Base33) 채번 룰**
   - **사용 문자열**: `0123456789ABCDEFGHJKLMNPQRSTUVWXY` (시안성을 해치는 `I`, `O`, `Z` 제외 총 33자)
   - **부모(수주) 번호 (9자리)**: `P{YYMM}-{XXX}` 
     - 1~999까지는 숫자(`001`~`999`), 1000번째부터는 첫 글자를 알파벳으로 치환(`A00`~`A99`, `B00`~`B99`...)하여 월 최대 3,299건 소화.
   - **자식(품목) 번호 (12자리)**: `부모번호-{YY}`
     - 1~99까지는 숫자(`01`~`99`), 100번째부터는 첫 글자 알파벳(`A0`~`A9`...)으로 품목 329개 소화.

3. 🚨 [절대 규칙] "바코드(Barcode)"의 정의 및 사용처
   - 특별한 설명 없이 "바코드"를 언급할 경우, 이는 **각 개별 품목(Item)의 고유 식별 번호(`order_item_no`)**를 의미합니다.
   - 발주서(PO), 작업지시서, 출하명세서 등 실물로 출력되는 문서에 바코드를 렌더링할 때는 전체 묶음용이 아닌, **반드시 각 품목 단위(Row) 옆에 개별 바코드를 삽입**해야 합니다.
   - 목적: 사내 입고/출하 담당자가 종이 문서의 바코드를 핸드 스캐너로 스캔하여 시스템상 실물 입고/출하 처리를 1:1로 매핑하기 위함입니다.

## ☁️ Cloudflare R2 버킷 폴더 구조 및 생명주기(Lifecycle) 규칙 (2026-08-12 기록)

1. **`batch_orders/` 폴더 (임시 파일)**
   - **용도**: 이메일 발송용으로 생성된 발주서(PDF) 및 도면 ZIP 파일들이 임시로 업로드되는 경로입니다.
   - **규칙**: 클라우드 설정 상 **"7일 후 개체 삭제"** 수명 주기(Lifecycle) 규칙이 적용되어 있습니다. 따라서 7일이 지나면 이 폴더 안의 파일은 영구 삭제됩니다.
   - **주의**: 앱 내에서 영구적으로 사용해야 하는 파일(회사 로고, 사용자 프로필 등)을 절대 이 폴더나 버킷 최상단(Root)에 업로드하면 안 됩니다.

2. **기타 자산 폴더 (영구 파일)**
   - **용도**: 앱 내 UI에서 불러와야 하는 영구적인 이미지 자산(예: `assets/`, `public/`, `images/`)은 별도의 전용 폴더 접두사를 사용하여 업로드해야 합니다.
   - **주의**: 삭제 규칙(`batch_orders/`)의 영향을 받지 않는 경로인지 항상 확인하고 코드를 설계하세요.

## 📊 동적 항목(Custom Columns) 및 JSONB 맵핑 규칙 (2026-08-24 기록)

1. **동적 항목 중앙 통제 원칙**
   - 견적서 등에 들어가는 추가 비용 항목(측정 비용, 포장비 등)은 **반드시 시스템 설정(`Settings`) 메뉴의 전역 동적 항목 리스트에서만 생성/관리**되어야 합니다.
   - 견적 작성 화면에서 사용자가 '일회성 특수 항목'을 자유 타이핑으로 추가하는 UI는 **절대 구현하지 않습니다.** (엑셀 및 PDF 양식 매핑 시 데이터 정합성이 깨지기 때문입니다.)

2. **JSONB 데이터 저장 및 엑셀/PDF 출력 맵핑 룰**
   - DB 테이블(`estimate_items` 등)에는 여러 개의 동적 비용 항목이 하나의 JSONB 컬럼(`custom_costs`) 안에 Key-Value 형태로 저장됩니다.
   - **출력 맵핑 규칙**: 엑셀 프리셋이나 PDF 템플릿 빌더에서 이 동적 항목을 일반 컬럼과 구분하기 위해, 접두사 `CUSTOM_{항목명}` 또는 `(커스텀) {항목명}`을 사용합니다.
   - 추후 다른 에이전트가 `excelExport.ts`나 템플릿 렌더러 로직을 수정할 때, **이 접두사가 붙은 컬럼은 1차 테이블 컬럼이 아니라 `item.custom_costs` 내부 객체에서 값을 추출해야 한다는 점**을 반드시 명심하세요.

3. **JSONB 유령 데이터(Ghost Data) 주의**
   - 동적 항목처럼 토글(체크박스 등)로 껐다 켰다 할 수 있는 JSONB 데이터를 다룰 때, 화면에서 단순히 숨기기(UI 렌더링 제외)만 하면 기존에 기입했던 값이 DB에 남아 합산 금액 등 백그라운드 연산에 치명적인 버그(유령 연산)를 유발합니다.
   - 따라서 토글 해제 시, **반드시 상태 객체에서 해당 Key를 명시적으로 삭제(`delete obj[key]`)하여 DB에서도 완전히 소거되도록 구성**해야 합니다. (2026-08-24 조치 완료)

## 📝 수주 확정(Order Conversion) 시 데이터 복사 주의사항 (2026-09-01 기록)

1. **RPC 변환 스크립트 필드 누락 주의**
   - 견적(`estimate_items`)에서 수주(`order_items`)로 데이터를 복사하는 `convert_estimate_to_order` RPC 함수에서, 과거에 **후처리(post_processing)와 열처리(heat_treatment)** 등 부가 정보 필드를 누락한 채 복사하는 문제가 있었습니다.
   - 이로 인해 라벨 프린터 등 화면에서 해당 정보가 표시되지 않는 버그가 발생했습니다.
   - **조치 사항**: `order_items` 테이블에 `heat_treatment_name` 컬럼을 추가하고, RPC가 후처리와 열처리 이름을 정상적으로 복사하도록 수정했습니다.
   - **교훈**: 앞으로 견적/수주 관련 필드가 추가될 경우, 반드시 변환 RPC 함수(`convert_estimate_to_order`)에도 해당 필드를 복사하는 로직을 함께 업데이트해야 합니다.

## ⏪ 수주 취소 및 삭제(역방향 라이프사이클) 아키텍처 원칙 (2026-09-02 기록)

1. **물리적 삭제(Hard Delete) 금지 구역**
   - 수주 품목(`order_items`)이 발주 또는 생산으로 이관되어 하위 데이터(`material_orders`, `outsource_orders`, `process_logs`)가 단 하나라도 생성된 이후에는 **절대 DB에서 물리 삭제(Hard Delete)를 수행해서는 안 됩니다.**
   - 만약 `ON DELETE CASCADE` 등으로 하위 데이터를 날려버리면, 훗날 외주/자재 업체와 대금을 정산해야 할 '매입 발생' 이력까지 소멸되는 대참사가 발생합니다. (이전 세션에서 `fix_orphan_records.sql` 등 CASCADE 강제 스크립트를 폐기한 이유)

2. **상태 취소(Soft Cancel) 의무화**
   - 진행 중인 수주를 취소해야 할 경우, `order_items`의 `production_status`를 `'CANCELLED'`로 변경하고, 하위 대기 중인 발주/공정 레코드들도 `'발주취소'` 상태로 Cascade Update 해야 합니다.
   - 단, 하위 데이터 중 이미 **입고 완료(매입 발생)**되었거나 **공정 완료**된 건이 있다면 취소를 원천 차단하고 강력한 경고창을 띄워야 합니다.
   - *순수 대기(`PENDING`) 상태이고 하위 데이터가 아예 없는 경우에만 물리 삭제가 허용됩니다.*

## 🔔 공용 알림창 사용 원칙 (2026-09-01 기록)

1. **브라우저 기본 알림창 사용 절대 금지**
   - 코드를 새로 작성하거나 수정할 때, 브라우저의 기본 `alert()`, `window.alert()`, `confirm()`, `window.confirm()`을 **절대 사용하지 마세요.**
   - 투박한 기본 UI는 사용자 경험을 저해합니다.

2. **커스텀 컴포넌트(Toast & Confirm) 필수 사용**
   - **단순 알림/에러**: `toast` 훅을 사용하세요. (예: `toast.success('완료')`, `toast.error('에러 발생')`)
     - Import: `import { toast } from '@/shared/stores/useToastStore';`
   - **확인/취소 창**: `ConfirmProvider`의 `useConfirm` 훅을 사용하세요.
     - Import: `import { useConfirm } from '@/app/providers/ConfirmProvider';`
     - Usage: 컴포넌트 최상단에서 `const { confirm } = useConfirm();` 선언 후, `if (await confirm({ title: '...', description: '...', isDanger: true })) { ... }` 형태로 사용 (해당 함수는 반드시 `async`로 지정).

## 🏢 `company_id` 조회 및 출하 관리(Shipping) 아키텍처 원칙 (2026-09-03 기록)

1. **`useAuth().user`에 `company_id` 없음 (주의!)**
   - Supabase Auth 기본 `user` 객체에는 `company_id` 속성이 존재하지 않습니다 (`undefined`).
   - 따라서 `if (!user?.company_id) return;` 같은 코드를 작성하면 아무 에러도 없이 조용히 함수가 종료되어 데이터가 전혀 로드되지 않는 버그가 발생합니다.
   - **올바른 사용법**: 반드시 `profiles` 테이블에서 `company_id`를 조회(`supabase.from('profiles').select('company_id').eq('id', user.id).single()`)하여 사용해야 합니다.

2. **생산 관리(`useProductionList`) 조회 시 `orders.status` 제약 주의**
   - 생산 관리 목록에서 수주 데이터를 inner join할 때, 과거에 `.in('orders.status', ['PRODUCTION', 'ORDERED', 'INSPECTION'])` 형태로 하드코딩되어 있었습니다.
   - 이로 인해 수주 상세나 외부 상태 전이로 수주의 상태가 `'IN_PROGRESS'`, `'DONE'`, `'COMPLETED'` 등으로 변경되었을 때, 하위 생산 품목들이 생산 목록에서 통째로 누락되는 치명적인 버그가 발생했습니다.
   - **원칙**: 생산 관리 목록은 취소된 주문(`orders.status = 'CANCELLED'`)이 아니라면 정상적으로 조회(`neq('orders.status', 'CANCELLED')`)되어야 하며, 품목별 상태(`production_status`)로 필터링해야 합니다. (2026-09-03 조치 완료)

3. **`order_items` 테이블에는 `company_id` 컬럼 없음**
   - `order_items` 테이블 자체에는 `company_id`가 없고 부모인 `orders.company_id`에 존재합니다.
   - 쿼리 작성 시 `.eq('orders.company_id', companyId)` 형태로 부모 관계를 통해 필터링해야 42703(Undefined Column) 에러를 방지할 수 있습니다.

4. **출하 라이프사이클 및 상태 연동 (`SHIPPING_READY` -> `COMPLETED`)**
   - 현장 스캐너에서 최종 공정을 종료하면 품목은 `SHIPPING_READY`(출하 대기)가 됩니다.
   - 출하 관리(`useShippingList`)에서는 `.in('production_status', ['SHIPPING_READY', 'DONE'])` 조건으로 대기 목록을 조회합니다.
   - 출하 등록 완료 시 해당 `order_items`의 상태는 `COMPLETED`로 변경되며, 오더의 모든 품목이 출하 완료되면 부모 `orders`도 `status = 'COMPLETED'`, `shipping_status = 'shipped'`로 최종 완결 처리됩니다.
   - 실수로 등록된 출하 건은 '출하 완료' 탭에서 `[출하 취소]` 시 다시 `SHIPPING_READY`로 안전하게 롤백 복구됩니다.

5. **`useStickySearchParams` 네비게이션 무한 루프 방지 원칙 (2026-09-03 기록)**
   - `useStickySearchParams(key, defaultInit)`에서 `defaultInit`를 객체 리터럴(`{ ... }`)로 넘길 경우 매 렌더링마다 참조가 바뀌어 `useEffect` 내부에서 무한 네비게이션 루프(`react-router-dom: Throttling navigation to prevent the browser from hanging`)가 발생합니다.
   - 반드시 `useRef(defaultInit)`를 활용하고, 초기 1회 마운트 시에만 복원/기본값 세팅이 이루어지도록 `isInitializedRef` 가드를 적용해야 합니다.

6. **PDF 생성 라이브러리(`html2pdf.js`) 임포트 규칙 (2026-09-03 기록)**
   - `html2pdf.js`는 `declare const html2pdf: any;`와 같이 전역 ambient 타입 선언으로 처리하면 번들링 시 실제 모듈이 포함되지 않아 런타임에 `ReferenceError: html2pdf is not defined`가 발생합니다.
   - 반드시 `// @ts-ignore \n import html2pdf from 'html2pdf.js';`와 같이 명시적 번들 임포트를 수행해야 안전하게 동작합니다.

7. **사용자 프로필(profiles) 인적사항 업데이트 규칙 (2026-09-04 기록)**
   - `profiles` 테이블의 인적사항 컬럼: `name`, `job_title`, `phone`, `join_date`, `birth_date`, `group_id`.
   - 사용자가 처음 초대되어 가입할 때 이메일만 존재하고 `name`이 비어있을 수 있으므로, 인적사항 폼에서 관리자가 `name`을 입력/수정하여 저장(`updateUserProfile`)할 수 있도록 `UserManagementTab.tsx` 폼에 `BaseInput label="성명 (이름)"`이 필수로 배치되어 있어야 합니다.
   - UI 목록 및 상세 헤더에서는 `user.name || '(이름 미설정)'`, `user.name || user.email`과 같이 명확한 폴백 텍스트를 제공하여 직급만 표시되거나 빈 공간으로 남지 않도록 합니다.

8. **소속 그룹(User Group) 및 세부 권한 토글 상호작용 오답 노트 (2026-09-04 기록)**
   - **문제**: 소속 그룹을 '그룹 없음'으로 바꾼 뒤 세부 권한을 토글하면, 권한 업데이트로 인해 `users` 스토어가 갱신되면서 `useEffect([selectedUser])`가 재실행되어 이전 그룹(생산부 등)으로 덮어써지고 권한이 잠기던 버그.
   - **원인 및 해결**: 
     1) 소속 그룹 select 드롭다운 변경 시 불필요한 [적용] 버튼 없이 `onChange`에서 즉시 DB(`updateUserProfile`)에 반영하도록 개선.
     2) `useEffect`에 `prevUserIdRef` 가드를 두어, 다른 사용자를 클릭하여 선택 전환(`selectedUserId` 변경)할 때만 폼을 초기화하도록 통제.

9. **소프트웨어 공급사(KEP) 브랜딩 및 배포/다운로드/자동 업데이트 파이프라인 (2026-09-04 확정)**
   - **공급사 정보**: 회사명 **KEP**, 공식 도메인 **kendp.com**, 패키지 식별자 **`com.kendp.minipdm`**.
   - **비즈니스 모델**: 소규모 금속 가공 제조업체 대상 패키지/B2B 솔루션 판매.
   - **데이터 격리 (Multi-tenancy)**: 모든 데이터는 `company_id`로 철저히 물리/논리적 격리되어 있으므로, 모든 고객사는 동일한 단일 설치 프로그램(`MiniPDM Setup 1.0.0.exe`)을 설치하여 사용.
   - **🌐 고객사 전달용 앱 다운로드 공식 접속 주소**:
     - **공식 웹 다운로드 페이지**: `https://storage.kendp.com/index.html` (⚠️ 중요: Cloudflare R2는 오브젝트 스토리지 특성상 루트 `/` 접속 시 404 에러가 발생하므로, 주소 뒤에 `/index.html`을 반드시 붙여야 하거나 Cloudflare Dashboard에서 Redirect Rule(`storage.kendp.com/` -> `/index.html`)을 설정해야 함)
     - **Windows 설치 프로그램(EXE) 직접 다운로드 링크**: `https://storage.kendp.com/updates/MiniPDM%20Setup%201.0.0.exe`
   - **자동 업데이트 인프라**:
     - 엔드포인트: `https://storage.kendp.com/updates/` (Cloudflare R2 버킷 `minipdm-storage`)
     - 최신 버전 메타데이터: `https://storage.kendp.com/updates/latest.yml`
     - 빌드 명령어: `npm run build` (`vite build && electron-builder`)
     - 배포 명령어: `npm run release:upload` (`scripts/upload-release-to-r2.mjs`)
     - 클라이언트 동작: 패키징 앱 실행 5초 후 백그라운드에서 신규 버전 자동 감지/다운로드 및 재시작 시 자동 패치 적용.

10. **KEP 고객사 라이선스 관리 및 마스터 통제 아키텍처 (2026-09-07 확정)**
    - **마스터 관리자 식별**: 이메일이 `iy7847@naver.com`, `iy7847@gmail.com`, 또는 `@kendp.com` 도메인이거나 `is_master_vendor = true`인 경우 KEP 마스터 권한 자동 부여.
    - **관리 위치 ([방법 1])**: MiniPDM 데스크톱 앱 좌측 사이드바 하단 `[👑 슈퍼 관리자 (KEP) - 고객사 라이선스 관리]` 메뉴 (`/#/master/licenses`).
    - **라이선스 컬럼 (`companies` 테이블)**:
      - `license_status`: `'TRIAL'`(체험), `'ACTIVE'`(정식유료), `'EXPIRED'`(기한만료), `'SUSPENDED'`(이용정지)
      - `license_plan`: `'STANDARD'`, `'PRO'` (기본값: `'PRO'`)
      - `trial_days`: 기본 체험 일수 (기본값: 30)
      - `license_expires_at`: 만료 일시
      - `max_users`: 최대 허용 사용자 수 (기본값: 5)
      - `is_master_vendor`: 본사 여부 (`boolean`)
      - `billing_memo`: 관리자 계약/입금 메모
    - **차단 및 유예 정책**:
      - 체험판(`TRIAL`) 만료 시: 즉시 전체 화면 잠금 모달(`LicenseBlockedOverlay`).
      - 유료 고객(`ACTIVE`) 만료 시: 3일간의 결제 유예 기간(`isGracePeriod`) 부여 (상단 붉은색 긴급 배너). 3일 초과 시 잠금 모달 전환.
      - 수동 정지(`SUSPENDED`): 즉각 화면 잠금 모달 전환.
      - 사용자 수 초과(`currentUsersCount >= maxUsers`): 직원 초대 시 친절한 안내와 함께 차단.
    - **AuthProvider 로딩 타이밍 주의사항**: `supabase.auth.getSession()` 처리 시 `fetchProfileAndGroup`이 비동기로 완료되기 전에 `setLoading(false)`를 호출하면 `profile.company_id`가 null인 상태로 인식되어 온보딩(`/onboarding`) 화면으로 잘못 리다이렉트되는 버그가 발생함. 반드시 프로필 조회가 완료된 후 `setLoading(false)`를 호출할 것.
    - **슈퍼 마스터 DB RLS 정책 & 무한 재귀 방어 (2026-09-07 기록)**:
      - `companies` 테이블에 기본 RLS(`Strict company_id policy`)만 걸려 있으면 마스터 계정이라도 본인 소속 회사 1개만 조회됨.
      - 마스터 계정(`iy7847@naver.com`, `iy7847@gmail.com`, `@kendp.com`)에게 전체 열람을 허용하는 RLS 함수 `is_master_admin()` 적용 필수.
      - 🚨 **주의 (RLS 무한 재귀)**: `is_master_admin()` 함수 내부나 `profiles` 테이블 RLS 정책 내에서 `FROM profiles` 서브쿼리를 실행하면 `profiles` 조회 시 RLS가 자기 자신을 끝없이 호출하여 500 에러(Infinite recursion)가 발생함. 반드시 `auth.jwt() ->> 'email'` 기반으로 판별하고, `profiles` SELECT는 `USING (true)`로 단순화하여 재귀를 원천 차단해야 함.

11. **Electron 윈도우 타이틀 & 윈도우 데스크톱 아이콘(.ico) 패키징 규칙 (2026-09-07 기록)**
    - **창 상단 제목(`temp-app`) 버그 방지**:
      - `index.html`의 `<title>` 태그가 비어있거나 `temp-app`으로 남아있으면, Electron 창 상단 타이틀 바에 그대로 `temp-app`이 노출됨.
      - `index.html`의 `<title>MiniPDM v2.0</title>`과 `electron/main.ts`의 `new BrowserWindow({ title: 'MiniPDM v2.0', icon: ... })` 둘 다 명시적으로 설정해야 함.
    - **Windows 바로가기 및 실행 파일 아이콘(.ico) 무결성**:
      - Windows 실행 파일 및 바로가기는 단순 `.png`를 확장자만 `.ico`로 바꾼 가짜 ICO를 인식하지 못함(`Unable to set icon` 에러 또는 기본 일렉트론 파란 원자 아이콘 노출).
      - 반드시 순수 1024x1024 PNG(`build/icon.png`)와 표준 헤더 규격을 갖춘 256x256 ICO(`build/icon.ico`, `public/favicon.ico`)를 생성하여 배치하고, `package.json`의 `"build": { "icon": "build/icon.png", "win": { "icon": "build/icon.ico" } }`에 명시적으로 지정해야 윈도우 바탕화면 바로가기 및 탐색기에서 KEP 큐브 엠블럼이 선명하게 노출됨.

12. **자동 로그인(세션 유지) 및 앱 기동 속도 극대화 아키텍처 (2026-09-07 기록)**
    - **Supabase 데스크톱 세션 영속성 (`supabase.ts`)**:
      - Electron(`file://`) 환경에서 HashRouter와의 해시 URL 충돌로 인한 세션 리셋을 방지하기 위해 `detectSessionInUrl: false` 필수.
      - 명시적인 `storageKey: 'minipdm_auth_session'` 및 `storage: appStorage` 지정.
    - **Stale-While-Revalidate 로컬 프로필 캐싱 (`AuthProvider.tsx`)**:
      - 앱 기동 시 유효한 `company_id`를 가진 캐시 프로필이 있으면 `loading: false`를 0.05초 만에 풀어 대시보드로 즉시 직행.
      - 백그라운드에서 최신 프로필 비동기 동기화 (`await` 블로킹 완전 제거).
    - **무중단 자동 업데이트 파이프라인 (`electron/main.ts`, `TopBar.tsx`, `BasicInfoTab.tsx`)**:
      - `autoUpdater.autoDownload = true`: 백그라운드에서 조용히 다운로드 완료.
      - `autoUpdater.autoInstallOnAppQuit = true`: 앱 종료 시 무인 자동 설치 적용.
      - 다운로드 완료 시 상단 바(`TopBar`)에 `[새 버전 다운로드 완료]` 토스트 및 뱃지 알림 제공.

13. **[오답 노트 & 완결] Electron 기동 12초 병목의 4대 진짜 원인과 해결책 (v1.1.0, 2026-09-07 기록)**
    - **현상**: 앱 실행 시 `win.loadFile` 이후 렌더러 `bootstrap`이 시작될 때까지 정확히 12.1초간 멈춰있던 현상.
    - **과거의 잘못된 추측**: `ready-to-show` 이벤트 때문에 창이 늦게 뜬다고 오판했으나, 실제로는 브라우저 렌더러 스레드 자체가 완전히 얼어붙어 있던 것이었음.
    - **4대 진짜 원인 규명**:
      1) **Preload의 동기 IPC 블로킹 (`sendSync`)**: `preload.ts`에서 `ipcRenderer.sendSync('storage-get-all-sync')`를 호출했으나 메인 프로세스의 응답 대기로 인해 Chromium 내부 IPC 타임아웃(약 10~12초) 동안 렌더러 프로세스 메인 스레드가 100% Freeze 되었음.
      2) **`partition: 'persist:minipdm_app'` 오버헤드**: 인위적으로 파티션을 분리하여 새 세션을 초기화하면서 추가적인 디스크 I/O 락 및 네트워크 재탐색이 발생함.
      3) **Windows WPAD 프록시 스캔 타임아웃**: Windows 프록시 자동 감지로 인한 10초 스톨. (`no-proxy-server` 및 `session.defaultSession.setProxy({ mode: 'direct' })`로 해결)
      4) **Vite 8 `modulePreload: true` 오버헤드**: 로컬 `file://` 프로토콜 환경에서 8개의 `<link rel="modulepreload">` 태그로 인해 Chromium이 불필요한 네트워크 프리로딩 검사를 수행하며 지연 발생.
    - **V1 순정 아키텍처 기반 완벽 해결 (`v1.1.0`)**:
      - `preload.ts`에서 `sendSync` 완전 제거.
      - `persistentStorage.ts`를 무거운 IPC 대신 순수 `window.localStorage` + 인메모리 캐시 직결 어댑터로 전환하여 0ms 동기 처리.
      - `electron/main.ts`에서 `partition`을 제거하고 V1과 동일한 Chromium 기본 세션 및 `setProxy({ mode: 'direct' })` + `ready-to-show`로 순정 복귀.
      - `vite.config.ts`에서 `modulePreload: false` 적용 및 번들 간소화.
      - 결과: 12초 병목이 0.1초로 완전 소멸되고, 자동 로그인과 이메일 기억도 완벽히 유지됨.

14. **데스크탑 네이티브 윈도우 컨트롤 및 이벤트 최적화 규칙 (2026-09-09 기록)**
    - **Windows 프레임리스 타이틀바 오버레이와 인터랙션 분리**:
      - `titleBarStyle: 'hidden'`, `titleBarOverlay: { color: '#161B22', symbolColor: '#E6EDF3', height: 48 }` 사용 시, Windows 10/11 시스템 캡션 버튼(최소화/최대화/닫기)이 우측 상단 약 138px 너비로 오버레이됨.
      - 최상단 `TopBar`에 `style={{ WebkitAppRegion: 'drag' }}`를 적용해 창 드래그 이동을 구현할 때, 내부의 모든 클릭 가능한 요소(`button`, `input`, 프로필 메뉴, 링크)에는 반드시 `style={{ WebkitAppRegion: 'no-drag' }}`를 명시해야 마우스 클릭 및 포커스가 정상 동작함.
      - 캡션 버튼과 프로필 아바타 버튼이 겹치지 않도록 Electron 환경에서는 우측 패딩 `pr-36`을 반드시 확보해야 함.
    - **윈도우 창 상태(Bounds & Maximized) 저장 주의점**:
      - 창이 최대화(`win.isMaximized() === true`)되어 있을 때 `win.getBounds()`를 저장하면 일반 복원 시 전체 화면 크기가 일반 크기로 오염됨.
      - 최대화 상태에서는 직전의 `normal bounds`(x, y, w, h)를 그대로 보존하고 `isMaximized: true` 플래그만 기록해야 다음 실행 시 정상 복원 및 복원 해제가 가능함.
      - 듀얼 모니터 분리 시 화면 밖 렌더링 방지를 위해 `screen.getAllDisplays()`로 저장된 좌표가 유효한 디스플레이 영역에 속하는지 반드시 검증해야 함.
    - **전역 텍스트 선택 통제(`user-select: none`) 시 데이터 그리드 보호**:
      - `body`에 `user-select: none;`을 적용할 때, 엑셀형 스프레드시트 컴포넌트(`react-datasheet-grid`의 `.dsg-container`, `.dsg-cell`)와 텍스트 입력 필드(`input, textarea`), 복사가 필요한 `.selectable` 클래스에는 반드시 `user-select: text` 예외를 명시해야 사용자가 셀을 선택하고 `Ctrl+C` 복사할 수 있음.

15. **[결함 해결 & 오답 노트] 4대 핵심 결함 해결 내역 (2026-09-21 기록)**
    - **1) 수주 전환 시 `orders_order_number_key` 제약조건 중복 위반**:
      - **원인**: 과거 마이그레이션(`20260726000001`)에서 `ALTER TABLE orders ADD COLUMN order_number TEXT UNIQUE;`로 전역 UNIQUE가 걸려 있어 다른 회사가 이미 발급한 수주번호(`P2609-001` 등)와 신규 가입 회사의 첫 수주번호가 전역에서 충돌함.
      - **해결**: 전역 제약조건 `orders_order_number_key` 및 `orders_po_no_key`를 DROP하고, `UNIQUE (company_id, order_number)` 복합 고유 제약조건으로 테넌트 격리 완료. `convert_estimate_to_order` RPC 및 `createDirectOrder` 채번 충돌 회피 루프 보강.
    - **2) 3D CAD/STEP 뷰어 진입 후 2~3초 뒤 크래시/튕김**:
      - **원인**: `CadCanvas.tsx` 내부의 Three.js `animate()` 루프(requestAnimationFrame)에서 `setFrameTick((t) => (t + 1) % 60);`를 매 프레임마다 호출하여 1초에 60회씩 React 전체 컴포넌트 리렌더링 폭주 유발.
      - **해결**: `setFrameTick`을 완전 제거하고, `OrbitControls`의 `change` 이벤트 리스너에서 rAF 쓰로틀링으로 카메라를 조작할 때만 2D 오버레이 좌표를 갱신하도록 분리. 정지 상태에서는 리렌더링 0회로 CPU/메모리 부하 및 튕김 100% 소멸.
    - **3) PDF 도면 마스킹 저장 후 품목 파일 목록에 동일 파일 2개 복제**:
      - **원인**: `EstimateTable.tsx`의 `onSaveMaskedPdf`에서 DB에 이미 존재하는 파일(`maskingFile.id` 존재)임에도 `onSaveFiles`를 무조건 호출하여 `it.files`에 있던 원본 파일에 더해 `it.tempFiles`에 동일한 파일이 추가되어 화면에 2개로 표시되고 중복 저장됨.
      - **해결**: 이미 DB에 저장된 파일 마스킹 시 `files` 목록에서 기존 파일을 필터링하고 `onRemoveSingleFile`을 연계하여 단일 교체만 일어나도록 방어.
    - **4) 앱 초기 기동 시 간헐적 무한 로딩 스피너**:
      - **원인**: `AuthProvider.tsx`에서 네트워크 지연 또는 Supabase Gotrue 내부 클라이언트 잠금 시 `loading: false` 전환이 지연되어 스피너에 갇히는 현상 발생.
      - **해결**: 2초 절대 하드 타임아웃 가드(`setTimeout(() => setLoading(false), 2000)`)를 장착하여 어떠한 예외/지연 상황에서도 2초 내에 무조건 스피너를 해제하도록 보장.
