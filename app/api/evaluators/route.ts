/**
 * 평가위원 API
 * FEAT: FEAT-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 평가위원 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  // 특정 평가위원 조회
  if (name) {
    const { data, error } = await supabase
      .from('evaluator')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  }

  // 전체 목록 조회
  const { data, error } = await supabase
    .from('evaluator')
    .select('*')
    .order('created_at');

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}

// POST: 평가위원 등록
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { data: null, error: { message: '평가위원 이름이 필요합니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('evaluator')
    .insert({ name: body.name, is_submitted: false } as any)
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

// PATCH: 평가위원 정보 수정 (제출 상태 변경 등)
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (!body.id && !body.name) {
    return NextResponse.json(
      { data: null, error: { message: '평가위원 ID 또는 이름이 필요합니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.is_submitted !== undefined) {
    updateData.is_submitted = body.is_submitted;
  }

  let data;
  let error;

  if (body.id) {
    const result = await supabase
      .from('evaluator')
      .update(updateData as never)
      .eq('id', body.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else if (body.name) {
    const result = await supabase
      .from('evaluator')
      .update(updateData as never)
      .eq('name', body.name)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    return NextResponse.json(
      { data: null, error: { message: '평가위원 ID 또는 이름이 필요합니다.', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}
