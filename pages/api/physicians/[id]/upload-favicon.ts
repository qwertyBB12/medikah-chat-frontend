/**
 * POST /api/physicians/[id]/upload-favicon
 *
 * Upload a favicon image to Supabase Storage bucket 'physician-favicons'.
 *
 * Validation (server-side):
 *   - File size <= 5MB (T-12-05-07)
 *   - MIME type allowlist: image/png, image/svg+xml, image/x-icon,
 *     image/vnd.microsoft.icon, image/webp (T-12-05-01)
 *   - Magic-bytes verification: declared MIME must match actual file content (T-12-05-01)
 *   - Minimum dimensions: 64x64 px (skipped for SVG — intrinsically scalable)
 *   - SVG content sanitized via regex to strip embedded scripts (T-12-05-02 belt-and-suspenders)
 *
 * Security:
 *   - session.user.id must correspond to physicianId in URL (IDOR — T-12-05-03/05)
 *   - Storage bucket is public-read, service-role write only (T-12-05-05)
 *   - Filename: `${physicianId}-${Date.now()}.${ext}` (versioned for CDN cache bust)
 *
 * Returns: { favicon_url: <public Supabase Storage URL> }
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
const MIN_DIMENSION = 64; // px
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
]);

/** Magic-byte signatures (first bytes) for each supported binary format. */
const MAGIC: Record<string, number[][]> = {
  'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],     // RIFF...WEBP — check below
  // ICO: little-endian {0,0} {1,0} (reserved + type=1)
  'image/x-icon':              [[0x00, 0x00, 0x01, 0x00]],
  'image/vnd.microsoft.icon':  [[0x00, 0x00, 0x01, 0x00]],
};

/** Extension map keyed by MIME type. */
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/webp': 'webp',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the actual file bytes match the declared MIME type (T-12-05-01).
 * SVG is text-based — verified by checking the declared MIME and scanning for
 * known malicious magic-byte patterns to rule out binary masquerading as SVG.
 */
function verifyMagicBytes(buf: Buffer, mime: string): boolean {
  if (mime === 'image/svg+xml') {
    // SVG must NOT start with binary magic bytes belonging to other formats.
    // A real SVG starts with XML whitespace, BOM, or '<'
    const first = buf[0];
    // PNG magic
    if (first === 0x89) return false;
    // RIFF (WebP)
    if (first === 0x52) return false;
    // ICO (null byte)
    if (first === 0x00) return false;
    // JFIF / EXIF JPEG
    if (first === 0xff) return false;
    return true;
  }

  const sigs = MAGIC[mime];
  if (!sigs) return false; // Unknown mime — reject

  for (const sig of sigs) {
    if (sig.every((byte, i) => buf[i] === byte)) {
      // Extra WebP check: bytes 8-11 must be "WEBP"
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

/**
 * Strip <script>, event handlers, and javascript: URIs from SVG text.
 * Belt-and-suspenders defense for T-12-05-02.
 * Browser does NOT execute scripts in <link rel="icon"> — this is extra protection.
 */
function sanitizeSvg(svgText: string): string {
  // Remove <script> ... </script> blocks (case-insensitive)
  let sanitized = svgText.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove inline event handlers: on*="..."
  sanitized = sanitized.replace(/\s+on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/\s+on\w+='[^']*'/gi, '');
  // Remove javascript: href/xlink:href
  sanitized = sanitized.replace(/(href|xlink:href)="javascript:[^"]*"/gi, '$1="#"');
  return sanitized;
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

    // 4. Parse data URL: data:<mime>;base64,<data>
    const match = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({
        error: 'Invalid data URL. Supported formats: PNG, SVG, ICO, WebP.',
      });
    }

    const declaredMime = match[1];
    const base64Data = match[2];

    // 5. MIME allowlist check (T-12-05-01)
    if (!ALLOWED_MIMES.has(declaredMime)) {
      return res.status(400).json({
        error: `MIME type '${declaredMime}' is not allowed. Accepted: PNG, SVG, ICO, WebP.`,
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 6. File size check (<= 5MB) (T-12-05-07)
    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: 'File exceeds 5 MB limit.' });
    }

    // 7. Magic-bytes verification (T-12-05-01)
    if (!verifyMagicBytes(buffer, declaredMime)) {
      return res.status(400).json({
        error: 'File content does not match the declared MIME type.',
      });
    }

    // 8. Dimension check (skip for SVG — intrinsically scalable) and SVG sanitization
    let uploadBuffer = buffer;
    let contentType = declaredMime;

    if (declaredMime === 'image/svg+xml') {
      // SVG: sanitize (T-12-05-02)
      const svgText = buffer.toString('utf-8');
      const sanitized = sanitizeSvg(svgText);
      uploadBuffer = Buffer.from(sanitized, 'utf-8');
    } else {
      // Binary: check minimum dimensions via Sharp
      try {
        const meta = await sharp(buffer).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
          return res.status(400).json({
            error: `Favicon must be at least ${MIN_DIMENSION}×${MIN_DIMENSION} pixels. Uploaded: ${w}×${h}.`,
          });
        }
      } catch {
        return res.status(400).json({ error: 'Unable to read image dimensions.' });
      }
    }

    // 9. Upload to Supabase Storage 'physician-favicons' bucket
    const ext = EXT[declaredMime] || 'bin';
    const path = `${id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('physician-favicons')
      .upload(path, uploadBuffer, {
        contentType,
        upsert: false, // versioned filenames — never overwrite
      });

    if (uploadError) {
      console.error('upload-favicon: Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload favicon to storage.' });
    }

    // 10. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('physician-favicons')
      .getPublicUrl(path);

    const faviconUrl = urlData.publicUrl;

    return res.status(200).json({ favicon_url: faviconUrl });
  } catch (err) {
    console.error('upload-favicon: exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Base64 of 5MB ≈ 6.7MB; allow 8MB headroom for data URL overhead
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};
