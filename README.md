# 🏭 MiniPDM v2.0 (소규모 금속 가공 제조업체 통합 관리 솔루션)

> **KEP (kendp.com) 제공**  
> 견적 · 수주 · 생산 · 출하 올인원 데스크톱 애플리케이션

---

## 📌 프로젝트 소개

**MiniPDM v2.0**은 소규모 금속 가공 제조업체(CNC, MCT, 선반, 밀링 등)를 위한 클라우드 기반 경량 ERP/MES 솔루션입니다. 복잡하고 무거운 대기업용 ERP 대신, 현장 중심의 **단일 바코드 기반 연속 흐름 MES**와 **공식 계산식(Scales.md) 연동 견적 시스템**을 제공합니다.

- **공급사**: KEP (`kendp.com`)
- **버전**: v1.0.0
- **배포망**: Cloudflare R2 (`https://storage.kendp.com`)
- **패키지 식별자**: `com.kendp.minipdm`

---

## ⚙️ 주요 기술 스택

- **Platform**: Electron + Vite + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 (GitHub Dark 테마 기반 디자인 토큰)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Edge Functions)
- **Storage**: Cloudflare R2 (`minipdm-storage` 버킷)
- **Auto Update**: `electron-updater` + Cloudflare R2 원격 CDN
- **Icons**: `lucide-react` (통일)
- **PDF Engine**: `html2pdf.js`, `qrcode.react`, `JSZip`

---

## 🚀 주요 기능

1. **견적 관리 (Estimates)**: 
   - Scales.md 공식 기반 자동 단가 산출 (소재비, 가공비, 열처리, 후처리, 이익)
   - A4 가로/세로 템플릿 빌더, QR코드, 결재란, 워터마크 지원 및 PDF 출력
2. **수주 관리 (Orders)**: 
   - 견적 ➔ 수주 원클릭 확정 RPC
   - 도면 일괄 업로드 및 묶음 다운로드, 역방향 수주 취소 무결성 방어
3. **생산 및 하이브리드 공정 라우팅 (Production & MES)**: 
   - 관리자 사전 공정 설계 + 현장 작업자 임의 공정(Ad-hoc) 하이브리드 지원
   - 작업지시서 재발행 없는 원본 단일 바코드(`P...`) 기반 부분 수량 실적 집계
4. **외주/구매 관리 (Outsource & Purchasing)**: 
   - 여러 수주 품목의 소재 묶음 발주(`M...`) 및 원클릭 발주서/도면 발송
   - Two-Line 단가 시스템 (발주 확정단가 vs 실입고 매입단가 인라인 수정 및 차액 추적)
   - 협력사용 무로그인 수신 확인(Read Receipt) Edge Function 연동
5. **입고 및 출하 관리 (Receiving & Shipping)**: 
   - 글로벌 스마트 바코드 스캐너 자동 라우팅 (소재 입고 `M`, 외주 입고 및 공정 실적 `P`)
   - 묶음 출하 전표 발행 및 중소기업 표준 2단 거래명세표(A4 상/하 2분할 공급자/공급받는자) 지원
6. **소프트웨어 라이선스 & 슈퍼 마스터 관리 (Master Licensing)**:
   - 본사(KEP) 전용 마스터 관리자 화면 (`/#/master/licenses`)
   - 전국 고객사 라이선스 모니터링, 원클릭 연장(`+30일`, `+1년`), 체험 기간(기본 30일) 및 허용 계정 수(기본 5명) 제어
   - 단계별 차단 정책 (D-7 알림 배너 ➔ 유료 만료 3일 유예 ➔ 체험 만료 즉시 잠금 오버레이)

---

## 🛠️ 개발 및 빌드 안내

### 개발 모드 실행
```bash
npm run dev
```

### 프로덕션 빌드 (Renderer + Electron Main)
```bash
npm run build
```

### 상용 인스톨러 배포 (Cloudflare R2 업로드)
```bash
npm run release:upload
```

---

## 📚 참조 문서 (Docs)

- **종합 마스터 설계서**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **DB 스키마 기준서**: [`.agents/DB_SCHEMA.md`](.agents/DB_SCHEMA.md)
- **에이전트 자율 기억 저장소**: [`.agents/MEMORY.md`](.agents/MEMORY.md)
- **작업 인수인계서**: [`HANDOFF.md`](HANDOFF.md)
- **단가/중량 계산 공식**: `Scales.md`

---

© 2026 KEP (kendp.com). All rights reserved.
