/**
 * 평가 시스템 타입 정의
 */

// 평가 등급 (수/우/미/양/가)
export type GradeLevel = '수' | '우' | '미' | '양' | '가';

// 등급별 점수 비율 (배점의 몇 %인지)
export const GRADE_PERCENTAGES: Record<GradeLevel, number> = {
  '수': 1.0,   // 100%
  '우': 0.9,   // 90%
  '미': 0.8,   // 80%
  '양': 0.7,   // 70%
  '가': 0.6,   // 60%
};

// 평가 카테고리
export interface EvaluationCategory {
  id: string;
  name: string;
  totalScore: number;
  items: EvaluationCriterion[];
}

// 평가 항목 (세부 기준)
export interface EvaluationCriterion {
  id: string;
  categoryId: string;
  subCategory: string;      // 소분류
  name: string;             // 평가내용
  maxScore: number;         // 배점
  orderNum: number;
}

// 개별 평가 점수
export interface CriterionScore {
  criterionId: string;
  grade: GradeLevel;
  score: number;            // 계산된 점수
}

// 평가위원별 채점 결과
export interface EvaluatorScoreSheet {
  evaluatorId: string;
  evaluatorName: string;
  proposalId: string;
  proposalName: string;
  scores: CriterionScore[];
  totalScore: number;
  comment: string;
}

// 집계 결과 (한 제안서에 대한 모든 평가위원 점수)
export interface AggregatedScore {
  proposalId: string;
  proposalName: string;
  evaluatorScores: {
    evaluatorId: string;
    evaluatorName: string;
    totalScore: number;
    isHighest: boolean;
    isLowest: boolean;
  }[];
  trimmedMean: number;      // 최고/최저 제외 평균
  rawMean: number;          // 원점수 평균
}

// 사업 정보
export interface ProjectInfo {
  name: string;
  year: string;
  date: string;
}

// 양식 작성자 정보
export interface DocumentSignature {
  role: string;       // 직책
  position: string;   // 직급
  name: string;       // 성명
}

