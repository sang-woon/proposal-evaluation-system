/**
 * Supabase 클라이언트 설정
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 빌드 시 환경변수가 없어도 오류가 나지 않도록 처리
let supabase: SupabaseClient<Database>;

if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
} else {
  // 더미 클라이언트 (빌드 시에만 사용)
  console.warn('Supabase URL or Key is missing. Using dummy client.');

  // 체이닝을 지원하는 더미 객체
  const createChainableResult = (): any => ({
    data: null,
    error: null,
    select: () => createChainableResult(),
    single: () => createChainableResult(),
    order: () => createChainableResult(),
    eq: () => createChainableResult(),
    insert: () => createChainableResult(),
    update: () => createChainableResult(),
    upsert: () => createChainableResult(),
    delete: () => createChainableResult(),
  });

  supabase = {
    from: () => createChainableResult(),
  } as any;
}

export { supabase };
