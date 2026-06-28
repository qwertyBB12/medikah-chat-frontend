/**
 * components/physician/CueMemory.tsx
 * ----------------------------------
 * Cue cross-session MEMORY surface (Phase 25 Slice 3), rendered inside the
 * CueSurface dock. Two pieces, both bilingual (ES primary) and matching the
 * mk-dock dark navy/teal aesthetic (conformance — no new design language):
 *
 *  - <CueMemoryConsent>  the one-time aviso de privacidad (PATCH-03). On approve
 *      it POSTs /api/cue/memory/aviso-ack and calls onAck(); memory activates.
 *  - <CueMemoryPanel>    "What Cue remembers" — list / correct / delete the
 *      doctor's own notes (GET/PATCH/DELETE /api/cue/memory[/:id]).
 *
 * All network goes through the same-origin BFF (never FastAPI directly).
 */
import { useCallback, useEffect, useState } from 'react';
import { MEMORY_CONSENT } from '../../lib/cue/memoryConsentContent';

type Locale = 'en' | 'es';

interface MemoryNote {
  id: string;
  note: string;
  category: string;
  appended_at?: string;
  updated_at?: string;
}

const SHARED_STYLE = `
  .cue-mem { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column;
    background:linear-gradient(180deg,#0e2230 0%,#0b1a25 100%); color:#e8f1f4;
    font-family:inherit; animation:cue-mem-in .32s cubic-bezier(.16,1,.3,1); }
  @keyframes cue-mem-in { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
  .cue-mem-eyebrow { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#5fb6c9; font-weight:700; }
  .cue-mem-title { font-size:18px; font-weight:800; line-height:1.2; margin:6px 0 0; }
  .cue-mem-body { flex:1; overflow-y:auto; padding:22px 20px 16px; }
  .cue-mem-intro { font-size:13.5px; line-height:1.55; color:#c4d7de; margin:12px 0 16px; }
  .cue-mem-point { margin:0 0 12px; }
  .cue-mem-point-l { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#7fa9b6; font-weight:700; }
  .cue-mem-point-t { font-size:13px; line-height:1.5; color:#dbe8ec; margin-top:2px; }
  .cue-mem-legal { font-size:11px; line-height:1.5; color:#7e9aa4; margin-top:14px; padding-top:12px; border-top:1px solid rgba(120,160,175,.18); }
  .cue-mem-actions { flex:none; display:flex; gap:10px; padding:14px 20px 18px; }
  .cue-mem-btn { flex:1; border:none; border-radius:12px; padding:12px 14px; font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer; transition:filter .15s, opacity .15s; }
  .cue-mem-btn:disabled { opacity:.6; cursor:default; }
  .cue-mem-approve { background:linear-gradient(135deg,#2C7A8C,#3a9fb4); color:#fff; }
  .cue-mem-approve:hover:not(:disabled){ filter:brightness(1.08); }
  .cue-mem-ghost { background:transparent; color:#9fbcc6; border:1px solid rgba(120,160,175,.3); }
  .cue-mem-ghost:hover:not(:disabled){ background:rgba(120,160,175,.1); }
  .cue-mem-h { flex:none; display:flex; align-items:center; gap:10px; padding:16px 16px 10px; }
  .cue-mem-h-title { font-weight:800; letter-spacing:.04em; font-size:14px; }
  .cue-mem-x { margin-left:auto; background:transparent; border:none; color:#9fbcc6; cursor:pointer; font-size:13px; padding:4px 6px; }
  .cue-mem-list { list-style:none; margin:0; padding:0; }
  .cue-mem-item { padding:12px 4px; border-bottom:1px solid rgba(120,160,175,.14); }
  .cue-mem-note { font-size:13.5px; line-height:1.5; color:#e8f1f4; }
  .cue-mem-meta { display:flex; align-items:center; gap:8px; margin-top:7px; }
  .cue-mem-chip { font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:#5fb6c9; background:rgba(95,182,201,.12); border-radius:6px; padding:2px 7px; font-weight:700; }
  .cue-mem-date { font-size:11px; color:#7e9aa4; }
  .cue-mem-rowact { margin-left:auto; display:flex; gap:4px; }
  .cue-mem-link { background:transparent; border:none; color:#9fbcc6; font-size:12px; cursor:pointer; padding:2px 6px; border-radius:6px; }
  .cue-mem-link:hover { background:rgba(120,160,175,.1); color:#e8f1f4; }
  .cue-mem-link.danger:hover { color:#f1a3a3; }
  .cue-mem-edit { width:100%; box-sizing:border-box; background:#0a1620; color:#e8f1f4; border:1px solid rgba(120,160,175,.3); border-radius:10px; padding:9px 11px; font-family:inherit; font-size:13px; line-height:1.5; resize:vertical; min-height:60px; }
  .cue-mem-empty { color:#7e9aa4; font-size:13px; padding:24px 4px; text-align:center; }
`;

