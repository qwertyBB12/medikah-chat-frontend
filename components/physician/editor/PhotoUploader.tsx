import { useRef, useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';

interface PhotoUploaderProps {
  physicianId: string;
  lang: SupportedLang;
  initialPhotoUrl?: string;
  physicianName: string;
}

const MIN_DIMENSION = 800;

const content = {
  en: {
    title: 'Profile Photo',
    subtitle: 'Upload a professional headshot.',
    change: 'Change Photo',
    upload: 'Upload Photo',
    saving: 'Optimizing your photo...',
    saved: 'Uploaded',
    error: 'Upload failed',
    maxSize: `Min ${MIN_DIMENSION}×${MIN_DIMENSION}px. Max 5MB. JPEG, PNG, or WebP.`,
    tooSmall: `Photo must be at least ${MIN_DIMENSION}×${MIN_DIMENSION} pixels.`,
  },
  es: {
    title: 'Foto de Perfil',
    subtitle: 'Suba una foto profesional.',
    change: 'Cambiar Foto',
    upload: 'Subir Foto',
    saving: 'Optimizando su foto...',
    saved: 'Subida',
    error: 'Error al subir',
    maxSize: `Mín ${MIN_DIMENSION}×${MIN_DIMENSION}px. Máximo 5MB. JPEG, PNG o WebP.`,
    tooSmall: `La foto debe tener al menos ${MIN_DIMENSION}×${MIN_DIMENSION} píxeles.`,
  },
};

export default function PhotoUploader({
  physicianId,
  lang,
  initialPhotoUrl,
  physicianName,
}: PhotoUploaderProps) {
  const t = content[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl || '');
  const [preview, setPreview] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const initial = physicianName.charAt(0).toUpperCase();

  const checkImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    if (file.size > 5 * 1024 * 1024) {
      setSaveState('error');
      setErrorMessage(t.maxSize);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;

      // Client-side dimension check
      try {
        const dims = await checkImageDimensions(dataUrl);
        if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION) {
          setSaveState('error');
          setErrorMessage(t.tooSmall);
          return;
        }
      } catch {
        // If we can't check dimensions client-side, let the server handle it
      }

      setPreview(dataUrl);
      uploadPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (dataUrl: string) => {
    setSaveState('saving');
    setErrorMessage('');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhotoUrl(data.photoUrl);
        setPreview(null);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        setErrorMessage(data.error || t.error);
      }
    } catch {
      setSaveState('error');
      setErrorMessage(t.error);
    }
  };

  const displayUrl = preview || photoUrl;

  return (
    <div>
      <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
      <p className="font-dm-sans text-sm text-body-slate mt-1 mb-3">{t.subtitle}</p>

      <div className="flex items-center gap-4">
        {/* Photo circle */}
        <div className="shrink-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={physicianName}
              className="w-20 h-20 rounded-full object-cover border-2 border-clinical-teal/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-clinical-teal/10 flex items-center justify-center">
              <span className="font-dm-sans text-2xl font-bold text-clinical-teal">{initial}</span>
            </div>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saveState === 'saving'}
            className={`font-dm-sans text-sm font-semibold px-5 py-2 rounded-lg transition ${
              saveState === 'saved'
                ? 'bg-confirm-green text-white'
                : saveState === 'error'
                ? 'bg-alert-garnet text-white'
                : 'bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50'
            }`}
          >
            {saveState === 'saving'
              ? t.saving
              : saveState === 'saved'
              ? t.saved
              : saveState === 'error'
              ? t.error
              : photoUrl
              ? t.change
              : t.upload}
          </button>
          <p className="font-dm-sans text-xs text-archival-grey mt-1">{t.maxSize}</p>
          {errorMessage && (
            <p className="font-dm-sans text-xs text-alert-garnet mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
