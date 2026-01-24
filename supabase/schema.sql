-- =====================================================
-- 제안서 평가 시스템 Supabase 스키마
-- =====================================================

-- 기존 테이블 삭제 (순서 중요: 외래키 의존성)
DROP TABLE IF EXISTS evaluation_score CASCADE;
DROP TABLE IF EXISTS evaluation_item CASCADE;
DROP TABLE IF EXISTS evaluator CASCADE;
DROP TABLE IF EXISTS proposal CASCADE;

-- =====================================================
-- 1. 제안서 테이블
-- =====================================================
CREATE TABLE proposal (
    id TEXT PRIMARY KEY,           -- 'p1', 'p2', ... 형식
    name TEXT NOT NULL,            -- '제안사 A', '제안사 B', ...
    order_num INTEGER NOT NULL,    -- 정렬 순서
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. 평가위원 테이블
-- =====================================================
CREATE TABLE evaluator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,     -- 평가위원 이름
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. 평가항목 테이블
-- =====================================================
CREATE TABLE evaluation_item (
    id TEXT PRIMARY KEY,           -- 'c1-1', 'c1-2', ... 형식
    category TEXT NOT NULL,        -- '전략 및 방법론', '기술 및 기능', ...
    sub_category TEXT NOT NULL,    -- 소분류
    name TEXT NOT NULL,            -- 평가내용
    max_score NUMERIC(4,1) NOT NULL,  -- 배점
    order_num INTEGER NOT NULL,    -- 정렬 순서
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. 평가점수 테이블
-- =====================================================
CREATE TABLE evaluation_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES evaluator(id) ON DELETE CASCADE,
    proposal_id TEXT NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES evaluation_item(id) ON DELETE CASCADE,
    score NUMERIC(4,1) NOT NULL,   -- 계산된 점수
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 복합 유니크 제약: 같은 평가위원이 같은 제안서의 같은 항목을 중복 평가 불가
    UNIQUE(evaluator_id, proposal_id, item_id)
);

-- =====================================================
-- 인덱스 생성 (성능 최적화)
-- =====================================================
CREATE INDEX idx_evaluation_score_evaluator ON evaluation_score(evaluator_id);
CREATE INDEX idx_evaluation_score_proposal ON evaluation_score(proposal_id);
CREATE INDEX idx_evaluation_score_item ON evaluation_score(item_id);
CREATE INDEX idx_proposal_order ON proposal(order_num);
CREATE INDEX idx_evaluation_item_order ON evaluation_item(order_num);

-- =====================================================
-- RLS (Row Level Security) 정책 - 공개 접근 허용
-- =====================================================
ALTER TABLE proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_score ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대해 공개 읽기/쓰기 허용 (MVP용)
CREATE POLICY "Public access for proposal" ON proposal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluator" ON evaluator FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluation_item" ON evaluation_item FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluation_score" ON evaluation_score FOR ALL USING (true) WITH CHECK (true);