/* ───────────────────────────── Consent card ──────────────────────────────── */

export function CueMemoryConsent({
  locale,
  onAck,
  onDecline,
}: {
  locale: Locale;
  onAck: () => void;
  onDecline: () => void;
}) {
  const t = MEMORY_CONSENT[locale];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const approve = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/cue/memory/aviso-ack', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onAck();
    } catch {
      setErr(t.loadError);
      setBusy(false);
    }
  }, [onAck, t.loadError]);

  return (
    <div className="cue-mem" role="dialog" aria-label={t.title}>
      <style>{SHARED_STYLE}</style>
      <div className="cue-mem-body">
        <div className="cue-mem-eyebrow">{t.eyebrow}</div>
        <h2 className="cue-mem-title">{t.title}</h2>
        <p className="cue-mem-intro">{t.intro}</p>
        {t.points.map((p) => (
          <div className="cue-mem-point" key={p.label}>
            <div className="cue-mem-point-l">{p.label}</div>
            <div className="cue-mem-point-t">{p.text}</div>
          </div>
        ))}
        <div className="cue-mem-legal">{t.legal}</div>
        {err && <div className="cue-mem-legal" style={{ color: '#f1a3a3' }}>{err}</div>}
      </div>
      <div className="cue-mem-actions">
        <button className="cue-mem-btn cue-mem-ghost" onClick={onDecline} disabled={busy}>
          {t.decline}
        </button>
        <button className="cue-mem-btn cue-mem-approve" onClick={approve} disabled={busy}>
          {t.approve}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Manage panel ──────────────────────────────── */

export function CueMemoryPanel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = MEMORY_CONSENT[locale];
  const [notes, setNotes] = useState<MemoryNote[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch('/api/cue/memory');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch {
      setErr(t.loadError);
      setNotes([]);
    }
  }, [t.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm(t.removeConfirm)) return;
      setNotes((prev) => (prev ? prev.filter((n) => n.id !== id) : prev)); // optimistic
      try {
        await fetch(`/api/cue/memory/${id}`, { method: 'DELETE' });
      } catch {
        load(); // reconcile on failure
      }
    },
    [t.removeConfirm, load],
  );

  const saveEdit = useCallback(
    async (id: string) => {
      const text = draft.trim();
      if (!text) return;
      setNotes((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, note: text } : n)) : prev));
      setEditingId(null);
      try {
        await fetch(`/api/cue/memory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: text }),
        });
      } catch {
        load();
      }
    },
    [draft, load],
  );

  const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10) : '');

  return (
    <div className="cue-mem" role="dialog" aria-label={t.manageTitle}>
      <style>{SHARED_STYLE}</style>
      <div className="cue-mem-h">
        <span className="cue-mem-h-title">{t.manageTitle}</span>
        <button className="cue-mem-x" onClick={onClose} aria-label={t.close}>
          {t.close}
        </button>
      </div>
      <div className="cue-mem-body">
        {err && <div className="cue-mem-legal" style={{ color: '#f1a3a3' }}>{err}</div>}
        {notes === null ? (
          <div className="cue-mem-empty">…</div>
        ) : notes.length === 0 ? (
          <div className="cue-mem-empty">{t.empty}</div>
        ) : (
          <ul className="cue-mem-list">
            {notes.map((n) => (
              <li className="cue-mem-item" key={n.id}>
                {editingId === n.id ? (
                  <>
                    <textarea
                      className="cue-mem-edit"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                    />
                    <div className="cue-mem-meta">
                      <div className="cue-mem-rowact">
                        <button className="cue-mem-link" onClick={() => setEditingId(null)}>
                          {t.cancel}
                        </button>
                        <button className="cue-mem-link" onClick={() => saveEdit(n.id)}>
                          {t.save}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cue-mem-note">{n.note}</div>
                    <div className="cue-mem-meta">
                      <span className="cue-mem-chip">{n.category}</span>
                      <span className="cue-mem-date">{fmtDate(n.updated_at || n.appended_at)}</span>
                      <div className="cue-mem-rowact">
                        <button
                          className="cue-mem-link"
                          onClick={() => {
                            setEditingId(n.id);
                            setDraft(n.note);
                          }}
                        >
                          {t.edit}
                        </button>
                        <button className="cue-mem-link danger" onClick={() => remove(n.id)}>
                          {t.remove}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
