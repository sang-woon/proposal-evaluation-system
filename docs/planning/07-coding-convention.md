# Coding Convention & AI Collaboration Guide

> TypeScript/Next.js 프로젝트를 위한 코딩 규칙과 AI 협업 가이드입니다.

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

## 1. 기술 스택 요약

| 영역 | 기술 | 버전 |
|------|------|------|
| 언어 | TypeScript | 5+ |
| 프레임워크 | Next.js (App Router) | 14+ |
| 스타일링 | Tailwind CSS | 3+ |
| 데이터베이스 | Supabase (PostgreSQL) | - |
| 호스팅 | Vercel | - |

---

## 2. TypeScript 코딩 스타일

### 2.1 기본 규칙

| 규칙 | 설명 | 예시 |
|------|------|------|
| Strict Mode | TypeScript strict 옵션 활성화 | `"strict": true` |
| 들여쓰기 | 2칸 스페이스 | - |
| 세미콜론 | 사용 | `const x = 1;` |
| 따옴표 | 싱글 쿼트 (JSX는 더블) | `'string'`, `<div className="box">` |
| 라인 길이 | 최대 100자 | - |

### 2.2 네이밍 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `proposalId`, `getProposals()` |
| 상수 | UPPER_SNAKE_CASE | `MAX_SCORE`, `API_URL` |
| 타입/인터페이스 | PascalCase | `Proposal`, `EvaluationScore` |
| 컴포넌트 | PascalCase | `ScoreInput`, `ResultTable` |
| 파일명 (컴포넌트) | PascalCase | `ScoreInput.tsx` |
| 파일명 (유틸/훅) | camelCase | `useEvaluation.ts`, `supabase.ts` |
| 폴더명 | kebab-case | `evaluation-items`, `score-input` |

### 2.3 임포트 순서

```typescript
// 1. React/Next.js 코어
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 서드파티 라이브러리
import { createClient } from '@supabase/supabase-js';

// 3. 프로젝트 내부 모듈 (절대 경로)
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

// 4. 타입 임포트
import type { Proposal, EvaluationScore } from '@/types/database';

// 5. 스타일 (필요시)
import styles from './Component.module.css';
```

---

## 3. 프로젝트 구조

```
proposal-evaluation/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈페이지
│   ├── globals.css             # 글로벌 스타일
│   ├── evaluation/             # 평가 입력
│   │   └── page.tsx
│   ├── results/                # 결과 집계
│   │   └── page.tsx
│   ├── print/                  # 평가서 출력
│   │   └── page.tsx
│   └── api/                    # API Route Handlers
│       ├── proposals/
│       │   └── route.ts
│       ├── evaluators/
│       │   └── route.ts
│       ├── evaluation-items/
│       │   └── route.ts
│       └── scores/
│           └── route.ts
├── components/                 # React 컴포넌트
│   ├── ui/                     # 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   └── Alert.tsx
│   ├── evaluation/             # 평가 관련 컴포넌트
│   │   ├── ScoreInput.tsx
│   │   ├── ScoreTable.tsx
│   │   └── EvaluatorSelect.tsx
│   └── print/                  # 인쇄 관련 컴포넌트
│       ├── EvaluationSheet.tsx
│       └── PrintButton.tsx
├── lib/                        # 유틸리티
│   ├── supabase.ts             # Supabase 클라이언트
│   └── utils.ts                # 헬퍼 함수
├── hooks/                      # 커스텀 훅
│   └── useEvaluation.ts
├── types/                      # TypeScript 타입
│   ├── database.ts             # Supabase 타입
│   └── index.ts                # 공통 타입
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

### 3.1 파일 역할

| 파일/폴더 | 역할 | FEAT |
|-----------|------|------|
| `app/page.tsx` | 홈 화면 | FEAT-0 |
| `app/evaluation/` | 점수 입력 UI | FEAT-1 |
| `app/results/` | 집계 결과 조회 | FEAT-1 |
| `app/print/` | A4 출력 | FEAT-1 |
| `app/api/` | API 엔드포인트 | 공통 |
| `lib/supabase.ts` | DB 연결 | 공통 |
| `components/` | UI 컴포넌트 | 공통 |

---

## 4. React 컴포넌트 패턴

### 4.1 서버 컴포넌트 (기본)

```typescript
// app/results/page.tsx
/**
 * 결과 집계 페이지
 * FEAT: FEAT-1
 */
import { supabase } from '@/lib/supabase';
import { ResultTable } from '@/components/evaluation/ResultTable';
import type { AggregatedResult } from '@/types';

async function getResults(): Promise<AggregatedResult[]> {
  const { data, error } = await supabase
    .from('evaluation_score')
    .select('*, proposal(*), evaluator(*)')
    .order('proposal_id');

  if (error) throw error;
  return data;
}

