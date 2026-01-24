'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from '@/components/ui/Alert';
import {
  ProposalDocument,
  DOCUMENT_TYPE_CONFIG,
  formatFileSize,
  DocumentType,
} from '@/types/document';
import type { Proposal } from '@/types/database';

interface DocumentDownloadProps {
  proposals?: Proposal[];
}

export function DocumentDownload({ proposals: propProposals }: DocumentDownloadProps) {
  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<Proposal[]>(propProposals || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (data.proposals && !propProposals) {
        setProposals(data.proposals);
      }
    } catch {
      setError('문서 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [propProposals]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 특정 제안사/타입의 문서 찾기
  const getDocument = (proposalId: string | null, documentType: DocumentType) => {
    return documents.find(
      (doc) =>
        doc.document_type === documentType &&
        (proposalId ? doc.proposal_id === proposalId : doc.proposal_id === null)
    );
  };

  // 보안각서 문서
  const securityDoc = getDocument(null, 'security');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">문서 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">등록된 문서가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClick={() => setError(null)} className="cursor-pointer">
          {error}
        </Alert>
      )}

      {/* 보안각서 (공통 문서) */}
      {securityDoc && (
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <h4 className="font-medium text-gray-900">보안각서</h4>
                <p className="text-sm text-gray-500">
                  {securityDoc.file_name} ({formatFileSize(securityDoc.file_size)})
                </p>
              </div>
            </div>
            {downloadUrls[securityDoc.id] && (
              <a
                href={downloadUrls[securityDoc.id]}
                download={securityDoc.file_name}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
              >
                다운로드
              </a>
            )}
          </div>
        </div>
      )}

      {/* 제안사별 문서 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-900">📁 제안사별 자료</h3>
        </div>

        <div className="divide-y">
          {proposals.map((proposal) => {
            const presentationDoc = getDocument(proposal.id, 'presentation');
            const qualitativeDoc = getDocument(proposal.id, 'qualitative');

            // 문서가 하나도 없으면 표시하지 않음
            if (!presentationDoc && !qualitativeDoc) return null;

            return (
              <div key={proposal.id} className="p-4">
                <h4 className="font-medium text-lg text-gray-900 mb-3 pb-2 border-b border-gray-100">
                  {proposal.name}
                </h4>

                <div className="space-y-3">
                  {/* 발표자료 */}
                  {presentationDoc && (
                    <DocumentItem
                      icon="📊"
                      label="발표자료"
                      document={presentationDoc}
                      downloadUrl={downloadUrls[presentationDoc.id]}
                    />
                  )}

                  {/* 정성적 제안서 */}
                  {qualitativeDoc && (
                    <DocumentItem
                      icon="📑"
                      label="정성적 제안서"
                      document={qualitativeDoc}
                      downloadUrl={downloadUrls[qualitativeDoc.id]}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 개별 문서 아이템 컴포넌트
interface DocumentItemProps {
  icon: string;
  label: string;
  document: ProposalDocument;
  downloadUrl?: string;
}

function DocumentItem({ icon, label, document, downloadUrl }: DocumentItemProps) {
  const config = DOCUMENT_TYPE_CONFIG[document.document_type];

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">
            {document.file_name} ({formatFileSize(document.file_size)})
          </p>
        </div>
      </div>
      {downloadUrl ? (
        <a
          href={downloadUrl}
          download={document.file_name}
          className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          다운로드
        </a>
      ) : (
        <span className="text-xs text-gray-400">URL 생성 중...</span>
      )}
    </div>
  );
}
