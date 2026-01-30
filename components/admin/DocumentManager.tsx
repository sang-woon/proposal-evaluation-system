'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  DocumentType,
  ProposalDocument,
  DOCUMENT_TYPE_CONFIG,
  formatFileSize,
  validateFile,
  generateStoragePath,
} from '@/types/document';
import type { Proposal } from '@/types/database';
import { supabase } from '@/lib/supabase';

// 일괄 업로드용 파일 정보 인터페이스
interface BulkUploadFile {
  file: File;
  detectedCompany: string | null;  // 파일명에서 감지된 회사명 (A, B, C 등)
  detectedType: DocumentType | null;  // 파일명에서 감지된 문서 타입
  selectedProposalId: string | null;  // 사용자가 선택한 제안사 ID
  selectedType: DocumentType | null;  // 사용자가 선택한 문서 타입
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface DocumentManagerProps {
  proposals: Proposal[];
  onProposalsChange?: () => void;
}

export function DocumentManager({ proposals, onProposalsChange }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 일괄 업로드 상태
  const [bulkFiles, setBulkFiles] = useState<BulkUploadFile[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 파일명에서 회사명과 문서 타입 감지
  const detectFileInfo = (fileName: string): { company: string | null; type: DocumentType | null } => {
    const lowerName = fileName.toLowerCase();

    // 회사명 감지 (A~E사 또는 A~E 패턴)
    const companyMatch = fileName.match(/([A-Ea-e])(?:사)?[_\s-]/);
    const company = companyMatch ? companyMatch[1].toUpperCase() : null;

    // 문서 타입 감지
    let type: DocumentType | null = null;
    if (lowerName.includes('발표') || lowerName.includes('presentation') || lowerName.includes('ppt')) {
      type = 'presentation';
    } else if (lowerName.includes('정성') || lowerName.includes('qualitative') || lowerName.includes('제안서')) {
      type = 'qualitative';
    }

    return { company, type };
  };

  // 일괄 파일 선택 핸들러
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newBulkFiles: BulkUploadFile[] = files.map((file) => {
      const { company, type } = detectFileInfo(file.name);
      return {
        file,
        detectedCompany: company,
        detectedType: type,
        selectedProposalId: null,
        selectedType: type,
        status: 'pending' as const,
      };
    });

    setBulkFiles((prev) => [...prev, ...newBulkFiles]);
    e.target.value = '';
  };

  // 일괄 업로드 파일의 제안사 선택 변경
  const handleBulkProposalChange = (index: number, proposalId: string) => {
    setBulkFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selectedProposalId: proposalId || null } : f))
    );
  };

  // 일괄 업로드 파일의 문서 타입 선택 변경
  const handleBulkTypeChange = (index: number, type: DocumentType) => {
    setBulkFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selectedType: type } : f))
    );
  };

  // 일괄 업로드 파일 제거
  const removeBulkFile = (index: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 일괄 업로드 전체 제거
  const clearBulkFiles = () => {
    setBulkFiles([]);
  };

  // 일괄 업로드 실행 (클라이언트에서 직접 Supabase Storage로 업로드)
  const executeBulkUpload = async () => {
    // 유효성 검사
    const invalidFiles = bulkFiles.filter(
      (f) => !f.selectedProposalId || !f.selectedType
    );
    if (invalidFiles.length > 0) {
      setError('모든 파일에 제안사와 문서 타입을 선택해주세요.');
      return;
    }

    setBulkUploading(true);
    setError(null);
    setSuccess(null);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < bulkFiles.length; i++) {
      const bulkFile = bulkFiles[i];
      if (bulkFile.status === 'success') continue; // 이미 성공한 파일 스킵

      // 상태를 uploading으로 변경
      setBulkFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const file = bulkFile.file;
        const documentType = bulkFile.selectedType!;
        const proposalId = bulkFile.selectedProposalId!;

        // 1. 파일 검증
        const validation = validateFile(file, documentType);
        if (!validation.valid) {
          throw new Error(validation.error || '파일 검증 실패');
        }

        // 2. 기존 문서 확인 및 삭제
        const { data: existingDocs } = await supabase
          .from('proposal_document')
          .select('id, storage_path')
          .eq('document_type', documentType)
          .eq('proposal_id', proposalId);

        if (existingDocs && existingDocs.length > 0) {
          for (const doc of existingDocs as { id: string; storage_path: string }[]) {
            await supabase.storage
              .from('proposal-documents')
              .remove([doc.storage_path]);
            await supabase
              .from('proposal_document')
              .delete()
              .eq('id', doc.id);
          }
        }

        // 3. 스토리지 경로 생성
        const storagePath = generateStoragePath(proposalId, documentType, file.name);

        // 4. 클라이언트에서 직접 Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from('proposal-documents')
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`파일 업로드 실패: ${uploadError.message}`);
        }

        // 5. DB에 메타데이터 저장
        const { error: dbError } = await supabase
          .from('proposal_document')
          .insert({
            proposal_id: proposalId,
            document_type: documentType,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            storage_path: storagePath,
            uploaded_by: 'admin',
          } as never);

        if (dbError) {
          // DB 실패 시 업로드된 파일 삭제
          await supabase.storage
            .from('proposal-documents')
            .remove([storagePath]);
          throw new Error(`문서 정보 저장 실패: ${dbError.message}`);
        }

        setBulkFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'success' as const } : f))
        );
        successCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '업로드 실패';
        setBulkFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error' as const, errorMessage } : f
          )
        );
        errorCount++;
      }
    }

    setBulkUploading(false);
    fetchDocuments();

    if (successCount > 0) {
      setSuccess(`${successCount}개 파일 업로드 완료${errorCount > 0 ? `, ${errorCount}개 실패` : ''}`);
    } else if (errorCount > 0) {
      setError(`${errorCount}개 파일 업로드 실패`);
    }
  };

  // 문서 목록 조회
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents?all=true');
      const { data, error } = await res.json();

      if (error) {
        setError(error);
        return;
      }

      setDocuments(data.documents || []);
      setDownloadUrls(data.downloadUrls || {});
    } catch {
      setError('문서 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 파일 업로드 (클라이언트에서 직접 Supabase Storage로 업로드)
  const handleUpload = async (
    file: File,
    documentType: DocumentType,
    proposalId: string | null
  ) => {
    const uploadKey = proposalId ? `${proposalId}-${documentType}` : documentType;
    setUploading(uploadKey);
    setError(null);
    setSuccess(null);

    try {
      // 1. 파일 검증
      const validation = validateFile(file, documentType);
      if (!validation.valid) {
        setError(validation.error || '파일 검증 실패');
        return;
      }

      // 2. 기존 문서 확인 및 삭제
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
          await supabase.storage
            .from('proposal-documents')
            .remove([doc.storage_path]);
          await supabase
            .from('proposal_document')
            .delete()
            .eq('id', doc.id);
        }
      }

      // 3. 스토리지 경로 생성
      const storagePath = generateStoragePath(proposalId, documentType, file.name);

      // 4. 클라이언트에서 직접 Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('proposal-documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        setError(`파일 업로드 실패: ${uploadError.message}`);
        return;
      }

      // 5. DB에 메타데이터 저장
      const { error: dbError } = await supabase
        .from('proposal_document')
        .insert({
          proposal_id: proposalId || null,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          storage_path: storagePath,
          uploaded_by: 'admin',
        } as never);

      if (dbError) {
        console.error('DB insert error:', dbError);
        // DB 실패 시 업로드된 파일 삭제
        await supabase.storage
          .from('proposal-documents')
          .remove([storagePath]);
        setError(`문서 정보 저장 실패: ${dbError.message}`);
        return;
      }

      setSuccess('파일이 업로드되었습니다.');
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      setError('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(null);
    }
  };

  // 파일 삭제
  const handleDelete = async (documentId: string) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      const { data, error } = await res.json();

      if (error) {
        setError(error);
        return;
      }

      setSuccess(data.message);
      fetchDocuments();
    } catch {
      setError('문서 삭제 중 오류가 발생했습니다.');
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: DocumentType,
    proposalId: string | null
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, documentType, proposalId);
    }
    e.target.value = '';
  };

  // 특정 제안사/타입의 문서 찾기
  const getDocument = (proposalId: string | null, documentType: DocumentType) => {
    return documents.find(
      (doc) =>
        doc.document_type === documentType &&
        (proposalId ? doc.proposal_id === proposalId : doc.proposal_id === null)
    );
  };

  // 문서의 제안사 변경
  const handleChangeProposal = async (documentId: string, newProposalId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: newProposalId }),
      });

      const { error } = await res.json();

      if (error) {
        setError(error);
        return;
      }

      setSuccess('문서의 제안사가 변경되었습니다.');
      fetchDocuments();
    } catch {
      setError('제안사 변경 중 오류가 발생했습니다.');
    }
  };

  // 업로드 버튼 클릭
  const triggerUpload = (key: string) => {
    fileInputRefs.current[key]?.click();
  };

  if (loading) {
    return <div className="text-center py-8">문서 정보를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClick={() => setError(null)} className="cursor-pointer">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClick={() => setSuccess(null)} className="cursor-pointer">
          {success}
        </Alert>
      )}

      {/* 공통 문서 (보안각서, 제안요청서) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">📄</span>
          공통 문서
        </h3>

        {/* 보안각서 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            📝 보안각서 ({DOCUMENT_TYPE_CONFIG.security.description})
          </p>
          <DocumentRow
            documentType="security"
            proposalId={null}
            document={getDocument(null, 'security')}
            downloadUrl={getDocument(null, 'security') ? downloadUrls[getDocument(null, 'security')!.id] : undefined}
            uploading={uploading === 'security'}
            fileInputRef={(el) => (fileInputRefs.current['security'] = el)}
            onFileSelect={(e) => handleFileSelect(e, 'security', null)}
            onUploadClick={() => triggerUpload('security')}
            onDelete={handleDelete}
          />
        </div>

        {/* 제안요청서 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            📋 제안요청서 ({DOCUMENT_TYPE_CONFIG.rfp.description})
          </p>
          <DocumentRow
            documentType="rfp"
            proposalId={null}
            document={getDocument(null, 'rfp')}
            downloadUrl={getDocument(null, 'rfp') ? downloadUrls[getDocument(null, 'rfp')!.id] : undefined}
            uploading={uploading === 'rfp'}
            fileInputRef={(el) => (fileInputRefs.current['rfp'] = el)}
            onFileSelect={(e) => handleFileSelect(e, 'rfp', null)}
            onUploadClick={() => triggerUpload('rfp')}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* 일괄 업로드 섹션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">📤</span>
          제안사 문서 일괄 업로드
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          A~E사의 발표자료와 정성적 제안서를 한 번에 업로드하고, 각 파일을 제안사에 매핑할 수 있습니다.
          <br />
          <span className="text-blue-600">
            파일명 예시: &quot;A사_발표자료.pdf&quot;, &quot;A사_정성적 제안서.pdf&quot;, &quot;B사_발표자료.pptx&quot; 등
          </span>
        </p>

        {/* 파일 선택 버튼 */}
        <div className="mb-4">
          <input
            type="file"
            ref={bulkFileInputRef}
            onChange={handleBulkFileSelect}
            accept=".pdf,.ppt,.pptx"
            multiple
            className="hidden"
          />
          <Button
            onClick={() => bulkFileInputRef.current?.click()}
            disabled={bulkUploading}
            variant="outline"
          >
            📁 파일 선택 (여러 파일 가능)
          </Button>
        </div>

        {/* 선택된 파일 목록 */}
        {bulkFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                선택된 파일: {bulkFiles.length}개
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearBulkFiles}
                disabled={bulkUploading}
              >
                전체 삭제
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">파일명</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">감지된 회사</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-40">제안사 선택</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-40">문서 타입</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">상태</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bulkFiles.map((bulkFile, index) => (
                    <tr key={index} className={bulkFile.status === 'error' ? 'bg-red-50' : bulkFile.status === 'success' ? 'bg-green-50' : ''}>
                      <td className="px-4 py-2 text-sm">
                        <div className="max-w-xs truncate" title={bulkFile.file.name}>
                          {bulkFile.file.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(bulkFile.file.size)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {bulkFile.detectedCompany ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {bulkFile.detectedCompany}사
                          </span>
                        ) : (
                          <span className="text-gray-400">미감지</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={bulkFile.selectedProposalId || ''}
                          onChange={(e) => handleBulkProposalChange(index, e.target.value)}
                          disabled={bulkUploading || bulkFile.status === 'success'}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">선택...</option>
                          {proposals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={bulkFile.selectedType || ''}
                          onChange={(e) => handleBulkTypeChange(index, e.target.value as DocumentType)}
                          disabled={bulkUploading || bulkFile.status === 'success'}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">선택...</option>
                          <option value="presentation">📊 발표자료</option>
                          <option value="qualitative">📑 정성적 제안서</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {bulkFile.status === 'pending' && (
                          <span className="text-gray-500">대기</span>
                        )}
                        {bulkFile.status === 'uploading' && (
                          <span className="text-blue-600">업로드 중...</span>
                        )}
                        {bulkFile.status === 'success' && (
                          <span className="text-green-600">✓ 완료</span>
                        )}
                        {bulkFile.status === 'error' && (
                          <span className="text-red-600" title={bulkFile.errorMessage}>
                            ✕ 실패
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeBulkFile(index)}
                          disabled={bulkUploading}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 일괄 업로드 버튼 */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={executeBulkUpload}
                disabled={bulkUploading || bulkFiles.every((f) => f.status === 'success')}
              >
                {bulkUploading ? '업로드 중...' : `${bulkFiles.filter((f) => f.status !== 'success').length}개 파일 일괄 업로드`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 제안사별 문서 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">📁</span>
          제안사별 문서
        </h3>

        {proposals.length === 0 ? (
          <p className="text-gray-500">등록된 제안사가 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="border rounded-lg p-4"
              >
                <h4 className="font-medium text-lg mb-4 pb-2 border-b">
                  {proposal.name}
                </h4>

                <div className="space-y-4">
                  {/* 발표자료 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      📊 발표자료 ({DOCUMENT_TYPE_CONFIG.presentation.description})
                    </p>
                    <DocumentRow
                      documentType="presentation"
                      proposalId={proposal.id}
                      document={getDocument(proposal.id, 'presentation')}
                      downloadUrl={
                        getDocument(proposal.id, 'presentation')
                          ? downloadUrls[getDocument(proposal.id, 'presentation')!.id]
                          : undefined
                      }
                      uploading={uploading === `${proposal.id}-presentation`}
                      fileInputRef={(el) =>
                        (fileInputRefs.current[`${proposal.id}-presentation`] = el)
                      }
                      onFileSelect={(e) => handleFileSelect(e, 'presentation', proposal.id)}
                      onUploadClick={() => triggerUpload(`${proposal.id}-presentation`)}
                      onDelete={handleDelete}
                      proposals={proposals}
                      onChangeProposal={handleChangeProposal}
                    />
                  </div>

                  {/* 정성적 제안서 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      📑 정성적 제안서 ({DOCUMENT_TYPE_CONFIG.qualitative.description})
                    </p>
                    <DocumentRow
                      documentType="qualitative"
                      proposalId={proposal.id}
                      document={getDocument(proposal.id, 'qualitative')}
                      downloadUrl={
                        getDocument(proposal.id, 'qualitative')
                          ? downloadUrls[getDocument(proposal.id, 'qualitative')!.id]
                          : undefined
                      }
                      uploading={uploading === `${proposal.id}-qualitative`}
                      fileInputRef={(el) =>
                        (fileInputRefs.current[`${proposal.id}-qualitative`] = el)
                      }
                      onFileSelect={(e) => handleFileSelect(e, 'qualitative', proposal.id)}
                      onUploadClick={() => triggerUpload(`${proposal.id}-qualitative`)}
                      onDelete={handleDelete}
                      proposals={proposals}
                      onChangeProposal={handleChangeProposal}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 개별 문서 행 컴포넌트
interface DocumentRowProps {
  documentType: DocumentType;
  proposalId: string | null;
  document: ProposalDocument | undefined;
  downloadUrl: string | undefined;
  uploading: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  onDelete: (id: string) => void;
  proposals?: Proposal[];
  onChangeProposal?: (documentId: string, newProposalId: string) => void;
}

function DocumentRow({
  documentType,
  proposalId,
  document,
  downloadUrl,
  uploading,
  fileInputRef,
  onFileSelect,
  onUploadClick,
  onDelete,
  proposals,
  onChangeProposal,
}: DocumentRowProps) {
  const config = DOCUMENT_TYPE_CONFIG[documentType];
  const [showProposalSelect, setShowProposalSelect] = useState(false);

  const handleProposalChange = (newProposalId: string) => {
    if (document && onChangeProposal && newProposalId !== proposalId) {
      onChangeProposal(document.id, newProposalId);
    }
    setShowProposalSelect(false);
  };

  return (
    <div className="flex items-center gap-4 bg-gray-50 rounded p-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept={config.allowedExtensions.join(',')}
        className="hidden"
      />

      {document ? (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{document.file_name}</p>
            <p className="text-xs text-gray-500">
              {formatFileSize(document.file_size)} •{' '}
              {new Date(document.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={document.file_name}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                다운로드
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onUploadClick}
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : '변경'}
            </Button>
            {/* 제안사 변경 (제안사별 문서만) */}
            {proposals && proposals.length > 1 && onChangeProposal && (
              showProposalSelect ? (
                <select
                  value={proposalId || ''}
                  onChange={(e) => handleProposalChange(e.target.value)}
                  onBlur={() => setShowProposalSelect(false)}
                  autoFocus
                  className="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {proposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProposalSelect(true)}
                  title="다른 제안사로 이동"
                >
                  이동
                </Button>
              )
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(document.id)}
            >
              삭제
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 text-sm text-gray-500">
            파일이 없습니다. (허용 형식: {config.allowedExtensions.join(', ')}, 최대{' '}
            {config.maxSizeMB}MB)
          </div>
          <Button onClick={onUploadClick} disabled={uploading}>
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </>
      )}
    </div>
  );
}
