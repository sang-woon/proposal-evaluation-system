/**
 * 집계 유틸리티
 * 최상위/최하위 점수 제외 평균 계산 포함
 */

import type { AggregatedScore, EvaluatorScoreSheet } from '@/types/evaluation';

/**
 * 점수 배열의 평균을 계산합니다.
 *
 * @param scores - 점수 배열
 * @returns 평균 (소수점 2자리)
 */
export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * 최상위와 최하위 점수를 제외한 평균(절사 평균)을 계산합니다.
 * 최상위/최하위가 2개 이상인 경우 1개씩만 제외합니다.
 *
 * @param scores - 점수 배열
 * @returns 절사 평균 (소수점 2자리)
 */
export function calculateTrimmedMean(scores: number[]): number {
  if (scores.length <= 2) {
    // 2명 이하면 절사 없이 평균 반환
    return calculateAverage(scores);
  }

  const sorted = [...scores].sort((a, b) => a - b);

  // 최하위 1개, 최상위 1개 제외
  const trimmed = sorted.slice(1, -1);

  return calculateAverage(trimmed);
}

/**
 * 최상위/최하위 여부를 판별합니다.
 *
 * @param scores - 전체 점수 배열
 * @param targetScore - 판별할 점수
 * @returns { isHighest, isLowest }
 */
export function identifyExtremes(
  scores: number[],
  targetScore: number
): { isHighest: boolean; isLowest: boolean } {
  if (scores.length === 0) {
    return { isHighest: false, isLowest: false };
  }

  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // 최고점과 최저점이 같은 경우 (모든 점수 동일)
  if (maxScore === minScore) {
    return { isHighest: false, isLowest: false };
  }

  return {
    isHighest: targetScore === maxScore,
    isLowest: targetScore === minScore,
  };
}

interface ProposalScore {
  name: string;
  average: number;
}

interface RankedProposal extends ProposalScore {
  rank: number;
}

/**
 * 제안서 목록에 순위를 매깁니다.
 *
 * @param proposals - 평균 점수가 포함된 제안서 목록
 * @returns 순위가 포함된 제안서 목록
 */
export function calculateRanking(proposals: ProposalScore[]): RankedProposal[] {
  const sorted = [...proposals].sort((a, b) => b.average - a.average);
  return sorted.map((proposal, index) => ({
    ...proposal,
    rank: index + 1,
  }));
}

/**
 * 여러 평가위원의 점수를 집계합니다.
 *
 * @param scoreSheets - 평가위원별 채점표 배열
 * @returns 집계 결과
 */
export function aggregateScores(
  proposalId: string,
  proposalName: string,
  scoreSheets: EvaluatorScoreSheet[]
): AggregatedScore {
  const totalScores = scoreSheets.map(sheet => sheet.totalScore);

  const evaluatorScores = scoreSheets.map(sheet => {
    const extremes = identifyExtremes(totalScores, sheet.totalScore);
    return {
      evaluatorId: sheet.evaluatorId,
      evaluatorName: sheet.evaluatorName,
      totalScore: sheet.totalScore,
      isHighest: extremes.isHighest,
      isLowest: extremes.isLowest,
    };
  });

  // 최고/최저가 2개 이상인 경우 1개씩만 마킹
  let highestMarked = false;
  let lowestMarked = false;

  evaluatorScores.forEach(es => {
    if (es.isHighest && highestMarked) {
      es.isHighest = false;
    } else if (es.isHighest) {
      highestMarked = true;
    }

    if (es.isLowest && lowestMarked) {
      es.isLowest = false;
    } else if (es.isLowest) {
      lowestMarked = true;
    }
  });

  return {
    proposalId,
    proposalName,
    evaluatorScores,
    trimmedMean: calculateTrimmedMean(totalScores),
    rawMean: calculateAverage(totalScores),
  };
}

/**
 * 날짜를 한국어 형식으로 포맷합니다.
 * @param date - Date 객체 또는 날짜 문자열
 * @returns "YYYY. MM. DD." 형식
 */
export function formatKoreanDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, ' ');
  const day = String(d.getDate()).padStart(2, ' ');
  return `${year}. ${month}. ${day}.`;
}
