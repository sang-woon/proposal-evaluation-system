/**
 * 점수 계산 유틸리티
 * FEAT: FEAT-1
 */

/**
 * 점수 배열의 합계를 계산합니다.
 *
 * @param scores - 점수 배열
 * @returns 총점
 */
export function calculateTotal(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0);
}

/**
 * 점수 유효성을 검증합니다.
 *
 * @param score - 입력된 점수
 * @param maxScore - 최대 배점
 * @returns 검증 결과
 */
export function validateScore(
  score: number,
  maxScore: number
): { isValid: boolean; message: string } {
  if (score < 0) {
    return { isValid: false, message: '점수는 0 이상이어야 합니다.' };
  }
  if (score > maxScore) {
    return { isValid: false, message: `점수가 배점(${maxScore})을 초과했습니다.` };
  }
  return { isValid: true, message: '' };
}
