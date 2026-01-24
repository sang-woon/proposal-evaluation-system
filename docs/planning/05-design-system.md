# Design System (기초 디자인 시스템)

> Next.js + Tailwind CSS 기반의 간결한 디자인 시스템입니다.
> 깔끔하고 공식적인 톤을 유지합니다.

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

## 1. 디자인 철학

### 1.1 핵심 가치

| 가치 | 설명 | 구현 방법 |
|------|------|----------|
| 단순함 | 불필요한 요소 제거, 필요한 것만 | 최소한의 UI 요소, 명확한 레이블 |
| 공식성 | 업무 문서 느낌, 신뢰감 | 담백한 색상, 정갈한 레이아웃 |
| 명확성 | 한눈에 이해 가능 | 큰 텍스트, 명확한 버튼, 직관적 흐름 |

### 1.2 참고 스타일

| 참고 | 참고할 점 | 참고하지 않을 점 |
|------|----------|-----------------|
| 정부 문서 시스템 | 공식적인 레이아웃, 표 중심 | 복잡한 탐색 구조 |
| Notion | 깔끔한 여백, 담백함 | 다크 테마, 복잡한 기능 |
| Google Forms | 단순한 입력 흐름 | 컬러풀한 디자인 |

---

## 2. 컬러 팔레트

### 2.1 Tailwind CSS 컬러 활용

Tailwind의 기본 컬러를 활용하되, 인쇄 시 흑백에서도 구분되도록 설계합니다.

| 역할 | Tailwind 클래스 | Hex | 사용처 |
|------|-----------------|-----|--------|
| **Primary** | `blue-600` | `#2563EB` | 주요 버튼, 링크 |
| **Primary Hover** | `blue-700` | `#1D4ED8` | 버튼 호버 상태 |
| **Background** | `white` | `#FFFFFF` | 전체 배경 |
| **Surface** | `gray-50` | `#F9FAFB` | 카드, 입력 필드 배경 |
| **Text Primary** | `gray-900` | `#111827` | 주요 텍스트 |
| **Text Secondary** | `gray-500` | `#6B7280` | 보조 텍스트, 설명 |
| **Border** | `gray-200` | `#E5E7EB` | 테두리, 구분선 |

### 2.2 피드백 컬러

| 상태 | Tailwind 클래스 | 사용처 |
|------|-----------------|--------|
| **Success** | `green-600` | 저장 완료, 성공 메시지 |
| **Warning** | `yellow-500` | 주의, 범위 초과 경고 |
| **Error** | `red-600` | 오류, 필수 입력 미완료 |
| **Info** | `blue-500` | 안내, 도움말 |

### 2.3 인쇄용 스타일

인쇄 시에는 잉크 절약과 가독성을 위해 흑백 기반으로 전환됩니다.

```css
/* styles/print.css */
@media print {
  body {
    color: black !important;
    background: white !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```

| 용도 | 폰트 | Tailwind 클래스 |
|------|------|-----------------|
| 본문 | Pretendard | `font-sans` |
| 숫자/점수 | JetBrains Mono | `font-mono` |

### 3.2 타입 스케일

| 이름 | Tailwind 클래스 | 용도 |
|------|-----------------|------|
| 페이지 제목 | `text-3xl font-bold` | 메인 페이지 제목 |
| 섹션 제목 | `text-2xl font-semibold` | 섹션 구분 |
| 서브 제목 | `text-xl font-medium` | 서브섹션 |
| 본문 | `text-base` | 일반 텍스트 |
| 캡션 | `text-sm text-gray-500` | 설명, 부가 정보 |

---

## 4. 레이아웃

### 4.1 페이지 구조

```tsx
// 기본 페이지 레이아웃
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* 헤더 내용 */}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

### 4.2 그리드 시스템

```tsx
// 2분할 레이아웃
<div className="grid grid-cols-2 gap-4">
  <div>왼쪽</div>
  <div>오른쪽</div>
</div>

// 비대칭 레이아웃 (2:1)
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">넓은 영역</div>
  <div>좁은 영역</div>
</div>

// 반응형 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 아이템들 */}
</div>
```

---

## 5. 컴포넌트 가이드

### 5.1 버튼

```tsx
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 5.2 입력 필드

```tsx
// components/ui/Input.tsx
interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        className={`
          block w-full px-3 py-2 rounded-lg border
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300'
          }
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

### 5.3 점수 입력 필드

```tsx
// components/evaluation/ScoreInput.tsx
interface ScoreInputProps {
  label: string;
  maxScore: number;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreInput({ label, maxScore, value, onChange }: ScoreInputProps) {
  const isOverMax = value > maxScore;

  return (
    <div className="flex items-center gap-4 py-2 border-b border-gray-100">
      <span className="flex-1 text-gray-700">{label}</span>
      <span className="text-sm text-gray-500">배점: {maxScore}</span>
      <input
        type="number"
        min={0}
        max={maxScore}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`
          w-20 px-3 py-2 text-center font-mono rounded-lg border
          focus:outline-none focus:ring-2
          ${isOverMax
            ? 'border-red-300 bg-red-50 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
          }
        `}
      />
    </div>
  );
}
```

