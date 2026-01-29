'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  DocumentType,
  ProposalDocument,
  DOCUMENT_TYPE_CONFIG,
  formatFileSize,
} from '@/types/document';
import type { Proposal } from '@/types/database';

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

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // 파일 업로드
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (proposalId) {
        formData.append('proposalId', proposalId);
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const { data, error } = await res.json();

      if (error) {
        setError(error);
        return;
      }

      setSuccess(data.message);
      fetchDocuments();
    } catch {
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
}

function DocumentRow({
  documentType,
  document,
  downloadUrl,
  uploading,
  fileInputRef,
  onFileSelect,
  onUploadClick,
  onDelete,
}: DocumentRowProps) {
  const config = DOCUMENT_TYPE_CONFIG[documentType];

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
          <div className="flex gap-2">
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
