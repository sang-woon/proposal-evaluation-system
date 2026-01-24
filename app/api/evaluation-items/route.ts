/**
 * 평가항목 API
 * FEAT: FEAT-1
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 평가항목 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from('evaluation_item')
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
