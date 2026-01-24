/**
 * 문서 업로드 API
 * POST /api/documents/upload
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  DocumentType,
  DOCUMENT_TYPE_CONFIG,
  validateFile,
  generateStoragePath,
} from '@/types/document';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const proposalId = formData.get('proposalId') as string | null;

    // 입력 검증
    if (!file) {
      return NextResponse.json(
        { data: null, error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!documentType || !DOCUMENT_TYPE_CONFIG[documentType]) {
      return NextResponse.json(
        { data: null, error: '유효하지 않은 문서 타입입니다.' },
        { status: 400 }
      );
    }

    const config = DOCUMENT_TYPE_CONFIG[documentType];

    // 제안사 필수 여부 검증
    if (config.requiresProposal && !proposalId) {
      return NextResponse.json(
        { data: null, error: `${config.labelKo}는 제안사를 선택해야 합니다.` },
        { status: 400 }
      );
    }

    // 파일 검증
    const validation = validateFile(file, documentType);
    if (!validation.valid) {
      return NextResponse.json(
        { data: null, error: validation.error },
        { status: 400 }
      );
    }

    // 제안사가 지정된 경우 존재 여부 확인
    if (proposalId) {
      const { data: proposal, error: propError } = await supabase
        .from('proposal')
        .select('id')
        .eq('id', proposalId)
        .single();

      if (propError || !proposal) {
        return NextResponse.json(
          { data: null, error: '존재하지 않는 제안사입니다.' },
          { status: 400 }
        );
      }
    }

    // 기존 문서 확인 및 삭제 (같은 제안사 + 문서타입)
    const existingQuery = supabase
      .from('proposal_document')
      .select('id, storage_path')
      .eq('document_type', documentType);

    if (proposalId) {
      existingQuery.eq('proposal_id', proposalId);
    } else {
      existingQuery.is('proposal_id', null);
    }

    const { data: existingDocs } = await existingQuery;

    // 기존 문서가 있으면 Storage와 DB에서 삭제
    if (existingDocs && existingDocs.length > 0) {
      for (const doc of existingDocs as { id: string; storage_path: string }[]) {
        // Storage에서 파일 삭제
        await supabase.storage
          .from('proposal-documents')
          .remove([doc.storage_path]);

        // DB에서 레코드 삭제
        await supabase
          .from('proposal_document')
          .delete()
          .eq('id', doc.id);
      }
    }

    // 스토리지 경로 생성
    const storagePath = generateStoragePath(proposalId, documentType, file.name);

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase Storage에 업로드
    const { error: uploadError } = await supabase.storage
      .from('proposal-documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { data: null, error: `파일 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // DB에 메타데이터 저장
    const { data: document, error: dbError } = await supabase
      .from('proposal_document')
      .insert([{
        proposal_id: proposalId || null,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        uploaded_by: 'admin',
      }])
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      // DB 실패 시 업로드된 파일 삭제
      await supabase.storage
        .from('proposal-documents')
        .remove([storagePath]);

      return NextResponse.json(
        { data: null, error: `문서 정보 저장 실패: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        document,
        message: '파일이 업로드되었습니다.',
      },
      error: null,
    });
  } catch (error) {
    console.error('POST /api/documents/upload error:', error);
    return NextResponse.json(
      { data: null, error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
