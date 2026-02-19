import { useRef, useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';

interface PhotoUploaderProps {
  physicianId: string;
  lang: SupportedLang;
  initialPhotoUrl?: string;
  physicianName: string;
}

const content = {
  en: {
    title: 'Profile Photo',
    subtitle: 'Upload a professional headshot.',
    change: 'Change Photo',
    upload: 'Upload Photo',
    saving: 'Uploading...',
    saved: 'Uploaded',
    error: 'Upload failed',
    maxSize: 'Max 5MB. JPEG, PNG, or WebP.',
  },
  es: {
    title: 'Foto de Perfil',
    subtitle: 'Suba una foto profesional.',
    change: 'Cambiar Foto',
    upload: 'Subir Foto',
    saving: 'Subiendo...',
    saved: 'Subida',
    error: 'Error al subir',
    maxSize: 'Máximo 5MB. JPEG, PNG o WebP.',
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

  const initial = physicianName.charAt(0).toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveState('error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      uploadPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (dataUrl: string) => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhotoUrl(data.photoUrl);
        setPreview(null);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
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
        </div>
      </div>
    </div>
  );
}
