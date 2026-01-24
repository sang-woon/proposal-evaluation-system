/**
 * 테스트용 Mock 데이터
 */
import type { Proposal, EvaluationItem, Evaluator, EvaluationScore } from '@/types/database';

export const MOCK_PROPOSALS: Proposal[] = [
  { id: '1', name: 'A사 제안', order_num: 1, created_at: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'B사 제안', order_num: 2, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', name: 'C사 제안', order_num: 3, created_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_ITEMS: EvaluationItem[] = [
  { id: '1', name: '기술적 우수성', max_score: 30, order_num: 1, category: '기술' },
  { id: '2', name: '개발방법론 적절성', max_score: 20, order_num: 2, category: '기술' },
  { id: '3', name: '사업수행 능력', max_score: 25, order_num: 3, category: '경영' },
  { id: '4', name: '가격 적정성', max_score: 25, order_num: 4, category: '경영' },
];

export const MOCK_EVALUATORS: Evaluator[] = [
  { id: '1', name: '홍길동', created_at: '2024-01-01T00:00:00Z' },
  { id: '2', name: '김철수', created_at: '2024-01-01T00:00:00Z' },
  { id: '3', name: '이영희', created_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_SCORES: EvaluationScore[] = [
  { id: '1', proposal_id: '1', evaluator_id: '1', item_id: '1', score: 25, created_at: '2024-01-01T00:00:00Z' },
  { id: '2', proposal_id: '1', evaluator_id: '1', item_id: '2', score: 18, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', proposal_id: '1', evaluator_id: '1', item_id: '3', score: 22, created_at: '2024-01-01T00:00:00Z' },
  { id: '4', proposal_id: '1', evaluator_id: '1', item_id: '4', score: 20, created_at: '2024-01-01T00:00:00Z' },
];
