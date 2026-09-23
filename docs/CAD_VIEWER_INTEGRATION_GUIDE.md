# 🧊 MiniPDM v2.0 - 3D CAD 뷰어 모듈 연동 가이드 (Integration Guide)

> **문서 버전**: v1.0.0  
> **대상 모듈**: `React3DViewer/src/cad-viewer`  
> **대상 시스템**: `MiniPDM v2.0` (수주, 견적 도면 관리, MES 공정 현장 단말기 등)  
> **라이선스**: 100% 상업적 이용 무료 (Three.js MIT / OpenCASCADE WASM LGPL v2.1 with Exception / GPL 배제)  
> **최종 작성일**: 2026-09-07  

---

## 📌 1. 개요 및 핵심 기능

본 모듈은 별도의 외부 CAD 뷰어 설치 없이 웹 브라우저에서 직접 **STP/STEP 3D CAD 모델**을 열람하고 가공 현장 및 견적에 필요한 정밀 치수를 추출하는 **공용 독립 3D CAD 컴포넌트**입니다.

### 주요 제공 기능
1. **고속 3D 테셀레이션**: Web Worker + WASM 기반 백그라운드 파싱 (대용량 어셈블리도 UI 멈춤 없음)
2. **가공 소재 바운딩 박스 (소재 발주 치수 자동 산출)**:
   - 전역 좌표축 정렬 바운딩 박스 (**XYZ 박스 / AABB**)
   - PCA 주성분 분석 기반 최적 회전 **최소 사이즈 바운딩 박스 (최소 박스 / OBB)** 및 부피 절감율(%) 계산
   - `mm` ↔ `in` 원클릭 단위 실시간 변환
3. **지능형 스마트 치수 측정 (Smart Measurement)**:
   - 마우스 클릭만으로 홀 직경(Ø), 원호 반경(R) 자동 감지
   - 인벤터(Inventor) 스타일 원-원 측정: **중심간 거리, 안쪽 최소거리, 바깥쪽 최대거리, 사잇각**
   - 두 평면 간 평행 수직거리, 점-면 최단거리, 3D 직선거리 및 가공 기준 $\Delta X, \Delta Y, \Delta Z$ 오프셋 산출
4. **솔리드 단면 절단 (Solid Section Capping)**:
   - X, Y, Z 축 단면 실시간 슬라이더 제어
   - Three.js 스텐실 버퍼를 이용해 **부품 고유 색상으로 꽉 찬 솔리드 단면** 채움 (속이 빈 껍질 노출 방지)
5. **CAD 전용 3단 워크스테이션 뷰 제어**:
   - 상단 통합 헤더바 (뷰 프리셋, 렌더모드, 측정, 단면 서브바, 닫기 X 버튼 1개 통합)
   - 순수 3D 캔버스 (화면을 가리는 플로팅 툴바 제거)
   - 하단 일체형 상태바 (소재 치수, 실시간 가이드 안내, 조작 단축키 통합, 겹침 0%)
   - 모서리 강조 음영(Shaded with Edges), 일반 음영, 와이어프레임
   - 배경 눈금선 제거 및 다크 테마 최적화

---

## 🚀 2. 연동 절차 (4단계 요약)

```mermaid
flowchart LR
    A[1. 패키지 설치\nnpm install] --> B[2. WASM 파일 복사\npublic/ 디렉토리]
    B --> C[3. 빌드 설정\nvite.config & index.html]
    C --> D[4. 모듈 복사 & 화면 호출\n<CadViewer />]
```

---

### Step 1. 의존성 패키지 설치 (`npm`)
MiniPDM 프로젝트 루트 터미널에서 3D 렌더링 및 OpenCASCADE WASM 라이브러리를 설치합니다:

```bash
npm install three occt-import-js
npm install -D @types/three
```

*(※ `lucide-react`, `clsx`, `tailwind-merge`는 MiniPDM에 기설치되어 있다면 추가 설치 불필요)*

---

### Step 2. 정적 WASM 파일 복사 (`public/`)
OpenCASCADE C++ 코어 테셀레이션 엔진을 구동하기 위한 2개 파일을 MiniPDM의 `public` 폴더로 복사합니다:

| 원본 위치 (`React3DViewer`) | 복사할 대상 위치 (`MiniPDM`) | 설명 |
|---|---|---|
| `public/occt-import-js.js` | `public/occt-import-js.js` | WASM 로더 자바스크립트 |
| `public/occt-import-js.wasm` | `public/occt-import-js.wasm` | OpenCASCADE WebAssembly 바이너리 (~21MB) |

