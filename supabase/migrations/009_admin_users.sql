-- Migration 009: Admin users table for the approval panel
-- Phase 3: Admin Approval Panel

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer' CHECK (role IN ('reviewer', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service_role can read/write admin_users (no anon/authenticated access)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON admin_users
  USING (true)
  WITH CHECK (true);

-- Seed initial admin
INSERT INTO admin_users (email, full_name, role)
VALUES ('hector@medikah.health', 'Hector H. Lopez', 'super_admin')
ON CONFLICT (email) DO NOTHING;
