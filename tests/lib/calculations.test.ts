/**
 * 점수 계산 유틸리티 테스트 (T2.3)
 */
import { describe, it, expect } from 'vitest';
import { calculateGradeScore, GRADE_PERCENTAGES } from '@/types/evaluation';

describe('calculateGradeScore', () => {
  it('should calculate 100% for grade "수"', () => {
    expect(calculateGradeScore(30, '수')).toBe(30);
    expect(calculateGradeScore(10, '수')).toBe(10);
  });

  it('should calculate 90% for grade "우"', () => {
    expect(calculateGradeScore(30, '우')).toBe(27);
    expect(calculateGradeScore(10, '우')).toBe(9);
  });

  it('should calculate 80% for grade "미"', () => {
    expect(calculateGradeScore(30, '미')).toBe(24);
    expect(calculateGradeScore(10, '미')).toBe(8);
  });

  it('should calculate 70% for grade "양"', () => {
    expect(calculateGradeScore(30, '양')).toBe(21);
    expect(calculateGradeScore(10, '양')).toBe(7);
  });

  it('should calculate 60% for grade "가"', () => {
    expect(calculateGradeScore(30, '가')).toBe(18);
    expect(calculateGradeScore(10, '가')).toBe(6);
  });

  it('should handle decimal points correctly', () => {
    // 3점 배점 * 90% = 2.7
    expect(calculateGradeScore(3, '우')).toBe(2.7);
    // 4점 배점 * 80% = 3.2
    expect(calculateGradeScore(4, '미')).toBe(3.2);
  });
});

describe('GRADE_PERCENTAGES', () => {
  it('should have correct percentages for all grades', () => {
    expect(GRADE_PERCENTAGES['수']).toBe(1.0);
    expect(GRADE_PERCENTAGES['우']).toBe(0.9);
    expect(GRADE_PERCENTAGES['미']).toBe(0.8);
    expect(GRADE_PERCENTAGES['양']).toBe(0.7);
    expect(GRADE_PERCENTAGES['가']).toBe(0.6);
  });
});

// validateScore 함수 테스트 (TASKS.md에 명시된 함수)
import { calculateTotal, validateScore } from '@/lib/calculations';

describe('calculateTotal', () => {
  it('sums all scores', () => {
    const scores = [25, 18, 20, 22];
    expect(calculateTotal(scores)).toBe(85);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('handles single value', () => {
    expect(calculateTotal([50])).toBe(50);
  });
});

describe('validateScore', () => {

  it('should return true for valid score', () => {
    const result = validateScore(25, 30);
    expect(result.isValid).toBe(true);
  });

  it('should return false for score exceeding max', () => {
    const result = validateScore(35, 30);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('초과');
  });

  it('should return false for negative score', () => {
    const result = validateScore(-5, 30);
    expect(result.isValid).toBe(false);
  });

  it('should allow zero score', () => {
    const result = validateScore(0, 30);
    expect(result.isValid).toBe(true);
  });

  it('should allow max score', () => {
    const result = validateScore(30, 30);
    expect(result.isValid).toBe(true);
  });
});
