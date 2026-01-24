-- evaluation_score 테이블에 grade 컬럼 추가
ALTER TABLE evaluation_score ADD COLUMN IF NOT EXISTS grade TEXT;

-- evaluator 테이블에 is_submitted 컬럼 추가
ALTER TABLE evaluator ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT FALSE;

-- evaluation 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES evaluator(id) ON DELETE CASCADE,
    proposal_id TEXT NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    total_score NUMERIC(5,2),
    comment TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 복합 유니크 제약
    UNIQUE(evaluator_id, proposal_id)
);

-- RLS 정책 추가 (evaluation 테이블)
ALTER TABLE evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public access for evaluation" ON evaluation FOR ALL USING (true) WITH CHECK (true);

-- system_config 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public access for system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);

-- proposal_document 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS proposal_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('presentation', 'qualitative', 'security')),
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposal_document ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public access for proposal_document" ON proposal_document FOR ALL USING (true) WITH CHECK (true);
