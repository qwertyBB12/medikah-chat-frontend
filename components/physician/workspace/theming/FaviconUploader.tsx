/**
 * FaviconUploader
 *
 * File-select for favicon. Validates size (5MB), MIME type, and min 64×64 dimensions
 * client-side before POSTing to /api/physicians/${physicianId}/upload-favicon.
 * Shows a 3-size preview (32/64/128px) of the uploaded favicon so the doctor
 * can verify how it looks in browser tabs.
 *
 * Security:
 *  - Size + MIME checked client-side (UX), server re-validates (authority)
 *  - Dimensions checked client-side via <img> onload
 *  - SVG accepted (browsers execute NO scripts in <link rel="icon">; server sanitizes)
 */

import { useRef, useState } from 'react';
import { content } from '../../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../../lib/i18n';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_DIM = 64;
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
]);

interface FaviconUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  physicianId: string;
  lang: SupportedLang;
}

export default function FaviconUploader({
  value,
  onChange,
  physicianId,
  lang,
}: FaviconUploaderProps) {
  const t = content[lang].theming.favicon;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDimensions = (dataUrl: string): Promise<{ w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('Cannot load image'));
      img.src = dataUrl;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // 1. Size check
    if (file.size > MAX_BYTES) {
      setError(t.error.size);
      return;
    }

    // 2. MIME check
    if (!ALLOWED_MIMES.has(file.type)) {
      setError(t.error.mime);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;

      // 3. Dimension check (client-side; skip for SVG — intrinsically scalable)
      if (file.type !== 'image/svg+xml') {
        try {
          const { w, h } = await checkDimensions(dataUrl);
          if (w < MIN_DIM || h < MIN_DIM) {
            setError(t.error.dim);
            return;
          }
        } catch {
          // If dimension check fails client-side, let the server handle it
        }
      }

      // 4. Upload
      setUploading(true);
      try {
        const res = await fetch(`/api/physicians/${physicianId}/upload-favicon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        });
        const data = (await res.json()) as { favicon_url?: string; error?: string };
        if (res.ok && data.favicon_url) {
          onChange(data.favicon_url);
        } else {
          setError(data.error || t.error.mime);
        }
      } catch {
        setError(t.error.mime);
      } finally {
        setUploading(false);
        // Reset file input so re-uploading same file triggers onChange
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1">
        {t.title}
      </p>
      <p className="font-dm-sans text-xs text-body-slate mb-4">{t.helper}</p>

      {/* Preview at 3 sizes if favicon uploaded */}
      {value && (
        <div className="flex items-end gap-4 mb-4 p-4 bg-linen/40 rounded-md border border-deep-charcoal/10">
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" width={32} height={32} className="rounded" />
            <span className="font-dm-sans text-xs text-archival-grey">32px</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" width={64} height={64} className="rounded" />
            <span className="font-dm-sans text-xs text-archival-grey">64px</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" width={128} height={128} className="rounded" />
            <span className="font-dm-sans text-xs text-archival-grey">128px</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml,image/x-icon,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="bg-clinical-teal text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-clinical-teal/90 disabled:opacity-50 transition-colors"
        >
          {uploading ? '...' : t.upload}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-body-slate font-dm-sans text-sm hover:text-deep-charcoal transition-colors"
          >
            {t.remove}
          </button>
        )}
      </div>

      {error && (
        <p className="font-dm-sans text-xs text-alert-garnet mt-2">{error}</p>
      )}
    </div>
  );
}
