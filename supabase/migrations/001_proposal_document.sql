-- 제안서 문서 관리 테이블
-- 제안사별 발표자료, 정성적 제안서, 보안각서 저장

-- 1. proposal_document 테이블 생성
CREATE TABLE IF NOT EXISTS proposal_document (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID REFERENCES proposal(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('presentation', 'qualitative', 'security')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    uploaded_by VARCHAR(100) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_proposal_document_proposal_id ON proposal_document(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_document_document_type ON proposal_document(document_type);
CREATE INDEX IF NOT EXISTS idx_proposal_document_created_at ON proposal_document(created_at DESC);

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_proposal_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proposal_document_updated_at ON proposal_document;
CREATE TRIGGER trigger_proposal_document_updated_at
    BEFORE UPDATE ON proposal_document
    FOR EACH ROW
    EXECUTE FUNCTION update_proposal_document_updated_at();

-- 4. RLS (Row Level Security) 정책
-- 모든 사용자가 읽기 가능 (평가위원도 다운로드 가능해야 함)
ALTER TABLE proposal_document ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 인증된 사용자 (anon key 포함)
CREATE POLICY "Allow public read access" ON proposal_document
    FOR SELECT USING (true);

-- 쓰기 정책: 모든 인증된 사용자 (관리자 기능)
CREATE POLICY "Allow public insert access" ON proposal_document
    FOR INSERT WITH CHECK (true);

-- 삭제 정책: 모든 인증된 사용자 (관리자 기능)
CREATE POLICY "Allow public delete access" ON proposal_document
    FOR DELETE USING (true);

-- 업데이트 정책: 모든 인증된 사용자 (관리자 기능)
CREATE POLICY "Allow public update access" ON proposal_document
    FOR UPDATE USING (true) WITH CHECK (true);

-- 5. 코멘트 추가
COMMENT ON TABLE proposal_document IS '제안서 관련 문서 저장 테이블';
COMMENT ON COLUMN proposal_document.proposal_id IS '제안사 ID (security 타입은 NULL)';
COMMENT ON COLUMN proposal_document.document_type IS '문서 타입: presentation(발표자료), qualitative(정성적 제안서), security(보안각서)';
COMMENT ON COLUMN proposal_document.file_name IS '원본 파일명';
COMMENT ON COLUMN proposal_document.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN proposal_document.mime_type IS 'MIME 타입';
COMMENT ON COLUMN proposal_document.storage_path IS 'Supabase Storage 경로';
COMMENT ON COLUMN proposal_document.uploaded_by IS '업로드한 관리자';
