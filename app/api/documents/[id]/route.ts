/**
 * 개별 문서 조회/삭제 API
 * GET /api/documents/[id] - 문서 정보 및 다운로드 URL
 * DELETE /api/documents/[id] - 문서 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ProposalDocument } from '@/types/document';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 문서 정보 및 다운로드 URL 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 문서 정보 조회
    const { data: document, error } = await supabase
      .from('proposal_document')
      .select('*')
      .eq('id', id)
      .single<ProposalDocument>();

    if (error || !document) {
      return NextResponse.json(
        { data: null, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 다운로드 URL 생성 (1시간 유효)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('proposal-documents')
      .createSignedUrl(document.storage_path, 3600);

    if (urlError || !signedUrl?.signedUrl) {
      return NextResponse.json(
        { data: null, error: '다운로드 URL 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        document,
        downloadUrl: signedUrl.signedUrl,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return NextResponse.json(
      { data: null, error: '문서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 문서 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 문서 정보 조회
    const { data: document, error: fetchError } = await supabase
      .from('proposal_document')
      .select('*')
      .eq('id', id)
      .single<ProposalDocument>();

    if (fetchError || !document) {
      return NextResponse.json(
        { data: null, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('proposal-documents')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Storage 삭제 실패해도 DB는 삭제 진행
    }

    // DB에서 레코드 삭제
    const { error: dbError } = await supabase
      .from('proposal_document')
      .delete()
      .eq('id', id);

    if (dbError) {
      return NextResponse.json(
        { data: null, error: `문서 삭제 실패: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        message: '문서가 삭제되었습니다.',
        deletedId: id,
      },
      error: null,
    });
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error);
    return NextResponse.json(
      { data: null, error: '문서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
