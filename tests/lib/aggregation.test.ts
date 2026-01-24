/**
 * 집계 유틸리티 테스트 (T2.4)
 */
import { describe, it, expect } from 'vitest';
import {
  calculateAverage,
  calculateTrimmedMean,
  calculateRanking,
  identifyExtremes,
} from '@/lib/aggregation';

describe('calculateAverage', () => {
  it('should calculate average to 2 decimal places', () => {
    const scores = [85, 90, 78];
    expect(calculateAverage(scores)).toBe(84.33);
  });

  it('should return 0 for empty array', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('should handle single value', () => {
    expect(calculateAverage([50])).toBe(50);
  });

  it('should handle identical values', () => {
    expect(calculateAverage([70, 70, 70])).toBe(70);
  });
});

describe('calculateTrimmedMean', () => {
  it('should exclude highest and lowest scores', () => {
    // [50, 60, 70, 80, 90] -> 제외: 50, 90 -> 평균: (60+70+80)/3 = 70
    const scores = [50, 60, 70, 80, 90];
    expect(calculateTrimmedMean(scores)).toBe(70);
  });

  it('should return average if 2 or fewer scores', () => {
    expect(calculateTrimmedMean([50, 60])).toBe(55);
    expect(calculateTrimmedMean([50])).toBe(50);
    expect(calculateTrimmedMean([])).toBe(0);
  });

  it('should work with 3 scores', () => {
    // [50, 60, 70] -> 제외: 50, 70 -> 평균: 60
    const scores = [50, 60, 70];
    expect(calculateTrimmedMean(scores)).toBe(60);
  });
});

describe('calculateRanking', () => {
  it('should rank proposals by average score descending', () => {
    const proposals = [
      { name: 'A사', average: 85 },
      { name: 'B사', average: 90 },
      { name: 'C사', average: 78 },
    ];
    const ranked = calculateRanking(proposals);

    expect(ranked[0].name).toBe('B사');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].name).toBe('A사');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].name).toBe('C사');
    expect(ranked[2].rank).toBe(3);
  });

  it('should handle empty array', () => {
    expect(calculateRanking([])).toEqual([]);
  });

  it('should handle single proposal', () => {
    const proposals = [{ name: 'A사', average: 85 }];
    const ranked = calculateRanking(proposals);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('identifyExtremes', () => {
  it('should identify highest score', () => {
    const scores = [50, 60, 70, 80, 90];
    const result = identifyExtremes(scores, 90);
    expect(result.isHighest).toBe(true);
    expect(result.isLowest).toBe(false);
  });

  it('should identify lowest score', () => {
    const scores = [50, 60, 70, 80, 90];
    const result = identifyExtremes(scores, 50);
    expect(result.isHighest).toBe(false);
    expect(result.isLowest).toBe(true);
  });

  it('should return false for middle scores', () => {
    const scores = [50, 60, 70, 80, 90];
    const result = identifyExtremes(scores, 70);
    expect(result.isHighest).toBe(false);
    expect(result.isLowest).toBe(false);
  });

  it('should handle empty array', () => {
    const result = identifyExtremes([], 50);
    expect(result.isHighest).toBe(false);
    expect(result.isLowest).toBe(false);
  });

  it('should handle all same scores', () => {
    const scores = [70, 70, 70];
    const result = identifyExtremes(scores, 70);
    expect(result.isHighest).toBe(false);
    expect(result.isLowest).toBe(false);
  });
});
