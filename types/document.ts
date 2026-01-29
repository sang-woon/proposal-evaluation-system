/**
 * 문서 관리 타입 정의
 * - 제안사별 발표자료, 정성적 제안서, 보안각서 관리
 */

// 문서 타입
export type DocumentType = 'presentation' | 'qualitative' | 'security' | 'rfp';

// 문서 메타데이터 인터페이스 (DB 스키마 매핑)
export interface ProposalDocument {
  id: string;
  proposal_id: string | null; // security 타입은 null (공통 문서)
  document_type: DocumentType;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// 문서 업로드 요청
export interface DocumentUploadRequest {
  proposalId: string | null;
  documentType: DocumentType;
  file: File;
}

// 문서 업로드 응답
export interface DocumentUploadResponse {
  document: ProposalDocument;
  downloadUrl: string;
}

// 문서 목록 조회 응답
export interface DocumentListResponse {
  documents: ProposalDocument[];
  downloadUrls: Record<string, string>;
}

// 문서 타입별 설정
export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, {
  label: string;
  labelKo: string;
  description: string;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  maxSizeMB: number;
  requiresProposal: boolean;
}> = {
  presentation: {
    label: 'Presentation',
    labelKo: '발표자료',
    description: '제안사 발표 자료 (PDF, PPT)',
    allowedExtensions: ['.pdf', '.ppt', '.pptx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxSizeMB: 50,
    requiresProposal: true,
  },
  qualitative: {
    label: 'Qualitative Proposal',
    labelKo: '정성적 제안서',
    description: '정성적 평가용 제안서 (PDF)',
    allowedExtensions: ['.pdf'],
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    maxSizeMB: 100,
    requiresProposal: true,
  },
  security: {
    label: 'Security Agreement',
    labelKo: '보안각서',
    description: '보안각서 양식 (HWP)',
    allowedExtensions: ['.hwp', '.hwpx'],
    allowedMimeTypes: [
      'application/x-hwp',
      'application/haansofthwp',
      'application/vnd.hancom.hwp',
      'application/octet-stream', // HWP 파일이 이 타입으로 인식될 수 있음
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxSizeMB: 10,
    requiresProposal: false, // 공통 문서
  },
  rfp: {
    label: 'Request for Proposal',
    labelKo: '제안요청서',
    description: '제안요청서 (PDF)',
    allowedExtensions: ['.pdf'],
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    maxSizeMB: 100,
    requiresProposal: false, // 공통 문서
  },
};

// 파일 확장자 검증
export function isValidFileExtension(fileName: string, documentType: DocumentType): boolean {
  const config = DOCUMENT_TYPE_CONFIG[documentType];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return config.allowedExtensions.includes(extension);
}

// 파일 크기 검증
export function isValidFileSize(fileSize: number, documentType: DocumentType): boolean {
  const config = DOCUMENT_TYPE_CONFIG[documentType];
  return fileSize <= config.maxSizeBytes;
}

// 파일 검증 (확장자 + 크기)
export function validateFile(file: File, documentType: DocumentType): {
  valid: boolean;
  error?: string;
} {
  const config = DOCUMENT_TYPE_CONFIG[documentType];

  // 확장자 검증
  if (!isValidFileExtension(file.name, documentType)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다. 허용 형식: ${config.allowedExtensions.join(', ')}`,
    };
  }

  // 크기 검증
  if (!isValidFileSize(file.size, documentType)) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 크기: ${config.maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

// 스토리지 경로 생성
export function generateStoragePath(
  proposalId: string | null,
  documentType: DocumentType,
  fileName: string
): string {
  const timestamp = Date.now();
  // 파일 확장자 추출
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
  // Supabase Storage는 ASCII만 지원하므로 한글 등은 제거하고 타임스탬프 + 확장자만 사용
  const safeFileName = `file${extension}`;

  if (documentType === 'security') {
    return `common/security/${timestamp}_${safeFileName}`;
  }

  if (documentType === 'rfp') {
    return `common/rfp/${timestamp}_${safeFileName}`;
  }

  return `proposals/${proposalId}/${documentType}/${timestamp}_${safeFileName}`;
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
