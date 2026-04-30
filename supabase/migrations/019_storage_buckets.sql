-- Migration 019: Práctikah Storage Buckets (Phase 12-05)
-- Creates Supabase Storage buckets for:
--   physician-favicons       — WEB-13 favicon uploads (PNG/SVG/ICO/WebP, max 5MB)
--   physician-office-photos  — WEB-12 office photo gallery (PNG/JPEG/WebP, max 5MB, min 1200x800)
--
-- Both buckets:
--   public = true   → public CDN reads (Try Pro preview pages are public marketing surfaces)
--   service-role write only → BFF upload routes use supabaseAdmin (service role)
--   anonymous INSERT/UPDATE/DELETE denied by RLS
--
-- Per T-12-05-05: service-role-only writes prevent direct anon uploads.
-- Per T-12-05-10: filenames use ${physicianId}-${Date.now()} — predictable but acceptable
--   (office photos and favicons are public marketing content, no PHI).

-- =====================================================
-- PART 1: BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('physician-favicons', 'physician-favicons', true, 5242880)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('physician-office-photos', 'physician-office-photos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 2: RLS POLICIES — physician-favicons
-- =====================================================

-- Anyone can read (public bucket for Try Pro preview favicons)
CREATE POLICY "Public read on physician-favicons"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'physician-favicons');

-- Service role can INSERT (BFF upload routes use supabaseAdmin service role)
CREATE POLICY "Service role can upload to physician-favicons"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'physician-favicons'
    AND auth.role() = 'service_role'
  );

-- Service role can UPDATE (upsert pattern for re-uploads)
CREATE POLICY "Service role can update physician-favicons"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'physician-favicons'
    AND auth.role() = 'service_role'
  );

-- Service role can DELETE (cleanup of old favicon versions)
CREATE POLICY "Service role can delete from physician-favicons"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'physician-favicons'
    AND auth.role() = 'service_role'
  );

-- =====================================================
-- PART 3: RLS POLICIES — physician-office-photos
-- =====================================================

-- Anyone can read (public bucket for Try Pro preview gallery)
CREATE POLICY "Public read on physician-office-photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'physician-office-photos');

-- Service role can INSERT
CREATE POLICY "Service role can upload to physician-office-photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'physician-office-photos'
    AND auth.role() = 'service_role'
  );

-- Service role can UPDATE
CREATE POLICY "Service role can update physician-office-photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'physician-office-photos'
    AND auth.role() = 'service_role'
  );

-- Service role can DELETE
CREATE POLICY "Service role can delete from physician-office-photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'physician-office-photos'
    AND auth.role() = 'service_role'
  );

-- =====================================================
-- END OF MIGRATION 019
-- =====================================================
