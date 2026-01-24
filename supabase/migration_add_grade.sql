-- =====================================================
-- 마이그레이션: grade 컬럼 및 evaluation 테이블 추가
-- 실행 방법: Supabase SQL Editor에서 실행
-- =====================================================

-- 1. evaluation_score 테이블에 grade 컬럼 추가
ALTER TABLE evaluation_score
ADD COLUMN IF NOT EXISTS grade TEXT;

-- 2. evaluation 테이블 생성 (평가별 종합 정보)
CREATE TABLE IF NOT EXISTS evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES evaluator(id) ON DELETE CASCADE,
    proposal_id TEXT NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    total_score NUMERIC(5,1),
    comment TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 복합 유니크 제약: 같은 평가위원이 같은 제안서를 중복 평가 불가
    UNIQUE(evaluator_id, proposal_id)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_evaluation_evaluator ON evaluation(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_proposal ON evaluation(proposal_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_score_grade ON evaluation_score(grade);

-- 4. RLS 정책 설정
ALTER TABLE evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for evaluation" ON evaluation FOR ALL USING (true) WITH CHECK (true);

-- 5. 제안사 수 설정 테이블 (관리자 설정용)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 제안사 수 설정
INSERT INTO system_config (key, value) VALUES ('proposal_count', '7')
ON CONFLICT (key) DO NOTHING;

-- RLS 정책
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);
