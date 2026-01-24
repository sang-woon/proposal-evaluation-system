# 제안평가시스템

제안서 평가를 온라인으로 진행하고, 점수를 자동으로 집계하며, 평가서를 A4로 출력할 수 있는 시스템입니다.

## 주요 기능

- **평가 입력**: 제안서별 평가항목 점수 입력
- **결과 집계**: 평가위원별, 제안서별 점수 자동 집계
- **평가서 출력**: A4 용지로 평가서 인쇄

## 기술 스택

- **프론트엔드/백엔드**: Streamlit (Python 3.11+)
- **데이터베이스**: Supabase (PostgreSQL)
- **호스팅**: Streamlit Cloud

## 시작하기

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 Supabase 설정을 입력하세요:

```bash
cp .env.example .env
```

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### 3. Supabase 테이블 생성

Supabase SQL Editor에서 `scripts/create_tables.sql`을 실행하세요.

### 4. 초기 데이터 삽입 (선택)

```bash
# Supabase SQL Editor에서 실행
scripts/seed_data.sql
```

### 5. 앱 실행

```bash
streamlit run app.py
```

## 프로젝트 구조

```
proposal-evaluation/
├── app.py                    # 메인 앱 (홈 페이지)
├── pages/
│   ├── 1_평가입력.py          # 점수 입력 페이지
│   ├── 2_결과집계.py          # 집계 결과 페이지
│   └── 3_평가서출력.py        # 출력 페이지
├── utils/
│   ├── supabase_client.py    # Supabase 연결
│   └── calculations.py       # 집계 계산 로직
├── styles/
│   └── print.css             # 인쇄용 스타일
├── scripts/
│   ├── create_tables.sql     # 테이블 생성 SQL
│   └── seed_data.sql         # 초기 데이터 SQL
├── tests/                    # 테스트 파일
├── docs/planning/            # 기획 문서
└── requirements.txt          # Python 의존성
```

## 테스트

```bash
pytest tests/ -v
```

## 배포

Streamlit Cloud에서 GitHub 저장소를 연결하면 자동으로 배포됩니다.

1. [Streamlit Cloud](https://share.streamlit.io) 접속
2. GitHub 저장소 연결
3. `app.py`를 메인 파일로 선택
4. Secrets에 환경변수 추가

## 문서

- [PRD (제품 요구사항)](docs/planning/01-prd.md)
- [TRD (기술 요구사항)](docs/planning/02-trd.md)
- [User Flow](docs/planning/03-user-flow.md)
- [Database Design](docs/planning/04-database-design.md)
- [Design System](docs/planning/05-design-system.md)
- [TASKS](docs/planning/06-tasks.md)
- [Coding Convention](docs/planning/07-coding-convention.md)
