import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { supabaseAdmin } from './supabaseServer';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'reviewer' | 'admin' | 'super_admin';
}

/**
 * Get authenticated admin user from API route request.
 * Returns null if the user is not authenticated or not an admin.
 */
export async function getAdminUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminUser | null> {
  const session = await getServerSession(req, res, authOptions);
  // Workspace (mailcow-imap) sessions carry mailbox_email, not email — fall back to it
  // so an admin signed in via their Medikah workspace login is recognized. A needs_totp
  // (half-logged-in) session has neither field, so it still returns null.
  const adminEmail = session?.user?.email ?? session?.user?.mailbox_email;
  if (!adminEmail || !supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('email', adminEmail.toLowerCase())
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, email: data.email, fullName: data.full_name, role: data.role };
}

/**
 * Get authenticated admin user from getServerSideProps context.
 * Returns null if the user is not authenticated or not an admin.
 */
export async function getAdminFromContext(
  ctx: GetServerSidePropsContext
): Promise<AdminUser | null> {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  // Workspace (mailcow-imap) sessions carry mailbox_email, not email — fall back to it
  // so an admin signed in via their Medikah workspace login is recognized. A needs_totp
  // (half-logged-in) session has neither field, so it still returns null.
  const adminEmail = session?.user?.email ?? session?.user?.mailbox_email;
  if (!adminEmail || !supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('email', adminEmail.toLowerCase())
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, email: data.email, fullName: data.full_name, role: data.role };
}
