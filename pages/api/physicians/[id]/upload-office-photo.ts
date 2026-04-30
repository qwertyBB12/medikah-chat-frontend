/**
 * POST /api/physicians/[id]/upload-office-photo
 *
 * Upload an office/practice photo to Supabase Storage bucket 'physician-office-photos'.
 *
 * Validation (server-side):
 *   - File size <= 5MB (T-12-05-07)
 *   - MIME type allowlist: image/png, image/jpeg, image/webp (NO SVG — T-12-05-02)
 *   - Magic-bytes verification: declared MIME must match actual file content (T-12-05-01)
 *   - Minimum dimensions: 1200x800 px (WEB-12 quality requirement)
 *
 * Security:
 *   - session.user.id must correspond to physicianId in URL (IDOR — T-12-05-03/05)
 *   - Storage bucket is public-read, service-role write only (T-12-05-05)
 *   - Filename: `${physicianId}-${Date.now()}.${ext}` (versioned for CDN cache bust)
 *   - SVG NOT accepted (T-12-05-02: SVG can carry XSS payload; rejected categorically
 *     for office photos. Only accepted for favicon via <link rel="icon">.)
 *
 * Returns: { photo_url: <public Supabase Storage URL> }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_WIDTH = 1200; // px — WEB-12
const MIN_HEIGHT = 800;  // px — WEB-12

// NO SVG — T-12-05-02 (SVG can carry embedded <script>; office photos are public
// marketing images, not rendered via <link rel="icon">)
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Magic-byte signatures (first bytes) for each supported binary format. */
const MAGIC: Record<string, number[][]> = {
  'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF...WEBP — checked below
};

/** Extension map. */
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the actual file bytes match the declared MIME type (T-12-05-01).
 */
function verifyMagicBytes(buf: Buffer, mime: string): boolean {
  const sigs = MAGIC[mime];
  if (!sigs) return false;

  for (const sig of sigs) {
    if (sig.every((byte, i) => buf[i] === byte)) {
      if (mime === 'image/webp') {
        return (
          buf[8] === 0x57 && // W
          buf[9] === 0x45 && // E
          buf[10] === 0x42 && // B
          buf[11] === 0x50    // P
        );
      }
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  try {
    // 2. IDOR check: session user must own this physician record (T-12-05-03)
    const { data: physician, error: fetchError } = await supabaseAdmin
      .from('physicians')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to upload for this physician' });
    }

    // 3. Parse request body
    const { dataUrl } = req.body as { dataUrl?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'dataUrl is required' });
    }

    // 4. Parse data URL
    const match = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({
        error: 'Invalid data URL. Supported formats: PNG, JPEG, WebP.',
      });
    }

    const declaredMime = match[1];
    const base64Data = match[2];

    // 5. MIME allowlist check (T-12-05-01 / T-12-05-02)
    if (!ALLOWED_MIMES.has(declaredMime)) {
      return res.status(400).json({
        error: `MIME type '${declaredMime}' is not allowed for office photos. Accepted: PNG, JPEG, WebP.`,
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 6. File size check
    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: 'File exceeds 5 MB limit.' });
    }

    // 7. Magic-bytes verification (T-12-05-01)
    if (!verifyMagicBytes(buffer, declaredMime)) {
      return res.status(400).json({
        error: 'File content does not match the declared MIME type.',
      });
    }

    // 8. Dimension check: minimum 1200×800 (WEB-12)
    try {
      const meta = await sharp(buffer).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w < MIN_WIDTH || h < MIN_HEIGHT) {
        return res.status(400).json({
          error: `Office photo must be at least ${MIN_WIDTH}×${MIN_HEIGHT} pixels. Uploaded: ${w}×${h}.`,
        });
      }
    } catch {
      return res.status(400).json({ error: 'Unable to read image dimensions.' });
    }

    // 9. Upload to Supabase Storage 'physician-office-photos' bucket
    const ext = EXT[declaredMime] || 'bin';
    const path = `${id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('physician-office-photos')
      .upload(path, buffer, {
        contentType: declaredMime,
        upsert: false,
      });

    if (uploadError) {
      console.error('upload-office-photo: Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload photo to storage.' });
    }

    // 10. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('physician-office-photos')
      .getPublicUrl(path);

    const photoUrl = urlData.publicUrl;

    return res.status(200).json({ photo_url: photoUrl });
  } catch (err) {
    console.error('upload-office-photo: exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Base64 of 5MB ≈ 6.7MB; allow 8MB headroom for data URL overhead
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};
