/**
 * 제안서 API
 * FEAT: FEAT-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 제안서 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from('proposal')
    .select('*')
    .order('order_num');

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}

// POST: 제안서 등록
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { data: null, error: { message: '제안사 이름이 필요합니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  // 새 제안서 ID 생성
  const id = body.id || `p${Date.now()}`;

  // 현재 최대 order_num 조회
  const { data: existingProposals } = await supabase
    .from('proposal')
    .select('order_num')
    .order('order_num', { ascending: false })
    .limit(1);

  const nextOrderNum = body.order_num || ((existingProposals?.[0]?.order_num || 0) + 1);

  const { data, error } = await supabase
    .from('proposal')
    .insert({
      id,
      name: body.name,
      order_num: nextOrderNum
    } as never)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}

// DELETE: 제안서 삭제 (관련 평가 데이터도 함께 삭제)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('id');

  if (!proposalId) {
    return NextResponse.json(
      { data: null, error: { message: '제안서 ID가 필요합니다.' } },
      { status: 400 }
    );
  }

  try {
    // 1. 관련 evaluation_score 삭제
    await supabase
      .from('evaluation_score')
      .delete()
      .eq('proposal_id', proposalId);

    // 2. 관련 evaluation 삭제 (테이블이 있는 경우)
    try {
      await supabase
        .from('evaluation')
        .delete()
        .eq('proposal_id', proposalId);
    } catch {
      // evaluation 테이블이 없을 수 있음
    }

    // 3. 제안서 삭제
    const { error } = await supabase
      .from('proposal')
      .delete()
      .eq('id', proposalId);

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: `제안서 ${proposalId} 삭제 완료` },
      error: null
    });
  } catch (error) {
    console.error('DELETE /api/proposals error:', error);
    return NextResponse.json(
      { data: null, error: { message: '제안서 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
