/**
 * 공통 타입 정의
 */

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// 재사용 타입
export type { Proposal, Evaluator, EvaluationItem, EvaluationScore } from './database';
