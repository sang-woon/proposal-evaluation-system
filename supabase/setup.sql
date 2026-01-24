-- =====================================================
-- 제안서 평가 시스템 - 전체 설정 SQL
-- Supabase SQL Editor에서 이 파일을 실행하세요
-- =====================================================

-- =====================================================
-- PART 1: 스키마 생성
-- =====================================================

-- 기존 테이블 삭제 (순서 중요: 외래키 의존성)
DROP TABLE IF EXISTS evaluation_score CASCADE;
DROP TABLE IF EXISTS evaluation_item CASCADE;
DROP TABLE IF EXISTS evaluator CASCADE;
DROP TABLE IF EXISTS proposal CASCADE;

-- 1. 제안서 테이블
CREATE TABLE proposal (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 평가위원 테이블
CREATE TABLE evaluator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 평가항목 테이블
CREATE TABLE evaluation_item (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    name TEXT NOT NULL,
    max_score NUMERIC(4,1) NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 평가점수 테이블
CREATE TABLE evaluation_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES evaluator(id) ON DELETE CASCADE,
    proposal_id TEXT NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES evaluation_item(id) ON DELETE CASCADE,
    score NUMERIC(4,1) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(evaluator_id, proposal_id, item_id)
);

-- 인덱스 생성
CREATE INDEX idx_evaluation_score_evaluator ON evaluation_score(evaluator_id);
CREATE INDEX idx_evaluation_score_proposal ON evaluation_score(proposal_id);
CREATE INDEX idx_evaluation_score_item ON evaluation_score(item_id);
CREATE INDEX idx_proposal_order ON proposal(order_num);
CREATE INDEX idx_evaluation_item_order ON evaluation_item(order_num);

-- RLS 정책 (공개 접근 허용 - MVP용)
ALTER TABLE proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for proposal" ON proposal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluator" ON evaluator FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluation_item" ON evaluation_item FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for evaluation_score" ON evaluation_score FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PART 2: 초기 데이터 삽입
-- =====================================================

-- 제안서 7개 (A~G)
INSERT INTO proposal (id, name, order_num) VALUES
    ('p1', '제안사 A', 1),
    ('p2', '제안사 B', 2),
    ('p3', '제안사 C', 3),
    ('p4', '제안사 D', 4),
    ('p5', '제안사 E', 5),
    ('p6', '제안사 F', 6),
    ('p7', '제안사 G', 7);

-- 평가항목 23개 (6개 카테고리)

-- 카테고리 1: 전략 및 방법론 (10점, 4개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c1-1', '전략 및 방법론', '제안배경 및 사업목표', '제안 배경 및 목적 기술, 사업범위·제안요건 식별의 구체성', 4, 1),
    ('c1-2', '전략 및 방법론', '추진전략 및 사업추진 체계', '추진전략 타당성, 수행조직 구성 및 협력 방안의 적절성', 2, 2),
    ('c1-3', '전략 및 방법론', '사업추진 방법론', '사업추진방법의 적절성 및 표준 프레임워크 적용 방안', 3, 3),
    ('c1-4', '전략 및 방법론', '기대효과', '수행결과에 대한 기대효과 및 결과물 활용방안', 1, 4);

-- 카테고리 2: 기술 및 기능 (20점, 6개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c2-1', '기술 및 기능', '시스템 요구사항', '요구 규격 충족 여부, 확장 가능성 및 유지관리 방안', 4, 5),
    ('c2-2', '기술 및 기능', '기능 요구사항', '기능 요구사항·기대사항·제약사항에 대한 구현 방안의 구체성', 6, 6),
    ('c2-3', '기술 및 기능', '보안 요구사항', '보안 구현방안의 구체성, 설계~검증 단계별 보안 적용', 3, 7),
    ('c2-4', '기술 및 기능', '데이터 요구사항', '데이터 전환 계획·검증 방법 및 오류 발생 시 처리 방안', 3, 8),
    ('c2-5', '기술 및 기능', '시스템운영 요구사항', '운영 절차 및 운영 중 이상사태 대응방안의 구체성', 2, 9),
    ('c2-6', '기술 및 기능', '제약사항', '제약조건 충족을 위한 구현 방안 및 테스트 방안', 2, 10);

-- 카테고리 3: 성능 및 품질 (17점, 4개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c3-1', '성능 및 품질', '적용기술', '적용 기술의 확장가능성 및 실현가능성의 구체성', 6, 11),
    ('c3-2', '성능 및 품질', '성능요구사항', '성능 충족을 위한 구현·테스트 방안, 분석도구 활용 방안', 5, 12),
    ('c3-3', '성능 및 품질', '인터페이스 요구사항', '시스템 인터페이스 및 사용자 인터페이스 구축 방안', 3, 13),
    ('c3-4', '성능 및 품질', '품질 요구사항', '분석·설계·구현·테스트 단계별 품질 점검 및 검토 방안', 3, 14);

-- 카테고리 4: 프로젝트 관리 (15점, 5개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c4-1', '프로젝트 관리', '일정관리', '수행기간 및 세부 일정계획의 적절성, 산출물 연계', 4, 15),
    ('c4-2', '프로젝트 관리', '품질관리', '품질관리 방안(범위·절차·점검방법) 및 품질보증 인증', 4, 16),
    ('c4-3', '프로젝트 관리', '기밀보안 관리', '기밀 보호 체계 및 보안 대책의 구체성', 3, 17),
    ('c4-4', '프로젝트 관리', '위험 및 이슈관리', '위험·이슈 식별·분석 및 관리계획의 구체성', 2, 18),
    ('c4-5', '프로젝트 관리', '개발 환경', '개발환경 구성의 구체성 및 라이선스 문제 검토', 2, 19);

-- 카테고리 5: 프로젝트 지원 (6점, 3개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c5-1', '프로젝트 지원', '시험운영 계획', '개발 시스템의 시험운영 방법의 구체성', 2, 20),
    ('c5-2', '프로젝트 지원', '기술지원, 교육훈련 계획', '기술지원 범위·내용·수준 및 교육훈련 계획의 구체성', 2, 21),
    ('c5-3', '프로젝트 지원', '하자보수 계획', '하자보수 범위·조치절차 및 유지관리 계획의 구체성', 2, 22);

-- 카테고리 6: 기타 (2점, 1개 항목)
INSERT INTO evaluation_item (id, category, sub_category, name, max_score, order_num) VALUES
    ('c6-1', '기타', '기타', '제안 내용의 성실성·독창성 및 기타 지원 사항', 2, 23);

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT 'Setup completed!' AS status,
       (SELECT COUNT(*) FROM proposal) AS proposals,
       (SELECT COUNT(*) FROM evaluation_item) AS evaluation_items;
