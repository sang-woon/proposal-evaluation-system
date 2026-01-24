/**
 * 문서 목록 조회 API
 * GET /api/documents
 * - ?proposalId=xxx : 특정 제안사 문서만 조회
 * - ?documentType=xxx : 특정 타입 문서만 조회
 * - ?all=true : 모든 문서 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { DocumentType, ProposalDocument } from '@/types/document';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');
    const documentType = searchParams.get('documentType') as DocumentType | null;
    const all = searchParams.get('all');

    // 쿼리 빌드
    let query = supabase
      .from('proposal_document')
      .select('*')
      .order('created_at', { ascending: false });

    if (proposalId) {
      query = query.eq('proposal_id', proposalId);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Documents query error:', error);
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      );
    }

    // 다운로드 URL 생성
    const downloadUrls: Record<string, string> = {};

    for (const doc of (documents || []) as ProposalDocument[]) {
      const { data: signedUrl } = await supabase.storage
        .from('proposal-documents')
        .createSignedUrl(doc.storage_path, 3600); // 1시간 유효

      if (signedUrl?.signedUrl) {
        downloadUrls[doc.id] = signedUrl.signedUrl;
      }
    }

    // 제안사 정보도 함께 반환 (all 모드)
    let proposals = null;
    if (all === 'true') {
      const { data: proposalsData } = await supabase
        .from('proposal')
        .select('*')
        .order('order_num');
      proposals = proposalsData;
    }

    return NextResponse.json({
      data: {
        documents: documents || [],
        downloadUrls,
        proposals,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json(
      { data: null, error: '문서 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
