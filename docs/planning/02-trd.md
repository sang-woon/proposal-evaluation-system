# TRD (기술 요구사항 정의서)

> 개발자/AI 코딩 파트너가 참조하는 기술 문서입니다.
> 기술 표현을 사용하되, "왜 이 선택인지"를 함께 설명합니다.

---

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | 목표 | 제안서 평가 결과 자동 집계 및 평가서 출력 |
| 2 | 페르소나 | 외부 전문가 평가위원 |
| 3 | 핵심 기능 | FEAT-1: 평가 결과 자동 집계 + A4 평가서 출력 |
| 4 | 성공 지표 (노스스타) | 모든 평가서 정상 출력 |
| 5 | 입력 지표 | 평가 항목별 점수 입력 완료율 |
| 6 | 비기능 요구 | 깔끔하고 단순한 UI, 공식적 톤앤매너 |
| 7 | Out-of-scope | 로그인 시스템, 모바일 앱, 복잡한 권한 관리 |
| 8 | Top 리스크 | A4 출력 시 레이아웃 깨짐 |
| 9 | 완화/실험 | 브라우저 인쇄 기능 테스트 (CSS @print) |
| 10 | 다음 단계 | 평가 항목 구조 정의 |

---

## 1. 시스템 아키텍처

### 1.1 고수준 아키텍처

```
┌─────────────────┐     ┌─────────────────┐
│    Next.js      │────▶│    Supabase     │
│  (App Router)   │     │  (PostgreSQL +  │
│                 │◀────│      API)       │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│     Vercel      │
│   (Hosting)     │
└─────────────────┘
```

### 1.2 컴포넌트 설명

| 컴포넌트 | 역할 | 왜 이 선택? |
|----------|------|-------------|
| Next.js 14+ | 풀스택 React 프레임워크 | App Router, 서버 컴포넌트, 최적화된 번들링 |
| TypeScript | 타입 안정성 | IDE 자동완성, 컴파일 타임 에러 감지, 유지보수성 |
| Tailwind CSS | 유틸리티 퍼스트 스타일링 | 빠른 개발, 일관된 디자인, 번들 최적화 |
| Supabase | 데이터베이스 + API | 무료 티어, PostgreSQL 기반, 실시간 지원, JS SDK |
| Vercel | 호스팅 | Next.js 공식 호스팅, Edge Runtime, 자동 배포 |

---

## 2. 권장 기술 스택

### 2.1 프론트엔드

| 항목 | 선택 | 이유 | 벤더 락인 리스크 |
|------|------|------|-----------------|
| 프레임워크 | Next.js 14+ | App Router, React Server Components | 낮음 (React 기반) |
| 언어 | TypeScript 5+ | 타입 안정성, IDE 지원 | 없음 |
| 스타일링 | Tailwind CSS 3+ | 빠른 개발, 유틸리티 퍼스트 | 낮음 |
| 상태관리 | React 내장 (useState, useContext) | 간단한 앱에 충분 | 없음 |

### 2.2 백엔드 / 데이터베이스

| 항목 | 선택 | 이유 |
|------|------|------|
| API | Next.js Route Handlers | 풀스택 통합, 간단한 API 엔드포인트 |
| 메인 DB | Supabase (PostgreSQL) | 무료 티어, 관리형 서비스, API 자동 생성 |
| ORM | Supabase JS Client | 타입 안전, 간단한 쿼리 빌더 |

### 2.3 인프라

| 항목 | 선택 | 이유 |
|------|------|------|
| 호스팅 | Vercel | Next.js 최적화, 무료 티어, GitHub 연동 |
| 도메인 | Vercel 기본 제공 | *.vercel.app 무료 |
| CI/CD | Vercel 자동 배포 | GitHub push 시 자동 배포 |

---

## 3. 비기능 요구사항

### 3.1 성능

| 항목 | 요구사항 | 측정 방법 |
|------|----------|----------|
| 초기 로딩 | < 3초 (LCP) | Lighthouse |
| API 응답 | < 500ms | 브라우저 개발자 도구 |
| 동시 사용자 | 10-20명 | 평가장 규모 기준 |

### 3.2 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 | 없음 (MVP) - 평가장 내부망 가정 |
| HTTPS | Vercel 기본 제공 |
| 입력 검증 | Zod 스키마 검증 + Supabase RLS |
| 환경 변수 | Vercel 환경 변수로 관리 |

### 3.3 확장성

| 항목 | 현재 | 목표 |
|------|------|------|
| 동시 사용자 | MVP: 20명 | v2: 100명 |
| 데이터 용량 | MVP: Supabase 무료 티어 (500MB) | v2: 유료 플랜 |

---

## 4. 외부 API 연동

### 4.1 Supabase

| 서비스 | 용도 | 필수/선택 | 연동 방식 |
|--------|------|----------|----------|
| Supabase Database | 데이터 저장/조회 | 필수 | @supabase/supabase-js |
| Supabase Auth | 인증 (v2) | 선택 | 추후 추가 가능 |

---

## 5. 접근제어/권한 모델

### 5.1 역할 정의 (MVP 간소화)