// 평가 기본 데이터 (정성적 평가 70점)
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCategory[] = [
  {
    id: 'cat-1',
    name: '전략 및 방법론',
    totalScore: 10,
    items: [
      { id: 'c1-1', categoryId: 'cat-1', subCategory: '제안배경 및 사업목표', name: '제안 배경 및 목적 기술, 사업범위·제안요건 식별의 구체성', maxScore: 4, orderNum: 1 },
      { id: 'c1-2', categoryId: 'cat-1', subCategory: '추진전략 및 사업추진 체계', name: '추진전략 타당성, 수행조직 구성 및 협력 방안의 적절성', maxScore: 2, orderNum: 2 },
      { id: 'c1-3', categoryId: 'cat-1', subCategory: '사업추진 방법론', name: '사업추진방법의 적절성 및 표준 프레임워크 적용 방안', maxScore: 3, orderNum: 3 },
      { id: 'c1-4', categoryId: 'cat-1', subCategory: '기대효과', name: '수행결과에 대한 기대효과 및 결과물 활용방안', maxScore: 1, orderNum: 4 },
    ],
  },
  {
    id: 'cat-2',
    name: '기술 및 기능',
    totalScore: 20,
    items: [
      { id: 'c2-1', categoryId: 'cat-2', subCategory: '시스템 요구사항', name: '요구 규격 충족 여부, 확장 가능성 및 유지관리 방안', maxScore: 4, orderNum: 1 },
      { id: 'c2-2', categoryId: 'cat-2', subCategory: '기능 요구사항', name: '기능 요구사항·기대사항·제약사항에 대한 구현 방안의 구체성', maxScore: 6, orderNum: 2 },
      { id: 'c2-3', categoryId: 'cat-2', subCategory: '보안 요구사항', name: '보안 구현방안의 구체성, 설계~검증 단계별 보안 적용', maxScore: 3, orderNum: 3 },
      { id: 'c2-4', categoryId: 'cat-2', subCategory: '데이터 요구사항', name: '데이터 전환 계획·검증 방법 및 오류 발생 시 처리 방안', maxScore: 3, orderNum: 4 },
      { id: 'c2-5', categoryId: 'cat-2', subCategory: '시스템운영 요구사항', name: '운영 절차 및 운영 중 이상사태 대응방안의 구체성', maxScore: 2, orderNum: 5 },
      { id: 'c2-6', categoryId: 'cat-2', subCategory: '제약사항', name: '제약조건 충족을 위한 구현 방안 및 테스트 방안', maxScore: 2, orderNum: 6 },
    ],
  },
  {
    id: 'cat-3',
    name: '성능 및 품질',
    totalScore: 17,
    items: [
      { id: 'c3-1', categoryId: 'cat-3', subCategory: '적용기술', name: '적용 기술의 확장가능성 및 실현가능성의 구체성', maxScore: 6, orderNum: 1 },
      { id: 'c3-2', categoryId: 'cat-3', subCategory: '성능요구사항', name: '성능 충족을 위한 구현·테스트 방안, 분석도구 활용 방안', maxScore: 5, orderNum: 2 },
      { id: 'c3-3', categoryId: 'cat-3', subCategory: '인터페이스 요구사항', name: '시스템 인터페이스 및 사용자 인터페이스 구축 방안', maxScore: 3, orderNum: 3 },
      { id: 'c3-4', categoryId: 'cat-3', subCategory: '품질 요구사항', name: '분석·설계·구현·테스트 단계별 품질 점검 및 검토 방안', maxScore: 3, orderNum: 4 },
    ],
  },
  {
    id: 'cat-4',
    name: '프로젝트 관리',
    totalScore: 15,
    items: [
      { id: 'c4-1', categoryId: 'cat-4', subCategory: '일정관리', name: '수행기간 및 세부 일정계획의 적절성, 산출물 연계', maxScore: 4, orderNum: 1 },
      { id: 'c4-2', categoryId: 'cat-4', subCategory: '품질관리', name: '품질관리 방안(범위·절차·점검방법) 및 품질보증 인증', maxScore: 4, orderNum: 2 },
      { id: 'c4-3', categoryId: 'cat-4', subCategory: '기밀보안 관리', name: '기밀 보호 체계 및 보안 대책의 구체성', maxScore: 3, orderNum: 3 },
      { id: 'c4-4', categoryId: 'cat-4', subCategory: '위험 및 이슈관리', name: '위험·이슈 식별·분석 및 관리계획의 구체성', maxScore: 2, orderNum: 4 },
      { id: 'c4-5', categoryId: 'cat-4', subCategory: '개발 환경', name: '개발환경 구성의 구체성 및 라이선스 문제 검토', maxScore: 2, orderNum: 5 },
    ],
  },
  {
    id: 'cat-5',
    name: '프로젝트 지원',
    totalScore: 6,
    items: [
      { id: 'c5-1', categoryId: 'cat-5', subCategory: '시험운영 계획', name: '개발 시스템의 시험운영 방법의 구체성', maxScore: 2, orderNum: 1 },
      { id: 'c5-2', categoryId: 'cat-5', subCategory: '기술지원, 교육훈련 계획', name: '기술지원 범위·내용·수준 및 교육훈련 계획의 구체성', maxScore: 2, orderNum: 2 },
      { id: 'c5-3', categoryId: 'cat-5', subCategory: '하자보수 계획', name: '하자보수 범위·조치절차 및 유지관리 계획의 구체성', maxScore: 2, orderNum: 3 },
    ],
  },
  {
    id: 'cat-6',
    name: '기타',
    totalScore: 2,
    items: [
      { id: 'c6-1', categoryId: 'cat-6', subCategory: '기타', name: '제안 내용의 성실성·독창성 및 기타 지원 사항', maxScore: 2, orderNum: 1 },
    ],
  },
];

// 정성평가 총점
export const QUALITATIVE_TOTAL_SCORE = 70;

// 등급별 점수 계산
export function calculateGradeScore(maxScore: number, grade: GradeLevel): number {
  return Math.round(maxScore * GRADE_PERCENTAGES[grade] * 10) / 10;
}

// 등급별 점수 목록 생성 (테이블 헤더용)
export function getGradeScores(maxScore: number): Record<GradeLevel, number> {
  return {
    '수': calculateGradeScore(maxScore, '수'),
    '우': calculateGradeScore(maxScore, '우'),
    '미': calculateGradeScore(maxScore, '미'),
    '양': calculateGradeScore(maxScore, '양'),
    '가': calculateGradeScore(maxScore, '가'),
  };
}
