/**
 * PhotoGalleryEditor
 *
 * Up to 6 office/practice photos in a 2-col-mobile / 3-col-desktop grid.
 * Each slot shows the photo + remove button + drag handle.
 * Empty slots show an "Add photo" button.
 *
 * Drag-reorder via HTML5 native drag (no external lib — lean-first).
 * Uploads to /api/physicians/${physicianId}/upload-office-photo.
 *
 * Validation (client-side, server re-validates as authority):
 *   - Max 5MB per file
 *   - MIME: image/png, image/jpeg, image/webp (NO SVG — T-12-05-02)
 *   - Min 1200×800 px
 */

import { useRef, useState } from 'react';
import { content } from '../../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../../lib/i18n';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 800;
const MAX_PHOTOS = 6;
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

interface PhotoGalleryEditorProps {
  value: string[];
  onChange: (urls: string[]) => void;
  physicianId: string;
  lang: SupportedLang;
}

export default function PhotoGalleryEditor({
  value,
  onChange,
  physicianId,
  lang,
}: PhotoGalleryEditorProps) {
  const t = content[lang].theming.photos;
  const [uploading, setUploading] = useState<number | null>(null); // index being uploaded
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(-1);

  const checkDimensions = (dataUrl: string): Promise<{ w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('Cannot load image'));
      img.src = dataUrl;
    });

  const openFilePicker = (slotIndex: number) => {
    pendingSlotRef.current = slotIndex;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const slotIndex = pendingSlotRef.current;
    setErrors((prev) => ({ ...prev, [slotIndex]: '' }));

    // Size check
    if (file.size > MAX_BYTES) {
      setErrors((prev) => ({ ...prev, [slotIndex]: t.error.size }));
      return;
    }

    // MIME check (no SVG for office photos — T-12-05-02)
    if (!ALLOWED_MIMES.has(file.type)) {
      setErrors((prev) => ({ ...prev, [slotIndex]: t.error.mime }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;

      // Dimension check
      try {
        const { w, h } = await checkDimensions(dataUrl);
        if (w < MIN_WIDTH || h < MIN_HEIGHT) {
          setErrors((prev) => ({ ...prev, [slotIndex]: t.error.dim }));
          return;
        }
      } catch {
        // Let server validate if client check fails
      }

      setUploading(slotIndex);
      try {
        const res = await fetch(`/api/physicians/${physicianId}/upload-office-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        });
        const data = (await res.json()) as { photo_url?: string; error?: string };
        if (res.ok && data.photo_url) {
          const next = [...value];
          if (slotIndex < next.length) {
            next[slotIndex] = data.photo_url;
          } else {
            next.push(data.photo_url);
          }
          onChange(next);
        } else {
          setErrors((prev) => ({ ...prev, [slotIndex]: data.error || t.error.mime }));
        }
      } catch {
        setErrors((prev) => ({ ...prev, [slotIndex]: t.error.mime }));
      } finally {
        setUploading(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  // HTML5 native drag-reorder
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDragIdx(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(dragIndex) || dragIndex === dropIndex) {
      setDragIdx(null);
      return;
    }
    const next = [...value];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onChange(next);
    setDragIdx(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => setDragIdx(null);

  // Render filled slots + one empty slot (up to 6 total)
  const slots: Array<string | null> = [...value];
  if (slots.length < MAX_PHOTOS) {
    slots.push(null); // one empty slot at end
  }

  return (
    <div>
      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1">
        {t.title}
      </p>
      <p className="font-dm-sans text-xs text-body-slate mb-4">
        {t.helper}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((url, i) =>
          url ? (
            <div
              key={`photo-${i}`}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              className={`relative aspect-[3/2] rounded-md overflow-hidden border-2 transition-all cursor-grab ${
                dragIdx === i
                  ? 'border-clinical-teal opacity-50'
                  : 'border-deep-charcoal/10 hover:border-deep-charcoal/30'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Drag handle indicator */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-black/40 rounded flex items-center justify-center">
                <svg viewBox="0 0 8 12" fill="white" className="w-3 h-3">
                  <circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/>
                  <circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/>
                  <circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/>
                </svg>
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-2 right-2 w-6 h-6 bg-deep-charcoal/60 hover:bg-deep-charcoal/80 rounded-full flex items-center justify-center transition-colors"
                aria-label={t.remove}
              >
                <svg viewBox="0 0 12 12" fill="white" className="w-3 h-3">
                  <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              disabled={uploading !== null || value.length >= MAX_PHOTOS}
              onClick={() => openFilePicker(i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragOver={handleDragOver}
              className={`aspect-[3/2] rounded-md border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                value.length >= MAX_PHOTOS
                  ? 'border-deep-charcoal/10 opacity-50 cursor-not-allowed'
                  : uploading !== null
                  ? 'border-deep-charcoal/10 opacity-50 cursor-wait'
                  : 'border-deep-charcoal/20 hover:border-clinical-teal hover:bg-clinical-teal/5 cursor-pointer'
              }`}
            >
              {uploading === i ? (
                <div className="w-5 h-5 border-2 border-clinical-teal border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 mb-1 text-archival-grey">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="font-dm-sans text-xs text-archival-grey">{t.add}</span>
                </>
              )}
            </button>
          )
        )}
      </div>

      {/* Per-slot errors */}
      {Object.entries(errors).map(([idx, msg]) =>
        msg ? (
          <p key={idx} className="font-dm-sans text-xs text-alert-garnet mt-2">
            {msg}
          </p>
        ) : null
      )}
    </div>
  );
}
