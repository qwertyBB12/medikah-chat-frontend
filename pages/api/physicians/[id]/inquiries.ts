/**
 * pages/api/physicians/[id]/inquiries.ts
 *
 * POST — Create a new patient inquiry from the Try Pro site contact form.
 *
 * WEB-15: Contact form posts to THIS endpoint (NOT to Práctikah mailbox).
 *         This preserves the HIPAA boundary per D-15 in PROJECT.md.
 *
 * Request body:
 *   { name: string, email: string, subject: string, message: string, source?: string }
 *
 * Security:
 *  - T-12-06-04: Honeypot validation is client-side (TryProContactForm).
 *                This endpoint does NOT check for honeypot — it trusts the
 *                client to silently drop honeypot submissions. Server-side
 *                rate limiting ships in Phase 14 (PHI-01..04 batch).
 *  - T-12-06-05: Explicit source field for audit traceability.
 *  - T-12-06-06: No dangerouslySetInnerHTML; all values stored as plain text
 *                via parameterized Supabase insert (no XSS injection path).
 *  - UUID validation on physician ID parameter.
 *  - No auth required — this endpoint is intentionally public (anonymous
 *    patients send inquiries to physicians). Consistent with existing
 *    patient-inquiry flow (chat → /schedule → patient_inquiries table).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation limits (mirrors TryProContactForm client-side limits)
const LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  message: 800,
  source: 50,
} as const;

// Basic email regex (same as client-side in TryProContactForm)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method guard — POST only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Database null check
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Extract physician ID from route params
  const { id: physicianId } = req.query;
  if (!physicianId || typeof physicianId !== 'string' || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Parse + validate body
  const { name, email, subject, message, source } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Length guards (server-side mirror of client validation — T-12-06-06)
  if (name.trim().length > LIMITS.name) {
    return res.status(400).json({ error: `name must be at most ${LIMITS.name} characters` });
  }
  if (email.trim().length > LIMITS.email) {
    return res.status(400).json({ error: 'email too long' });
  }
  if (subject.trim().length > LIMITS.subject) {
    return res.status(400).json({ error: `subject must be at most ${LIMITS.subject} characters` });
  }
  if (message.trim().length > LIMITS.message) {
    return res.status(400).json({ error: `message must be at most ${LIMITS.message} characters` });
  }

  // Verify physician exists and is verified (T-12-06-01)
  const { data: physician, error: physError } = await supabaseAdmin
    .from('physicians')
    .select('id, verification_status')
    .eq('id', physicianId)
    .eq('verification_status', 'verified')
    .maybeSingle();

  if (physError || !physician) {
    return res.status(404).json({ error: 'Physician not found' });
  }

  try {
    // Map form fields → patient_inquiries columns.
    //
    // The patient_inquiries table was designed for the AI triage flow:
    //  patient_name  → form name
    //  patient_email → form email
    //  symptoms      → "[subject] message" (subject prepended for physician context)
    //  locale        → source identifier ('try-pro-preview') — reusing locale for traceability
    //                  (a dedicated source column ships in Phase 14 schema migration)
    //
    // T-12-06-05: source field ('try-pro-preview') ensures auditors can distinguish
    // Try Pro contact form inquiries from triage-generated inquiries.
    const sourceValue = typeof source === 'string' && source.trim().length > 0
      ? source.trim().slice(0, LIMITS.source)
      : 'try-pro-preview';

    const symptomsText = `[${subject.trim()}] ${message.trim()}`;

    const { error: insertError } = await supabaseAdmin
      .from('patient_inquiries')
      .insert({
        physician_id: physicianId,
        patient_name: name.trim(),
        patient_email: email.trim().toLowerCase(),
        symptoms: symptomsText,
        locale: sourceValue,   // repurposed for source traceability
        status: 'pending',
      });

    if (insertError) {
      console.error('Failed to insert patient inquiry:', insertError);
      return res.status(500).json({ error: 'Failed to submit inquiry' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Inquiry handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