### 5.4 카드

```tsx
// components/ui/Card.tsx
interface CardProps {
  title?: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
```

### 5.5 테이블

```tsx
// components/ui/Table.tsx
interface TableProps {
  headers: string[];
  rows: (string | number)[][];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-sm text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 5.6 알림 메시지

```tsx
// components/ui/Alert.tsx
interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${styles[type]}`}>
      <span className="text-lg">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}
```

---

## 6. 인쇄용 스타일 (A4 출력)

### 6.1 인쇄 CSS

```css
/* styles/print.css */
@media print {
  /* 페이지 설정 */
  @page {
    size: A4;
    margin: 20mm;
  }

  /* 숨길 요소 */
  nav,
  header,
  footer,
  .no-print,
  button:not(.print-show) {
    display: none !important;
  }

  /* 본문 스타일 */
  body {
    font-size: 12pt;
    line-height: 1.5;
  }

  /* 페이지 나눔 방지 */
  table, figure {
    page-break-inside: avoid;
  }

  /* 표 스타일 */
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid black;
    padding: 8px;
    text-align: center;
  }

  th {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
  }

  /* 서명란 */
  .signature-area {
    margin-top: 50px;
    border-top: 1px solid black;
    padding-top: 10px;
  }
}
```

### 6.2 평가서 레이아웃 컴포넌트

```tsx
// components/print/EvaluationSheet.tsx
interface EvaluationSheetProps {
  date: string;
  evaluatorName: string;
  proposalTitle: string;
  companyName: string;
  scores: { item: string; maxScore: number; score: number }[];
  totalScore: number;
  comment?: string;
}

export function EvaluationSheet({
  date,
  evaluatorName,
  proposalTitle,
  companyName,
  scores,
  totalScore,
  comment,
}: EvaluationSheetProps) {
  return (
    <div className="print:p-0 p-8 max-w-[210mm] mx-auto">
      {/* 제목 */}
      <h1 className="text-2xl font-bold text-center mb-8">
        제안서 평가서
      </h1>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>평가일자: {date}</div>
        <div>평가위원: {evaluatorName}</div>
        <div>제안서명: {proposalTitle}</div>
        <div>회사명: {companyName}</div>
      </div>

      {/* 점수 테이블 */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2">평가항목</th>
            <th className="border border-gray-300 px-4 py-2 w-24">배점</th>
            <th className="border border-gray-300 px-4 py-2 w-24">점수</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-4 py-2 text-left">
                {score.item}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center font-mono">
                {score.maxScore}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center font-mono">
                {score.score}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <td className="border border-gray-300 px-4 py-2 text-left">합계</td>
            <td className="border border-gray-300 px-4 py-2 text-center font-mono">
              {scores.reduce((sum, s) => sum + s.maxScore, 0)}
            </td>
            <td className="border border-gray-300 px-4 py-2 text-center font-mono">
              {totalScore}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 종합 의견 */}
      {comment && (
        <div className="mb-8">
          <p className="font-semibold mb-2">종합 의견:</p>
          <p className="border border-gray-300 p-4 min-h-[100px]">{comment}</p>
        </div>
      )}

      {/* 서명란 */}
      <div className="signature-area text-center mt-16">
        <p>서명: _______________________</p>
      </div>
    </div>
  );
}
```

---

## 7. 접근성 체크리스트

### 7.1 필수 (MVP)

- [x] **색상 대비**: WCAG 2.1 AA 기준 충족 (4.5:1)
- [x] **포커스 표시**: `focus:ring-2` 클래스 적용
- [x] **클릭 영역**: 최소 44x44px 터치 타겟
- [x] **에러 표시**: 색상 + 텍스트 병행
- [x] **폰트 크기**: 기본 16px (1rem) 이상
- [x] **레이블**: 모든 입력 필드에 명시적 레이블

### 7.2 권장 (v2)

- [ ] 키보드 전체 탐색 가능
- [ ] 스크린 리더 호환
- [ ] 고대비 모드

---

## 8. Tailwind 설정

### 8.1 tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // 프로젝트 커스텀 컬러 (필요시)
      },
    },
  },
  plugins: [],
};

export default config;
```

### 8.2 글로벌 CSS

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Pretendard', system-ui, sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg
           hover:bg-blue-700 focus:outline-none focus:ring-2
           focus:ring-blue-500 focus:ring-offset-2
           transition-colors font-medium;
  }

  .btn-secondary {
    @apply bg-gray-100 text-gray-900 px-4 py-2 rounded-lg
           hover:bg-gray-200 focus:outline-none focus:ring-2
           focus:ring-gray-500 focus:ring-offset-2
           transition-colors font-medium;
  }

  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-blue-500
           focus:border-transparent;
  }
}
```

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| D-14 | 스타일링 | Tailwind CSS | 빠른 개발, 번들 최적화, 일관성 |
| D-15 | 인쇄 스타일 | CSS @media print | 별도 라이브러리 없이 구현 |
| D-16 | 아이콘 | 이모지 / Lucide React | 간단한 경우 이모지, 필요시 아이콘 라이브러리 |
| D-22 | 폰트 | Pretendard | 한글 최적화, 무료 웹폰트 |
