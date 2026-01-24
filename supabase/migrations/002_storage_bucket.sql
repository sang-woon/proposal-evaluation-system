-- Supabase Storage 버킷 설정
-- 제안서 문서 저장용 버킷

-- 1. 버킷 생성 (Supabase Dashboard에서 수동 생성 권장)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'proposal-documents',
--     'proposal-documents',
--     false,
--     104857600, -- 100MB
--     ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/octet-stream']
-- );

-- 2. Storage RLS 정책

-- 읽기 정책: 모든 인증된 사용자
CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'proposal-documents');

-- 업로드 정책: 모든 인증된 사용자 (관리자 기능)
CREATE POLICY "Allow public upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'proposal-documents');

-- 삭제 정책: 모든 인증된 사용자 (관리자 기능)
CREATE POLICY "Allow public delete" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'proposal-documents');

-- 업데이트 정책: 모든 인증된 사용자
CREATE POLICY "Allow public update" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'proposal-documents')
    WITH CHECK (bucket_id = 'proposal-documents');

/*
Supabase Dashboard에서 수동 설정 가이드:

1. Storage > New Bucket 클릭
2. 버킷 설정:
   - Name: proposal-documents
   - Public bucket: OFF (비공개)
   - File size limit: 100MB
   - Allowed MIME types:
     - application/pdf
     - application/vnd.ms-powerpoint
     - application/vnd.openxmlformats-officedocument.presentationml.presentation
     - application/x-hwp
     - application/haansofthwp
     - application/vnd.hancom.hwp
     - application/octet-stream

3. 폴더 구조:
   proposal-documents/
   ├── proposals/
   │   ├── {proposal_id}/
   │   │   ├── presentation/
   │   │   │   └── {timestamp}_{filename}.pdf
   │   │   └── qualitative/
   │   │       └── {timestamp}_{filename}.pdf
   └── common/
       └── security/
           └── {timestamp}_{filename}.hwp
*/
