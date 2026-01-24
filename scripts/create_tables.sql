-- ============================================
-- 제안평가시스템 테이블 생성 SQL (T0.3)
-- Supabase PostgreSQL용
-- ============================================

-- 1. 제안서 테이블
CREATE TABLE IF NOT EXISTS proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE proposal IS '제안서 정보';
COMMENT ON COLUMN proposal.name IS '제안서명 (예: A사 제안)';
COMMENT ON COLUMN proposal.order_num IS '표시 순서';

-- 2. 평가위원 테이블
CREATE TABLE IF NOT EXISTS evaluator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE evaluator IS '평가위원 정보';
COMMENT ON COLUMN evaluator.name IS '평가위원명';

-- 3. 평가항목 테이블
CREATE TABLE IF NOT EXISTS evaluation_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    order_num INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL
);

COMMENT ON TABLE evaluation_item IS '평가 항목 정의';
COMMENT ON COLUMN evaluation_item.name IS '평가내용';
COMMENT ON COLUMN evaluation_item.max_score IS '배점';
COMMENT ON COLUMN evaluation_item.category IS '평가 카테고리 (예: 기술, 경영)';

-- 4. 평가점수 테이블
CREATE TABLE IF NOT EXISTS evaluation_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES evaluator(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES evaluation_item(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
    grade VARCHAR(2) CHECK (grade IN ('수', '우', '미', '양', '가')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, evaluator_id, item_id)
);

COMMENT ON TABLE evaluation_score IS '평가위원별 점수';
COMMENT ON COLUMN evaluation_score.score IS '계산된 점수';
COMMENT ON COLUMN evaluation_score.grade IS '평가등급 (수/우/미/양/가)';

-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_proposal_order ON proposal(order_num);
CREATE INDEX IF NOT EXISTS idx_evaluation_item_order ON evaluation_item(order_num);
CREATE INDEX IF NOT EXISTS idx_evaluation_item_category ON evaluation_item(category);
CREATE INDEX IF NOT EXISTS idx_evaluation_score_proposal ON evaluation_score(proposal_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_score_evaluator ON evaluation_score(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_score_composite ON evaluation_score(proposal_id, evaluator_id);

-- ============================================
-- Row Level Security (RLS) 설정
-- ============================================

-- 테이블별 RLS 활성화 (Supabase에서 권장)
ALTER TABLE proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_score ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능한 정책
CREATE POLICY "Allow public read access on proposal"
    ON proposal FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on evaluator"
    ON evaluator FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on evaluation_item"
    ON evaluation_item FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on evaluation_score"
    ON evaluation_score FOR SELECT
    USING (true);

-- 평가점수 삽입/수정 허용 정책
CREATE POLICY "Allow public insert on evaluation_score"
    ON evaluation_score FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on evaluation_score"
    ON evaluation_score FOR UPDATE
    USING (true);