export default async function ResultsPage() {
  const results = await getResults();

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">결과 집계</h1>
      <ResultTable data={results} />
    </main>
  );
}
```

### 4.2 클라이언트 컴포넌트

```typescript
// components/evaluation/ScoreInput.tsx
'use client';

/**
 * 점수 입력 컴포넌트
 * FEAT: FEAT-1
 */
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import type { EvaluationItem } from '@/types';

interface ScoreInputProps {
  item: EvaluationItem;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreInput({ item, value, onChange }: ScoreInputProps) {
  const [error, setError] = useState<string>('');

  const handleChange = (newValue: number) => {
    if (newValue < 0 || newValue > item.maxScore) {
      setError(`0~${item.maxScore}점 범위로 입력해주세요.`);
      return;
    }
    setError('');
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="number"
        min={0}
        max={item.maxScore}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}
```

### 4.3 커스텀 훅 패턴

```typescript
// hooks/useEvaluation.ts
'use client';

import { useState, useCallback } from 'react';
import type { EvaluationScore, Proposal } from '@/types';

interface UseEvaluationReturn {
  scores: Record<string, number>;
  setScore: (itemId: string, score: number) => void;
  resetScores: () => void;
  isComplete: boolean;
}

export function useEvaluation(items: { id: string }[]): UseEvaluationReturn {
  const [scores, setScores] = useState<Record<string, number>>({});

  const setScore = useCallback((itemId: string, score: number) => {
    setScores((prev) => ({ ...prev, [itemId]: score }));
  }, []);

  const resetScores = useCallback(() => {
    setScores({});
  }, []);

  const isComplete = items.every((item) => item.id in scores);

  return { scores, setScore, resetScores, isComplete };
}
```

---

## 5. Supabase 연동 규칙

### 5.1 클라이언트 설정

```typescript
// lib/supabase.ts
/**
 * Supabase 클라이언트 설정
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

### 5.2 타입 정의

```typescript
// types/database.ts
/**
 * Supabase 데이터베이스 타입 정의
 *
 * Supabase CLI로 자동 생성 가능:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */
export interface Database {
  public: {
    Tables: {
      proposal: {
        Row: {
          id: string;
          name: string;
          order_num: number;
          created_at: string;
        };
        Insert: Omit<Proposal, 'id' | 'created_at'>;
        Update: Partial<Proposal>;
      };
      evaluator: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Evaluator, 'id' | 'created_at'>;
        Update: Partial<Evaluator>;
      };
      evaluation_item: {
        Row: {
          id: string;
          name: string;
          max_score: number;
          category: string;
          order_num: number;
        };
        Insert: Omit<EvaluationItem, 'id'>;
        Update: Partial<EvaluationItem>;
      };
      evaluation_score: {
        Row: {
          id: string;
          proposal_id: string;
          evaluator_id: string;
          item_id: string;
          score: number;
          created_at: string;
        };
        Insert: Omit<EvaluationScore, 'id' | 'created_at'>;
        Update: Partial<EvaluationScore>;
      };
    };
  };
}

// 편의를 위한 타입 별칭
export type Proposal = Database['public']['Tables']['proposal']['Row'];
export type Evaluator = Database['public']['Tables']['evaluator']['Row'];
export type EvaluationItem = Database['public']['Tables']['evaluation_item']['Row'];
export type EvaluationScore = Database['public']['Tables']['evaluation_score']['Row'];
```

### 5.3 API Route Handler 패턴

```typescript
// app/api/scores/route.ts
/**
 * 점수 API
 * FEAT: FEAT-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { EvaluationScore } from '@/types/database';

// GET: 점수 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');
  const evaluatorId = searchParams.get('evaluatorId');

  let query = supabase.from('evaluation_score').select('*');

  if (proposalId) query = query.eq('proposal_id', proposalId);
  if (evaluatorId) query = query.eq('evaluator_id', evaluatorId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}

// POST: 점수 저장
export async function POST(request: NextRequest) {
  const body = await request.json();

  // 입력 검증
  if (!body.proposalId || !body.evaluatorId || !body.itemId) {
    return NextResponse.json(
      { data: null, error: { message: '필수 필드가 누락되었습니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('evaluation_score')
    .upsert({
      proposal_id: body.proposalId,
      evaluator_id: body.evaluatorId,
      item_id: body.itemId,
      score: body.score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}
```

---

## 6. 에러 처리

### 6.1 API 응답 타입

```typescript
// types/index.ts
export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
```

### 6.2 클라이언트 에러 처리

```typescript
// 에러 핸들링 유틸리티
async function fetchWithError<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

// 컴포넌트에서 사용
'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';

export function ScoreForm() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setError(null);
      await fetchWithError('/api/scores', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  return (
    <form>
      {error && <Alert variant="error">{error}</Alert>}
      {/* ... */}
    </form>
  );
}
```

### 6.3 입력 검증 (Zod)

```typescript
// lib/validations.ts
import { z } from 'zod';

