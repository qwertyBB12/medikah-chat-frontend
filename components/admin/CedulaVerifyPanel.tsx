/**
 * Cédula Verification Cockpit — admin panel (slice 4).
 *
 * Renders inside a MX cédula license card on the admin physician-detail page.
 * Human-in-the-loop: the admin runs the official RNP lookup (passes reCAPTCHA as
 * a human), pastes the Constancia text (or uploads an image scan to auto-read),
 * reviews the parsed fields + name match, then confirms or rejects. The AI only
 * recommends; the admin commits. No reCAPTCHA bypass, no registry mirror.
 *
 * Deliberately dependency-free: pasting the Constancia text gives the slice-2
 * deterministic parser perfect input (no client PDF lib, no OCR error). The
 * uploaded file is filed as evidence; an image also feeds the vision fallback.
 */

import { useState } from 'react';
import type { ConstanciaFields } from '../../lib/verification/constanciaParse';
import type { NameMatchResult } from '../../lib/verification/cedulaNameMatch';

interface PreviewResponse {
  fields: ConstanciaFields;
  source: 'text' | 'vision';
  ok: boolean;
  found: number;
  profileName: string;
  match: NameMatchResult;
}

interface Props {
  physicianId: string;
  licenseId: string;
  licenseNumber: string | null;
  countryCode: string;
  currentStatus: string;
  /** Called after a successful commit so the page can refresh SSR data. */
  onCommitted: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const RNP_URL = 'https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action';

const verdictStyles: Record<NameMatchResult['verdict'], { bg: string; text: string; label: string }> = {
  match: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Name matches' },
  partial: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Partial — review' },
  mismatch: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Name mismatch' },
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

export default function CedulaVerifyPanel({
  physicianId,
  licenseId,
  licenseNumber,
  countryCode,
  currentStatus,
  onCommitted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [constanciaText, setConstanciaText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState<null | 'preview' | 'verified' | 'rejected'>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/admin/physicians/${physicianId}/cedula-verify`;

  function reset() {
    setConstanciaText('');
    setFile(null);
    setPreview(null);
    setError(null);
  }

  async function buildImageDataUrl(): Promise<string | undefined> {
    if (file && file.type.startsWith('image/')) return readAsDataUrl(file);
    return undefined;
  }

  async function handlePreview() {
    setBusy('preview');
    setError(null);
    setPreview(null);
    try {
      const imageDataUrl = await buildImageDataUrl();
      if (!constanciaText.trim() && !imageDataUrl) {
        setError('Paste the Constancia text, or upload an image scan to auto-read.');
        return;
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', constanciaText, imageDataUrl }),
      });
      const body = (await res.json().catch(() => ({}))) as PreviewResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setPreview(body);
    } catch {
      setError('Preview failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleCommit(decision: 'verified' | 'rejected') {
    setBusy(decision);
    setError(null);
    try {
      const cedula = preview?.fields.cedula || licenseNumber || '';
      if (!cedula) {
        setError('No cédula number — cannot record. Enter it on the license first.');
        return;
      }
      const evidenceDataUrl = file ? await readAsDataUrl(file) : undefined;
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        setError('Evidence file too large (max 5MB).');
        return;
      }
      const imageDataUrl = await buildImageDataUrl();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          licenseId,
          decision,
          cedula,
          pais: countryCode || 'MX',
          constanciaText,
          imageDataUrl,
          evidenceDataUrl,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      reset();
      setOpen(false);
      onCommitted();
    } catch {
      setError('Commit failed');
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-dm-sans text-xs font-semibold mt-3 px-3 py-1.5 rounded-lg border border-clinical-teal/40 text-clinical-teal hover:bg-clinical-teal/5 transition"
      >
        Verify cédula (RNP / Constancia)
      </button>
    );
  }

  const v = preview ? verdictStyles[preview.match.verdict] : null;

  return (
    <div className="mt-3 border border-clinical-teal/30 rounded-[8px] p-4 bg-clinical-teal/[0.03]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-dm-sans text-sm font-semibold text-deep-charcoal">Cédula verification</h4>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="font-dm-sans text-xs text-body-slate hover:underline"
        >
          Close
        </button>
      </div>

      <ol className="font-dm-sans text-xs text-body-slate list-decimal list-inside space-y-1 mb-3">
        <li>
          Run the official lookup on the{' '}
          <a href={RNP_URL} target="_blank" rel="noopener noreferrer" className="text-clinical-teal hover:underline">
            RNP site
          </a>{' '}
          (you pass reCAPTCHA as a human).
        </li>
        <li>Paste the Constancia text below, or upload an image scan to auto-read.</li>
        <li>Review the match, then confirm or reject. Upload the Constancia file as evidence.</li>
      </ol>

      <textarea
        value={constanciaText}
        onChange={(e) => setConstanciaText(e.target.value)}
        rows={4}
        placeholder="Paste the Constancia de Situación Profesional text here…"
        className="w-full font-dm-sans text-xs border border-border-line rounded-[8px] p-2 mb-2"
      />

      <div className="mb-3">
        <label className="font-dm-sans text-xs text-body-slate block mb-1">
          Constancia file (evidence — PDF or image, max 5MB)
        </label>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="font-dm-sans text-xs"
        />
      </div>

      <button
        type="button"
        onClick={handlePreview}
        disabled={busy !== null}
        className="font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-lg bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50 transition"
      >
        {busy === 'preview' ? 'Reading…' : 'Preview match'}
      </button>

      {preview && v && (
        <div className="mt-3">
          <div className={`inline-flex items-center font-dm-sans text-xs font-medium rounded-full border px-2 py-0.5 mb-2 ${v.bg} ${v.text}`}>
            {v.label} · score {preview.match.score.toFixed(2)} · via {preview.source}
          </div>
          <dl className="font-dm-sans text-xs text-body-slate grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 mb-1">
            <dt className="font-semibold text-deep-charcoal">Profile name</dt>
            <dd>{preview.profileName || '—'}</dd>
            <dt className="font-semibold text-deep-charcoal">Constancia name</dt>
            <dd>{preview.fields.nombre || '—'}</dd>
            <dt className="font-semibold text-deep-charcoal">Cédula</dt>
            <dd>{preview.fields.cedula || licenseNumber || '—'}</dd>
            <dt className="font-semibold text-deep-charcoal">Título</dt>
            <dd>{preview.fields.titulo || '—'}</dd>
            <dt className="font-semibold text-deep-charcoal">Institución</dt>
            <dd>{preview.fields.institucion || '—'}</dd>
            <dt className="font-semibold text-deep-charcoal">Año</dt>
            <dd>{preview.fields.anio || '—'}</dd>
          </dl>

          <div className="flex items-center gap-2 mt-3">
            {currentStatus !== 'verified' && (
              <button
                type="button"
                onClick={() => handleCommit('verified')}
                disabled={busy !== null}
                className="font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-lg bg-confirm-green text-white hover:bg-confirm-green/90 disabled:opacity-50 transition"
              >
                {busy === 'verified' ? '…' : 'Confirm — mark verified'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCommit('rejected')}
              disabled={busy !== null}
              className="font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
            >
              {busy === 'rejected' ? '…' : 'Reject'}
            </button>
          </div>
          <p className="font-dm-sans text-[11px] text-body-slate mt-2">
            Recorded as a manual RNP review with your name + timestamp; the Constancia is filed as evidence.
          </p>
        </div>
      )}

      {error && <p className="font-dm-sans text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
