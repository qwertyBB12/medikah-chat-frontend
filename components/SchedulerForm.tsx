import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import { getSchedulerCopy, SupportedLang } from '../lib/i18n';
import { postSchedule, ScheduleSuccessResponse } from '../lib/scheduleClient';
import { ThemeKey } from '../lib/theme';

interface SchedulerFormProps {
  lang?: SupportedLang;
  className?: string;
  defaultOpen?: boolean;
  theme?: ThemeKey;
}

interface DoctorOption {
  id: string;
  label: string;
}

const DOCTORS: DoctorOption[] = [
  { id: 'alvarez', label: 'Dr. Alvarez' },
  { id: 'gutierrez', label: 'Dr. Gutierrez' },
  { id: 'lopez', label: 'Dr. Lopez' },
];

export default function SchedulerForm({
  lang = 'en',
  className,
  defaultOpen = false,
  theme = 'ocean',
}: SchedulerFormProps) {
  const { data: session } = useSession();
  const copy = useMemo(() => getSchedulerCopy(lang), [lang]);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorId, setDoctorId] = useState<DoctorOption['id']>(DOCTORS[0].id);
  const [preferredTime, setPreferredTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ScheduleSuccessResponse | null>(null);
  const panelBaseClasses =
    theme === 'warm'
      ? 'border-white/30 bg-[#874b49]/90 text-white'
      : 'border-white/30 bg-black/40 text-white';
  const inputBaseClasses =
    theme === 'warm'
      ? 'bg-white/10 text-white focus:ring-white/70 placeholder:text-white/40'
      : 'bg-white/10 text-white focus:ring-white/70 placeholder:text-white/40';
  const buttonClasses =
    theme === 'warm'
      ? 'bg-white/20 hover:bg-white/30 text-white'
      : 'bg-white/20 hover:bg-white/30 text-white';

  const sessionName = session?.user?.name ?? '';
  const sessionEmail = session?.user?.email ?? '';
  const lockIdentityFields = Boolean(sessionName || sessionEmail);

  useEffect(() => {
    if (sessionName) {
      setPatientName(sessionName);
    }
  }, [sessionName]);

  useEffect(() => {
    if (sessionEmail) {
      setPatientEmail(sessionEmail);
    }
  }, [sessionEmail]);

  const handleToggle = () => {
    setIsOpen((open) => !open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!patientName.trim() || !patientEmail.trim() || !preferredTime.trim()) {
      setError(copy.fieldRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const doctor = DOCTORS.find((option) => option.id === doctorId) ?? DOCTORS[0];
      const appointmentIso = new Date(preferredTime).toISOString();
      const response = await postSchedule({
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
        doctorName: doctor.label,
        appointmentTimeISO: appointmentIso,
        symptoms: symptoms.trim() || undefined,
      });
      console.info('Medikah scheduler response', response);
      setResult(response);
      setSuccessMessage(copy.confirmed);
      setError(null);
    } catch (err) {
      console.error('Medikah scheduler error', err);
      setError(copy.failed);
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={`rounded-2xl backdrop-blur-md shadow-lg transition ${panelBaseClasses} ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-sm uppercase tracking-wide"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true">📅</span>
          {copy.scheduleVisit}
        </span>
        <span className="text-xs">{isOpen ? '—' : '+'}</span>
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-white/10 px-5 py-5 text-sm">
          {error ? (
            <div className="scheduler-fade rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-100">
              ❌ {error}
            </div>
          ) : null}

          {successMessage && result ? (
            <div className="scheduler-fade space-y-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-100">
              <p>✅ {successMessage}</p>
              <div className="space-y-2 text-xs">
                <a
                  href={result.doxy_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md bg-emerald-600/40 px-3 py-2 font-medium hover:bg-emerald-600/60"
                >
                  {copy.doxyLinkLabel} →
                </a>
                <a
                  href={result.calendar_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md bg-emerald-600/40 px-3 py-2 font-medium hover:bg-emerald-600/60"
                >
                  {copy.calendarLinkLabel} →
                </a>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/70">{copy.patientName}</span>
              <input
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className={`rounded-md px-3 py-2 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-white/5 ${inputBaseClasses}`}
                placeholder="Ada Lovelace"
                required
                disabled={lockIdentityFields && Boolean(sessionName)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/70">{copy.patientEmail}</span>
              <input
                type="email"
                value={patientEmail}
                onChange={(event) => setPatientEmail(event.target.value)}
                className={`rounded-md px-3 py-2 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-white/5 ${inputBaseClasses}`}
                placeholder="ada@example.com"
                required
                disabled={lockIdentityFields && Boolean(sessionEmail)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/70">{copy.doctorName}</span>
              <select
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                className={`rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${inputBaseClasses}`}
              >
                <option value="" disabled>
                  {copy.chooseDoctor}
                </option>
                {DOCTORS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/70">{copy.preferredTime}</span>
              <input
                type="datetime-local"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                className={`rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${inputBaseClasses}`}
                required
              />
              <span className="text-[11px] text-white/60">{copy.timeHint}</span>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/70">{copy.symptoms}</span>
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={3}
              className={`rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${inputBaseClasses}`}
              placeholder={copy.symptomsPlaceholder}
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClasses}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.scheduling : copy.book}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
