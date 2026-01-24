-- 평가위원 테이블에 is_submitted 컬럼 추가
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. is_submitted 컬럼 추가 (기본값: false)
ALTER TABLE evaluator
ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT false;

-- 2. 기존 데이터 업데이트 (모두 미제출 상태로)
UPDATE evaluator SET is_submitted = false WHERE is_submitted IS NULL;

-- 3. NOT NULL 제약조건 추가 (선택사항)
-- ALTER TABLE evaluator ALTER COLUMN is_submitted SET NOT NULL;
