/**
 * 점수 API
 * FEAT: FEAT-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 점수 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');
  const evaluatorId = searchParams.get('evaluatorId');

  let query = supabase.from('evaluation_score').select('*');

  if (proposalId) query = query.eq('proposal_id', proposalId);
  if (evaluatorId) query = query.eq('evaluator_id', evaluatorId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}

// POST: 점수 저장/수정 (upsert)
export async function POST(request: NextRequest) {
  const body = await request.json();

  // 입력 검증
  if (!body.proposalId || !body.evaluatorId || !body.itemId) {
    return NextResponse.json(
      { data: null, error: { message: '필수 필드가 누락되었습니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  if (typeof body.score !== 'number' || body.score < 0) {
    return NextResponse.json(
      { data: null, error: { message: '점수는 0 이상의 숫자여야 합니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('evaluation_score')
    .upsert({
      proposal_id: body.proposalId,
      evaluator_id: body.evaluatorId,
      item_id: body.itemId,
      score: body.score,
    } as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}
