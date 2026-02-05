import { FormEvent, useState } from 'react';

const ROLES = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Physician' },
  { value: 'insurer', label: 'Insurer' },
  { value: 'employer', label: 'Employer' },
] as const;

export default function Waitlist() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'duplicate' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });

      if (res.status === 409) {
        setStatus('duplicate');
      } else if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section id="early-access" className="bg-inst-blue px-6 py-24 sm:py-32">
        <div className="max-w-md mx-auto text-center space-y-4">
          <p className="font-dm-sans text-lg text-white">
            Thank you. We will be in touch.
          </p>
          <p className="font-dm-sans text-sm text-white/40">
            Gracias. Estaremos en contacto.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="early-access" className="bg-inst-blue px-6 py-24 sm:py-32">
      <div className="max-w-sm mx-auto">
        {/* Eyebrow — ecosystem pattern */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-[2px] bg-clinical-teal/60" />
          <span className="font-dm-sans text-xs font-semibold uppercase tracking-[0.15em] text-clinical-teal">
            Early access
          </span>
          <div className="w-10 h-[2px] bg-clinical-teal/60" />
        </div>

        <h2 className="font-dm-serif text-xl tracking-wider text-white text-center mb-2">
          Request early access
        </h2>
        <p className="font-dm-sans text-sm text-white/35 text-center mb-10">
          Solicitar acceso anticipado
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="wl-name" className="font-dm-sans text-xs text-white/40 uppercase tracking-wider">
              Name
            </label>
            <input
              id="wl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-dm-sans bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-clinical-teal/60 rounded-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="wl-email" className="font-dm-sans text-xs text-white/40 uppercase tracking-wider">
              Email
            </label>
            <input
              id="wl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-dm-sans bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-clinical-teal/60 rounded-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="wl-role" className="font-dm-sans text-xs text-white/40 uppercase tracking-wider">
              I am a
            </label>
            <select
              id="wl-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="font-dm-sans bg-white/5 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-clinical-teal/60 rounded-none appearance-none"
              required
            >
              <option value="" disabled className="text-deep-charcoal">Select</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="text-deep-charcoal">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {status === 'duplicate' && (
            <p className="font-dm-sans text-sm text-clinical-teal text-center">
              This email is already registered.
            </p>
          )}
          {status === 'error' && (
            <p className="font-dm-sans text-sm text-alert-garnet text-center">
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full px-4 py-3.5 bg-inst-blue text-white font-dm-sans font-semibold tracking-wide text-sm border border-white/20 hover:bg-clinical-teal hover:border-clinical-teal transition rounded-sm disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending\u2026' : 'Submit'}
          </button>
        </form>
      </div>
    </section>
  );
}