export const scoreSchema = z.object({
  proposalId: z.string().uuid(),
  evaluatorId: z.string().uuid(),
  itemId: z.string().uuid(),
  score: z.number().min(0).max(100),
});

export type ScoreInput = z.infer<typeof scoreSchema>;

// API에서 사용
export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = scoreSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { data: null, error: { message: result.error.message, code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  // ... 저장 로직
}
```

---

## 7. 주석 규칙

### 7.1 JSDoc (함수/타입)

```typescript
/**
 * 평가 점수 합계를 계산합니다.
 *
 * @param scores - 점수 배열
 * @returns 총점
 *
 * @example
 * const total = calculateTotal([30, 25, 45]);
 * // returns 100
 */
export function calculateTotal(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0);
}
```

### 7.2 파일 헤더

```typescript
/**
 * 결과 집계 페이지
 *
 * @description 모든 평가위원의 점수를 집계하여 표시합니다.
 * @feat FEAT-1
 */
```

### 7.3 인라인 주석

```typescript
// 점수 범위 검증 (0 ~ 배점)
if (score < 0 || score > maxScore) {
  throw new Error('점수 범위 초과');
}

// Supabase upsert: 있으면 업데이트, 없으면 삽입
const { data } = await supabase.from('evaluation_score').upsert(scoreData);
```

---

## 8. Git 규칙

### 8.1 커밋 메시지 포맷

```
<타입>: <제목> (#FEAT-n)

[본문 - 선택]

[푸터 - 선택]
```

### 8.2 커밋 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| feat | 새 기능 | `feat: 점수 입력 페이지 추가 (#FEAT-1)` |
| fix | 버그 수정 | `fix: 점수 합계 계산 오류 수정` |
| docs | 문서 | `docs: README 업데이트` |
| style | 코드 포맷 | `style: ESLint 적용` |
| refactor | 리팩토링 | `refactor: 계산 로직 분리` |
| test | 테스트 | `test: 계산 함수 테스트 추가` |
| chore | 빌드/설정 | `chore: 의존성 업데이트` |

### 8.3 브랜치 전략 (간소화)

| 브랜치 | 용도 |
|--------|------|
| main | 배포용 |
| develop | 개발 통합 (선택) |
| feat/xxx | 기능 개발 |

---

## 9. 환경 변수

### 9.1 .env.example

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 9.2 Vercel 환경 변수

1. Vercel 대시보드 → 프로젝트 설정 → Environment Variables
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
3. Production, Preview, Development 환경별 설정 가능

---

## 10. 의존성 관리

### 10.1 package.json

```json
{
  "name": "proposal-evaluation",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.55.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### 10.2 버전 고정

프로덕션 배포 시 `package-lock.json` 커밋 필수

---

## 11. AI 협업 가이드

### 11.1 코드 요청 시 컨텍스트

AI에게 코드를 요청할 때 다음 정보를 포함하세요:

```
- 현재 작업 중인 FEAT: FEAT-1
- 관련 파일: app/evaluation/page.tsx
- 요청 사항: 점수 입력 폼 구현
- 참고 문서: 04-database-design.md (테이블 구조)
```

### 11.2 코드 생성 규칙

AI가 생성하는 코드는 다음을 따릅니다:

1. **이 문서의 코딩 규칙 준수**
2. **TypeScript strict 모드 호환**
3. **FEAT 식별자 주석 포함**
4. **JSDoc 주석 필수**
5. **에러 처리 포함**
6. **접근성 속성 포함** (aria-*, role 등)

### 11.3 금지 사항

- `any` 타입 사용 (불가피한 경우 주석으로 사유 명시)
- TODO 주석만 남기고 구현하지 않기
- 플레이스홀더 코드 생성
- `console.log` 배포 코드에 포함
- 테스트되지 않은 복잡한 로직

### 11.4 타입 정의 우선

```typescript
// Good: 먼저 타입을 정의하고 구현
interface ScoreFormProps {
  proposal: Proposal;
  evaluator: Evaluator;
  items: EvaluationItem[];
  onSubmit: (scores: Record<string, number>) => Promise<void>;
}

export function ScoreForm({ proposal, evaluator, items, onSubmit }: ScoreFormProps) {
  // 구현...
}
```

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| D-17 | 언어 | TypeScript | 타입 안정성, IDE 지원, 유지보수성 |
| D-18 | 스타일 | ESLint + Prettier | Next.js 공식 권장 |
| D-19 | 커밋 포맷 | Conventional | 명확한 변경 이력 |
| D-20 | 프레임워크 | Next.js 14+ | App Router, RSC, Vercel 최적화 |
| D-21 | 스타일링 | Tailwind CSS | 빠른 개발, 일관된 디자인 |