| 역할 | 설명 | 권한 |
|------|------|------|
| 평가위원 | 점수 입력자 | 점수 입력, 본인 평가서 조회/출력 |
| (관리자 화면) | 집계 결과 조회 | 전체 집계 조회 |

### 5.2 Supabase RLS (Row Level Security)

```sql
-- MVP에서는 RLS 비활성화 (anon key 사용)
-- v2에서 인증 추가 시 RLS 활성화 예정
ALTER TABLE evaluation_score ENABLE ROW LEVEL SECURITY;
```

---

## 6. 데이터 생명주기

### 6.1 원칙

- **최소 수집**: 평가에 필요한 데이터만 수집 (점수, 평가위원명)
- **명시적 목적**: 평가 집계 및 출력 용도
- **보존 기한**: 평가 완료 후 아카이브

### 6.2 데이터 흐름

```
입력 (Client) → API Route → Supabase → 집계 (Server) → 출력 (Client)
```

| 데이터 유형 | 보존 기간 | 삭제/익명화 |
|------------|----------|------------|
| 평가 점수 | 평가 완료 후 1년 | 관리자 판단 |
| 평가위원 정보 | 평가 기간 | 평가 종료 후 삭제 가능 |

---

## 7. 테스트 전략

### 7.1 개발 방식

```
┌─────────────────────────────────────────────────────────────┐
│                    테스트 피라미드                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  E2E 테스트 (선택)                                          │
│     └─ Playwright: 핵심 사용자 플로우                       │
│                                                             │
│  통합 테스트 (권장)                                          │
│     └─ API Route 테스트: Supabase 연동 확인                 │
│                                                             │
│  단위 테스트 (필수)                                          │
│     └─ Vitest: 비즈니스 로직 함수                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 테스트 도구

| 도구 | 용도 | 필수/선택 |
|------|------|----------|
| Vitest | 단위 테스트 | 권장 |
| Testing Library | 컴포넌트 테스트 | 권장 |
| Playwright | E2E 테스트 | 선택 |

### 7.3 품질 게이트

**배포 전 필수 확인:**
- [ ] TypeScript 타입 에러 없음 (`npm run type-check`)
- [ ] ESLint 에러 없음 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 점수 입력 및 저장 동작 확인
- [ ] 집계 결과 정확성 확인
- [ ] A4 출력 레이아웃 확인

---

## 8. API 설계

### 8.1 Next.js Route Handlers

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/proposals` | GET | 제안서 목록 조회 |
| `/api/evaluators` | GET, POST | 평가위원 조회/등록 |
| `/api/evaluation-items` | GET | 평가항목 조회 |
| `/api/scores` | GET, POST, PUT | 점수 조회/입력/수정 |
| `/api/aggregate` | GET | 집계 결과 조회 |

### 8.2 API 응답 형식

```typescript
// 성공 응답
interface ApiResponse<T> {
  data: T;
  error: null;
}

// 에러 응답
interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code: string;
  };
}
```

### 8.3 Supabase 클라이언트 예시

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 9. 프로젝트 구조

```
proposal-evaluation/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈페이지
│   ├── evaluation/             # 평가 입력
│   │   └── page.tsx
│   ├── results/                # 결과 집계
│   │   └── page.tsx
│   ├── print/                  # 평가서 출력
│   │   └── page.tsx
│   └── api/                    # API Route Handlers
│       ├── proposals/
│       ├── evaluators/
│       ├── evaluation-items/
│       └── scores/
├── components/                 # React 컴포넌트
│   ├── ui/                     # 공통 UI 컴포넌트
│   ├── evaluation/             # 평가 관련 컴포넌트
│   └── print/                  # 인쇄 관련 컴포넌트
├── lib/                        # 유틸리티
│   ├── supabase.ts             # Supabase 클라이언트
│   └── utils.ts                # 헬퍼 함수
├── types/                      # TypeScript 타입
│   └── database.ts             # Supabase 타입
├── styles/                     # 스타일
│   └── print.css               # 인쇄용 CSS
├── public/                     # 정적 파일
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.local                  # 환경 변수 (gitignore)
├── .env.example
└── docs/
    └── planning/               # 기획 문서
```

---

## 10. 환경 변수

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Vercel 환경 변수 설정:**
1. Vercel 대시보드 → 프로젝트 설정 → Environment Variables
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 | 영향 |
|----|------|------|------|------|
| D-04 | 프레임워크 | Next.js 14+ | App Router, RSC 지원, Vercel 최적화 | 풀스택 개발 가능 |
| D-05 | 호스팅 | Vercel | Next.js 공식 호스팅, 무료 티어 | GitHub 연동 자동 배포 |
| D-06 | DB | Supabase | 무료 티어, API 자동 생성, JS SDK | 별도 백엔드 불필요 |
| D-07 | 인증 | 없음 | 평가장 내부 사용, 빠른 접속 | 추후 Supabase Auth 추가 가능 |
| D-20 | 언어 | TypeScript | 타입 안정성, 유지보수성 | 초기 설정 필요 |
| D-21 | 스타일링 | Tailwind CSS | 빠른 개발, 일관된 디자인 | 클래스 기반 스타일링 |