#### `index.html` 스크립트 추가
MiniPDM의 `index.html` 파일의 `<head>` 태그 내부에 아래 스크립트를 추가합니다:

```html
<!-- index.html -->
<head>
  <!-- ... 기존 메타 태그 ... -->
  <script src="/occt-import-js.js"></script>
</head>
```

---

### Step 3. Vite 번들링 설정 (`vite.config.ts`)
WASM 모듈의 최적화 충돌 방지 및 Web Worker의 ES 모듈 번들링을 위해 `vite.config.ts`에 설정을 추가합니다:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ... 기존 alias 설정 유지 ...
  
  // 1. Web Worker 포맷 설정
  worker: {
    format: 'es',
  },
  
  // 2. WASM 모듈 번들링 최적화 제외 (정적 public 로드)
  optimizeDeps: {
    exclude: ['occt-import-js'],
  },
});
```

---

### Step 4. 모듈 복사 및 화면 컴포넌트 호출
`React3DViewer/src/cad-viewer` 폴더 전체를 MiniPDM의 공용 컴포넌트 경로로 복사합니다:

- **복사 경로**: `React3DViewer/src/cad-viewer` ➔ `MiniPDM/src/shared/components/cad-viewer`

---

## 💻 3. 화면 연동 코드 예시

### 1) 도면 목록에서 팝업 모달로 띄우기 (권장)
수주 상세 화면(`OrderItemsTable`)이나 견적 첨부 도면 목록에서 버튼 클릭 시 모달로 띄우는 예시입니다:

```tsx
import React, { useState } from 'react';
import { CadViewer } from '@/shared/components/cad-viewer';

export const DrawingPreviewButton: React.FC<{ fileUrl: string; fileName: string }> = ({
  fileUrl,
  fileName,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
      >
        <span>3D 도면 열기</span>
      </button>

      {/* 3D CAD 뷰어 모달 */}
      {isOpen && (
        <CadViewer
          file={fileUrl}                    // R2/S3 다운로드 URL, Blob, File, ArrayBuffer 지원
          fileName={fileName}               // 표시할 파일명 (예: "샤프트_어셈블리.stp")
          isModal={true}                    // 모달 창 모드 활성화 (어두운 배경 + ESC/닫기 버튼)
          onClose={() => setIsOpen(false)}  // 닫기 이벤트 핸들러
          onMeasurementsChange={(items) => {
            // 사용자가 화면에서 측정한 치수 내역을 실시간 수신 (견적/비고 연동 가능)
            console.log('측정된 치수 목록:', items);
          }}
        />
      )}
    </>
  );
};
```

---

### 2) 화면 내 고정 영역에 인라인 임베디드하기
도면 상세 페이지나 견적서 작성 화면의 좌측/우측 분할 패널에 뷰어를 고정 임베디드할 때의 예시입니다:

```tsx
import React from 'react';
import { CadViewer } from '@/shared/components/cad-viewer';

export const DrawingDetailPanel: React.FC<{ stpBlob: Blob; fileName: string }> = ({
  stpBlob,
  fileName,
}) => {
  return (
    <div className="w-full h-[600px] border border-border-default rounded-xl overflow-hidden shadow-md">
      <CadViewer
        file={stpBlob}
        fileName={fileName}
        isModal={false}              // 인라인 모드
        initialRenderMode="edges"    // 기본 렌더 모드: 모서리 강조 음영
        showDimensionsBanner={true}  // 하단 소재 치수 상태바 노출
      />
    </div>
  );
};
```

---

## ⚡ 4. 초고속 백그라운드 바운딩 박스 추출 API (`extractStepBoundingBox`)

3D 뷰어 화면(Three.js/Canvas/모달)을 띄우지 않고, **견적 폼이나 도면 업로드 시 백그라운드에서 0.1~0.3초 만에 소재 치수를 추출**할 수 있는 독립 순수 연산 함수입니다.

### 4-1. 단일 파일 업로드 시 자동 견적 폼 입력 예제

```typescript
import { extractStepBoundingBox } from '@/shared/components/cad-viewer';

