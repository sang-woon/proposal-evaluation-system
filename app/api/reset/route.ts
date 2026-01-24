/**
 * 평가 데이터 초기화 API
 * - DELETE: 모든 평가 데이터 초기화 (평가위원, 평가점수, 평가요약)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE: 평가 데이터 초기화
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인 (간단한 헤더 체크)
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== 'admin-reset-confirmed') {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const errors: string[] = [];
    const results: string[] = [];

    // 1. evaluation_score 테이블 초기화
    const { error: scoreError } = await supabase
      .from('evaluation_score')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제

    if (scoreError) {
      errors.push(`평가점수 초기화 실패: ${scoreError.message}`);
    } else {
      results.push('평가점수 데이터 초기화 완료');
    }

    // 2. evaluation 테이블 초기화 (테이블이 있는 경우)
    try {
      const { error: evalError } = await supabase
        .from('evaluation')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (!evalError) {
        results.push('평가요약 데이터 초기화 완료');
      }
    } catch (e) {
      // evaluation 테이블이 없을 수 있음
      console.log('evaluation 테이블 초기화 스킵');
    }

    // 3. evaluator 테이블 초기화
    const { error: evaluatorError } = await supabase
      .from('evaluator')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (evaluatorError) {
      errors.push(`평가위원 초기화 실패: ${evaluatorError.message}`);
    } else {
      results.push('평가위원 데이터 초기화 완료');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        results,
        errors,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '모든 평가 데이터가 초기화되었습니다.',
      results,
    });
  } catch (error) {
    console.error('DELETE /api/reset error:', error);
    return NextResponse.json(
      { success: false, error: '초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 현재 데이터 상태 조회
export async function GET() {
  try {
    // 각 테이블의 레코드 수 조회
    const { count: evaluatorCount } = await supabase
      .from('evaluator')
      .select('*', { count: 'exact', head: true });

    const { count: scoreCount } = await supabase
      .from('evaluation_score')
      .select('*', { count: 'exact', head: true });

    let evalCount = 0;
    try {
      const { count } = await supabase
        .from('evaluation')
        .select('*', { count: 'exact', head: true });
      evalCount = count || 0;
    } catch (e) {
      // evaluation 테이블이 없을 수 있음
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluatorCount: evaluatorCount || 0,
        scoreCount: scoreCount || 0,
        evaluationCount: evalCount,
      },
    });
  } catch (error) {
    console.error('GET /api/reset error:', error);
    return NextResponse.json(
      { success: false, error: '상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
