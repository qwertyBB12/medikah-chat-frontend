/**
 * InquiryList Component
 *
 * Displays paginated patient inquiries for a physician with
 * filter tabs, accept/decline actions, and bilingual support.
 */

import { useCallback, useEffect, useState } from 'react';
import { SupportedLang } from '../../lib/i18n';

interface Inquiry {
  inquiry_id: string;
  patient_name: string;
  patient_email?: string;
  symptoms?: string;
  preferred_time?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
  locale?: string;
}

interface InquiryListProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const content = {
  en: {
    title: 'Patient Inquiries',
    all: 'All',
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    accept: 'Accept',
    decline: 'Decline',
    noInquiries: 'No inquiries yet',
    noInquiriesDesc: 'Share your profile to start receiving patient consultations.',
    symptoms: 'Symptoms',
    preferredTime: 'Preferred time',
    received: 'Received',
    declineTitle: 'Decline Inquiry',
    declineReason: 'Reason (optional)',
    declineCancel: 'Cancel',
    declineConfirm: 'Confirm Decline',
    loading: 'Loading inquiries...',
    errorLoading: 'Unable to load inquiries. Please try again.',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
  },
  es: {
    title: 'Consultas de Pacientes',
    all: 'Todas',
    pending: 'Pendientes',
    accepted: 'Aceptadas',
    declined: 'Rechazadas',
    accept: 'Aceptar',
    decline: 'Rechazar',
    noInquiries: 'Sin consultas aun',
    noInquiriesDesc: 'Comparta su perfil para empezar a recibir consultas de pacientes.',
    symptoms: 'Sintomas',
    preferredTime: 'Hora preferida',
    received: 'Recibida',
    declineTitle: 'Rechazar Consulta',
    declineReason: 'Motivo (opcional)',
    declineCancel: 'Cancelar',
    declineConfirm: 'Confirmar Rechazo',
    loading: 'Cargando consultas...',
    errorLoading: 'No se pudieron cargar las consultas. Intente de nuevo.',
    previous: 'Anterior',
    next: 'Siguiente',
    page: 'Pagina',
    of: 'de',
  },
};

const statusBadge: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function InquiryList({ physicianId, lang, accessToken }: InquiryListProps) {
  const t = content[lang];

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Decline modal state
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (filter) params.set('status', filter);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(
        `${API_URL}/physicians/${physicianId}/inquiries?${params}`,
        { headers },
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInquiries(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [physicianId, page, filter, accessToken]);

  useEffect(() => {
    if (physicianId) fetchInquiries();
  }, [physicianId, fetchInquiries]);

  const handleAccept = async (inquiryId: string) => {
    setActionLoading(inquiryId);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(
        `${API_URL}/physicians/${physicianId}/inquiries/${inquiryId}/accept`,
        { method: 'POST', headers },
      );
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.inquiry_id === inquiryId
              ? { ...inq, status: 'accepted' as const }
              : inq,
          ),
        );
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!declineModalId) return;
    setActionLoading(declineModalId);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(
        `${API_URL}/physicians/${physicianId}/inquiries/${declineModalId}/decline`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: declineReason || null }),
        },
      );
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.inquiry_id === declineModalId
              ? { ...inq, status: 'declined' as const }
              : inq,
          ),
        );
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null);
      setDeclineModalId(null);
      setDeclineReason('');
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(lang === 'es' ? 'es' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const tabs = [
    { key: null, label: t.all },
    { key: 'pending', label: t.pending },
    { key: 'accepted', label: t.accepted },
    { key: 'declined', label: t.declined },
  ];

  return (
    <div className="bg-white rounded-[12px] border border-border-line shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">
          {t.title}
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="px-6 flex gap-2 pb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key ?? 'all'}
            onClick={() => {
              setFilter(tab.key);
              setPage(1);
            }}
            className={`font-dm-sans text-sm px-4 py-2 rounded-lg transition whitespace-nowrap ${
              filter === tab.key
                ? 'bg-clinical-teal text-white font-semibold'
                : 'bg-clinical-surface text-body-slate hover:bg-clinical-teal/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-body-slate">
              <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse [animation-delay:0.4s]" />
              <span className="font-dm-sans text-sm ml-2">{t.loading}</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="font-dm-sans text-sm text-alert-garnet">{t.errorLoading}</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-clinical-surface rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-archival-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="font-dm-sans font-semibold text-deep-charcoal mb-1">{t.noInquiries}</p>
            <p className="font-dm-sans text-sm text-body-slate">{t.noInquiriesDesc}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => {
              const badge = statusBadge[inq.status] || statusBadge.pending;
              return (
                <div
                  key={inq.inquiry_id}
                  className="border border-border-line rounded-[12px] p-4 hover:border-clinical-teal/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-dm-sans font-semibold text-deep-charcoal truncate">
                          {inq.patient_name}
                        </h3>
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${badge.dot}`} />
                          {t[inq.status as keyof typeof t]}
                        </span>
                      </div>

                      {inq.symptoms && (
                        <p className="font-dm-sans text-sm text-body-slate mb-1 line-clamp-2">
                          <span className="font-medium text-archival-grey">{t.symptoms}:</span>{' '}
                          {inq.symptoms}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-archival-grey font-dm-sans">
                        {inq.preferred_time && (
                          <span>
                            {t.preferredTime}: {formatTime(inq.preferred_time)}
                          </span>
                        )}
                        {inq.created_at && (
                          <span>
                            {t.received}: {formatTime(inq.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {inq.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAccept(inq.inquiry_id)}
                          disabled={actionLoading === inq.inquiry_id}
                          className="font-dm-sans text-sm font-semibold px-4 py-2 bg-confirm-green text-white rounded-lg hover:bg-confirm-green/90 transition disabled:opacity-50"
                        >
                          {t.accept}
                        </button>
                        <button
                          onClick={() => setDeclineModalId(inq.inquiry_id)}
                          disabled={actionLoading === inq.inquiry_id}
                          className="font-dm-sans text-sm font-semibold px-4 py-2 border border-alert-garnet text-alert-garnet rounded-lg hover:bg-alert-garnet/5 transition disabled:opacity-50"
                        >
                          {t.decline}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-line">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="font-dm-sans text-sm px-3 py-1.5 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.previous}
            </button>
            <span className="font-dm-sans text-sm text-archival-grey">
              {t.page} {page} {t.of} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="font-dm-sans text-sm px-3 py-1.5 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {declineModalId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md p-6">
            <h3 className="font-dm-sans font-semibold text-lg text-deep-charcoal mb-4">
              {t.declineTitle}
            </h3>
            <label className="block font-dm-sans text-sm text-body-slate mb-2">
              {t.declineReason}
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full border border-border-line rounded-lg p-3 font-dm-sans text-sm text-deep-charcoal resize-none focus:outline-none focus:border-clinical-teal"
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setDeclineModalId(null);
                  setDeclineReason('');
                }}
                className="font-dm-sans text-sm px-4 py-2 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface transition"
              >
                {t.declineCancel}
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading !== null}
                className="font-dm-sans text-sm font-semibold px-4 py-2 bg-alert-garnet text-white rounded-lg hover:bg-alert-garnet/90 transition disabled:opacity-50"
              >
                {t.declineConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