// 파일 업로드 onChange 이벤트 핸들러 (뷰어 없이 동작)
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // ⚡ 뷰어 화면 없이 백그라운드에서 0.1~0.3초 만에 바운딩 박스 고속 추출
    const result = await extractStepBoundingBox(file);

    console.log(`[추출 성공] 소요 시간: ${result.executionTimeMs} ms`);
    console.log('가공 소재 외곽 치수 (XYZ AABB):', result.aabb.size); // [150.0, 80.0, 42.0]
    
    if (result.obb) {
      console.log('최소 사이즈 블록 치수 (최적 OBB):', result.obb.size); // [145.2, 78.5, 40.1]
      console.log(`부피 절감율: ${result.obb.volumeSavingsPercent}%`);
    }

    // MiniPDM 견적/발주 폼 State에 자동 반영!
    setQuotationForm(prev => ({
      ...prev,
      partName: result.fileName,
      rawMaterialWidth: result.aabb.size[0],
      rawMaterialLength: result.aabb.size[1],
      rawMaterialHeight: result.aabb.size[2],
      unit: result.unit, // 'mm' 또는 'in'
      // 🎯 원형(환봉) vs 사각(각재) 판정 및 추천 규격 자동 반영
      materialShape: result.shapeClassification?.shapeType, // 'round' | 'box'
      recommendedSpec: result.shapeClassification?.recommendation.label, // 예: "Ø 150.00 × 200.00 L (환봉)" 또는 "300.00 × 300.00 × 300.00 (각재)"
      outerDiameter: result.shapeClassification?.recommendation.diameter, // 환봉인 경우 외경(Ø)
    }));
  } catch (error) {
    console.error('바운딩 박스 추출 실패:', error);
  }
};
```

### 4-2. 다중 도면 일괄 업로드 시 고속 병렬 처리 (Batch Processing)

견적 등록 시 여러 개의 STEP 파일을 드래그 앤 드롭했을 때, 수십 초씩 걸리는 화면 렌더링 없이 **1~2초 만에 모든 부품의 소재 치수와 최소 블록 크기 목록을 일괄 생성**할 수 있습니다:

```typescript
import { extractStepBoundingBox, type StepBoundingBoxResult } from '@/shared/components/cad-viewer';

const handleBatchUpload = async (files: File[]) => {
  const stepFiles = files.filter(f => f.name.endsWith('.stp') || f.name.endsWith('.step'));
  
  // 병렬로 초고속 백그라운드 테셀레이션 & 치수 계산 실행
  const results: StepBoundingBoxResult[] = await Promise.all(
    stepFiles.map(file => extractStepBoundingBox(file))
  );

  // 견적 테이블 행(Rows) 자동 일괄 생성
  const quotationRows = results.map(r => ({
    fileName: r.fileName,
    materialShape: r.shapeClassification?.shapeType === 'round' ? '원형(환봉)' : '사각(각재)',
    recommendedSpec: r.shapeClassification?.recommendation.label || '-',
    materialSize: `${r.aabb.size[0]} × ${r.aabb.size[1]} × ${r.aabb.size[2]} ${r.unit}`,
    optimalBlockSize: r.obb ? `${r.obb.size[0]} × ${r.obb.size[1]} × ${r.obb.size[2]} ${r.unit}` : '-',
    savings: r.obb ? `${r.obb.volumeSavingsPercent.toFixed(1)}%` : '0%',
    meshCount: r.meshCount,
  }));

  setQuoteTableData(quotationRows);
};
```

### 4-3. D-컷/키홈 가공품의 원형 vs 사각 형상 판별 원리

제품에 D-컷(평면 깎기), 키홈, 단차 가공이 적용되어 외형이 완전한 원형이 아니더라도, 본 엔진은 다음 3단계 알고리즘으로 원소재를 정확히 판별합니다:
1. **외곽 원호(동심원) 검출**: D-컷 후 남은 원호 모서리가 외경 경계에 존재하는지 분석
2. **극좌표 외경 일관성 추적**: 중심축 둘레 각도별 외곽 정점의 최대 반경($R_{\max}$) 일치도 검사
3. **체적 충진율 검사**: 바운딩 박스 대비 메쉬 실제 체적 비율 분석 (원통 $\approx 78.5\%$, 사각 $\approx 95\%$)


---

## ⚙️ 5. `CadViewer` Props 인터페이스 상세 명세

| 속성명 (Prop) | 타입 | 기본값 | 설명 |
|---|---|:---:|---|
| **`file`** *(필수)* | `string \| Blob \| File \| ArrayBuffer` | - | 로드할 STP/STEP 파일 (원격 다운로드 URL, 로컬 File, Blob 모두 지원) |
| **`fileName`** | `string` | `'model.stp'` | 파일명 및 상단 타이틀 표시용 |
| **`isModal`** | `boolean` | `false` | `true`일 경우 전체화면 모달 컨테이너 및 닫기 헤더 적용 |
| **`onClose`** | `() => void` | `undefined` | 모달 닫기(ESC 키 또는 우상단 X 버튼) 콜백 |
| **`initialRenderMode`** | `'edges' \| 'shaded' \| 'wireframe'` | `'edges'` | 초기 렌더링 스타일 (모서리 강조, 음영, 와이어프레임) |
| **`showDimensionsBanner`** | `boolean` | `true` | 하단 가공 소재 외곽 치수(AABB / OBB) 및 상태바 표시 여부 |
| **`showGrid`** | `boolean` | `false` | 3D 바닥 눈금선(그리드) 표시 여부 (기본: 깔끔한 다크 배경) |
| **`onMeasurementsChange`** | `(items: MeasurementItem[]) => void` | `undefined` | 화면에서 추가/삭제된 치수 측정 결과 배열 콜백 |
| **`onBoundingBoxCalculated`** | `(result: StepBoundingBoxResult) => void` | `undefined` | 모델 로드 및 소재 치수 계산 완료 시 호출되는 콜백 (견적 폼 자동 연동) |
| **`className`** | `string` | `''` | 최상위 컨테이너에 적용할 추가 Tailwind CSS 클래스 |

---

## 🔧 6. 트러블슈팅 및 주의사항 (FAQ)

### Q1. 화면에 "3D CAD 모델 불러오는 중..." 스피너가 멈추고 파싱에 실패합니다.
- **원인**: `public/occt-import-js.wasm` 파일이 누락되었거나 브라우저에서 404 Not Found가 발생하는 경우입니다.
- **조치**: 
  1. 브라우저 개발자 도구(F12)의 Network 탭에서 `http://localhost:.../occt-import-js.wasm`이 200 OK로 다운로드되는지 확인합니다.
  2. `index.html`에 `<script src="/occt-import-js.js"></script>` 태그가 등록되어 있는지 점검합니다.

