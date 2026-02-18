-- Efficient lookup of auth user ID by email.
-- Replaces full table scan in ensureSupabaseUser().
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
