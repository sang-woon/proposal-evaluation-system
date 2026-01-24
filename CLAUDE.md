# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

제안서 평가 시스템 - 평가위원이 제안서를 평가하고 점수를 자동 집계하여 A4 평가서를 출력하는 Next.js 웹 애플리케이션.

**Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL), Vitest

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 검사
npm run type-check   # TypeScript 타입 검사
npm run test         # Vitest 테스트 (watch mode)
npm run test:run     # Vitest 테스트 (single run)
```

## Architecture

### Directory Structure
```
app/                    # Next.js App Router
├── page.tsx            # 홈페이지
├── evaluation/         # 평가 입력 페이지
├── results/            # 결과 집계 페이지
├── print/              # A4 출력 페이지
├── admin/              # 관리자 페이지
│   └── dashboard/      # 관리자 대시보드
└── api/                # API Route Handlers
    ├── proposals/
    ├── evaluators/
    ├── evaluation-items/
    ├── evaluations/
    └── scores/

components/             # React 컴포넌트
├── ui/                 # 공통 UI (Button, Input, Card, Table, Alert)
├── evaluation/         # 평가 관련 컴포넌트
└── print/              # 인쇄 관련 컴포넌트

contexts/               # React Context (AdminContext)
lib/                    # Supabase client, utilities
types/                  # TypeScript types (database.ts, evaluation.ts)
```

### Key Patterns

**Server vs Client Components**
- 서버 컴포넌트 (기본): 데이터 fetching, 정적 렌더링
- 클라이언트 컴포넌트 (`'use client'`): 상태 관리, 이벤트 핸들러

**API Response Format**
```typescript
// 성공: { data: T, error: null }
// 실패: { data: null, error: { message: string, code: string } }
```

**Admin Authentication**
- `contexts/AdminContext.tsx`: sessionStorage 기반 간단한 인증
- 하드코딩된 자격증명 (MVP용, 프로덕션에서 변경 필요)

### Database Schema (Supabase)

| Table | Description |
|-------|-------------|
| `proposal` | 제안사 (id, name, order_num) |
| `evaluator` | 평가위원 (id, name) |
| `evaluation_item` | 평가항목 (id, name, max_score, category) |
| `evaluation_score` | 평가점수 (evaluator_id, proposal_id, item_id, score, grade) |

### Evaluation System

**Grade System**: 수(100%), 우(90%), 미(80%), 양(70%), 가(60%)
- 6개 평가 카테고리, 23개 평가항목
- 정성평가 총점: 70점
- 각 항목의 배점 × 등급 비율 = 점수

**Print Output**: A4 용지 (210mm × 297mm)
- `@media print` CSS로 인쇄 최적화
- 관리자 대시보드에서 평가위원별 채점표 출력

## Coding Conventions

**Naming**
- 변수/함수: camelCase
- 타입/컴포넌트: PascalCase
- 상수: UPPER_SNAKE_CASE
- 폴더: kebab-case

**Import Order**
1. React/Next.js
2. Third-party libraries
3. Project modules (`@/`)
4. Types
5. Styles

**TypeScript**
- Strict mode enabled
- Zod for validation
- No `any` types

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Critical Features

**A4 출력 레이아웃**: Top risk - 브라우저 인쇄 시 레이아웃 깨짐 주의
- `app/globals.css`의 `@media print` 규칙 확인
- `admin/dashboard/page.tsx`의 ScoreSheet 컴포넌트

**localStorage Fallback**: Supabase 연결 실패 시 localStorage에 데이터 저장
- `app/evaluation/page.tsx`의 handleSave 로직 참조