### Q2. 원격 서버(S3 / Cloudflare R2)의 STP URL을 넘겼을 때 CORS 에러가 발생합니다.
- **원인**: 스토리지 버킷의 CORS 설정에서 MiniPDM 도메인의 `GET` 요청이 허용되지 않은 경우입니다.
- **조치**: R2/S3 버킷의 CORS 설정에 MiniPDM 개발 및 운영 도메인(`AllowedOrigins: ["*"]`, `AllowedMethods: ["GET"]`)을 추가하거나, 백엔드 API 프록시 엔드포인트를 통해 파일을 전달합니다.

### Q3. Web Worker 파일 로드 에러 (`MIME type ('text/html') is not executable`)
- **조치**: `vite.config.ts`에 `worker: { format: 'es' }` 설정이 누락되지 않았는지 확인합니다.

---

## 📄 7. 모듈 파일 구조 요약

```
src/cad-viewer/
├── index.ts                     # 외부 노출 엔트리포인트 (컴포넌트 & extractStepBoundingBox)
├── CadViewer.tsx                # 메인 뷰어 컴포넌트
├── CadCanvas.tsx                # Three.js 3D 캔버스, 단면 절단, 솔리드 캡핑
├── CadToolbar.tsx               # 상단 통합 헤더 및 툴바 (뷰, 렌더모드, 바운딩박스, 단면 서브바)
├── CadStatusBar.tsx             # 하단 통합 상태바 (가공 소재 치수, 실시간 가이드, 단축키)
├── CadDimensionsBanner.tsx      # 하단 가공 소재 치수 배너 (옵션 컴포넌트)
├── types.ts                     # 공용 TypeScript 인터페이스 정의
│
├── utils/
│   └── extractStepBoundingBox.ts# ⚡ 뷰어 없는 초고속 바운딩 박스 백그라운드 추출 모듈
│
├── geometry/
│   ├── BoundingBoxCalculator.ts # AABB 및 PCA/자코비 고유치 최소 OBB 엔진
│   └── ShapeClassifier.ts       # 🔘 원형(환봉) vs 사각(각재) 소재 형상 자동 판정 엔진
│
├── measurement/                 # 스마트 치수 측정 서브모듈
│   ├── SnappingEngine.ts        # 점/선/원/평면 지능형 레이캐스트 스냅
│   ├── DimensionCalculator.ts   # 홀 지름, 원-원 중심거리, 면간거리 산출
│   ├── DimensionRenderer.ts     # 3D 치수선, 화살표, 라벨 Three.js 렌더러
│   ├── InventorMeasurePanel.tsx # 인벤터 스타일 플로팅 측정 패널
│   └── DimensionOverlay.tsx     # 2D 스크린 좌표 뱃지 오버레이
│
├── hooks/
│   └── useStepLoader.ts         # STP 파일 로드 및 Web Worker 파싱 관리 훅
│
└── workers/
    ├── stepParser.worker.ts     # Web Worker OpenCASCADE WASM 테셀레이션
    └── stepParserCore.ts        # 메쉬 및 홀(원) 지오메트리 위상 추출기
```

