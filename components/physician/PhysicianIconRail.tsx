/**
 * PhysicianIconRail — Phase 21 cross-surface steady-state navigation.
 *
 * One identical five-icon rail (Mail · Contacts · Calendar · Dashboard · Power)
 * rendered top-right on every physician steady-state surface so jumping between
 * the dashboard and the Práctikah workspace feels like one product.
 *
 * - Inline at >=960px (matches the SOGo collapse breakpoint); folds into a
 *   disclosure dropdown below that (NAV-02).
 * - Active surface = filled teal-tint pill + 2px masthead underline, declared
 *   per-surface by the caller (NAV-03 — URL-derived at each surface), with
 *   aria-current on every active item.
 * - `tone="dark"` = navy ink for light/linen backgrounds (desktop top bar);
 *   `tone="light"` = white ink for navy backgrounds (mobile header).
 * - Hovering a workspace icon pre-warms the cross-origin handoff with a
 *   one-time credentialed <link rel="preconnect"> (FLOW-04).
 * - Mail/Contacts/Calendar deep-link to the matching SOGo module using the
 *   signed-in physician's mailbox login (session.user.mailbox_email); they fall
 *   back to the SOGo base when no mailbox email is on the session.
 */

import Link from 'next/link';
import { useState, useEffect, useRef, type ReactElement } from 'react';
import { useSession } from 'next-auth/react';
import CueLauncher from './CueLauncher';

export type RailSurface = 'mail' | 'contacts' | 'calendar' | 'dashboard';

const WORKSPACE_ORIGIN = 'https://practikah.medikah.health';
const WORKSPACE_BASE = `${WORKSPACE_ORIGIN}/SOGo/`;

// Per-module SOGo URL from the physician's mailbox login. Mirrors the relative
// module hrefs SOGo's own masthead uses (../Mail, ../Contacts, ../Calendar from
// /SOGo/so/<login>/...). SOGo carries the login literally (unencoded @). Falls
// back to the SOGo base when the mailbox email isn't known.
function sogoModuleUrl(email: string | undefined, mod: 'Mail' | 'Contacts' | 'Calendar') {
  if (!email) return WORKSPACE_BASE;
  return `${WORKSPACE_ORIGIN}/SOGo/so/${email}/${mod}`;
}

function buildDestinations(email: string | undefined): Record<RailSurface, { href: string; external: boolean }> {
  return {
    mail: { href: sogoModuleUrl(email, 'Mail'), external: true },
    contacts: { href: sogoModuleUrl(email, 'Contacts'), external: true },
    calendar: { href: sogoModuleUrl(email, 'Calendar'), external: true },
    dashboard: { href: '/physicians/dashboard', external: false },
  };
}

const LABELS: Record<RailSurface | 'power', { en: string; es: string }> = {
  mail: { en: 'Mail', es: 'Correo' },
  contacts: { en: 'Contacts', es: 'Contactos' },
  calendar: { en: 'Calendar', es: 'Calendario' },
  dashboard: { en: 'Dashboard', es: 'Panel' },
  power: { en: 'Sign out', es: 'Cerrar sesión' },
};

const ORDER: RailSurface[] = ['mail', 'contacts', 'calendar', 'dashboard'];

// --- Inline SVG icons (currentColor, 1.75 stroke) --------------------------
type IconProps = { className?: string };
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" {...stroke} />
      <path d="M3.5 6.5 12 13l8.5-6.5" {...stroke} />
    </svg>
  );
}
function ContactsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" {...stroke} />
      <path d="M5 19a7 7 0 0 1 14 0" {...stroke} />
    </svg>
  );
}
function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" {...stroke} />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" {...stroke} />
    </svg>
  );
}
function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" {...stroke} />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" {...stroke} />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" {...stroke} />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" {...stroke} />
    </svg>
  );
}
function PowerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      <path d="M12 3.5v8" {...stroke} />
      <path d="M7 6.5a8 8 0 1 0 10 0" {...stroke} />
    </svg>
  );
}
function WaffleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className={className} aria-hidden="true">
      {[6, 12, 18].flatMap((cy) =>
        [6, 12, 18].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="currentColor" />)
      )}
    </svg>
  );
}

const ICONS: Record<RailSurface | 'power', (p: IconProps) => ReactElement> = {
  mail: MailIcon,
  contacts: ContactsIcon,
  calendar: CalendarIcon,
  dashboard: DashboardIcon,
  power: PowerIcon,
};

// --- preconnect-on-hover (one-time, credentialed) --------------------------
// Default (credentialed) mode so the warmed socket is reusable by the actual
// cookie-bearing SOGo navigation — anonymous/CORS mode would not be reused.
let preconnected = false;
function warmWorkspace() {
  if (preconnected || typeof document === 'undefined') return;
  preconnected = true;
  const l = document.createElement('link');
  l.rel = 'preconnect';
  l.href = WORKSPACE_ORIGIN;
  document.head.appendChild(l);
}

// --- tone palette ----------------------------------------------------------
const TONE = {
  dark: {
    idle: 'text-body-slate hover:text-inst-blue',
    active: 'text-clinical-teal bg-clinical-teal/10',
    underline: 'bg-clinical-teal',
    waffleBtn: 'text-body-slate hover:text-inst-blue',
  },
  light: {
    idle: 'text-white/70 hover:text-white',
    active: 'text-white bg-white/15',
    underline: 'bg-teal-300',
    waffleBtn: 'text-white/80 hover:text-white',
  },
} as const;

let railSeq = 0;

interface PhysicianIconRailProps {
  active?: RailSurface | null;
  tone?: 'light' | 'dark';
  lang?: 'en' | 'es';
  onSignOut: () => void;
  className?: string;
  /**
   * 'auto' (default): inline icons >=960px, disclosure dropdown below.
   * 'inline': always render the inline icon row (for embedding inside an
   * already-open container like the homepage mobile menu).
   */
  layout?: 'auto' | 'inline';
}

export default function PhysicianIconRail({
  active = null,
  tone = 'dark',
  lang = 'en',
  onSignOut,
  className = '',
  layout = 'auto',
}: PhysicianIconRailProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelIdRef = useRef<string>('');
  if (!panelIdRef.current) panelIdRef.current = `mk-rail-menu-${++railSeq}`;

  const { data: session } = useSession();
  const workspaceEmail = session?.user?.mailbox_email;
  const DESTINATIONS = buildDestinations(workspaceEmail);
  const palette = TONE[tone];

  // Escape closes the dropdown and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function itemClasses(isActive: boolean) {
    return `relative flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-200 ${
      isActive ? palette.active : palette.idle
    }`;
  }

  // One inline item (Mail/Contacts/Calendar/Dashboard)
  function InlineItem({ surface }: { surface: RailSurface }) {
    const Icon = ICONS[surface];
    const isActive = active === surface;
    const label = LABELS[surface][lang];
    const dest = DESTINATIONS[surface];
    const inner = (
      <>
        <Icon />
        {isActive && (
          <span
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full ${palette.underline}`}
            aria-hidden="true"
          />
        )}
      </>
    );
    if (dest.external) {
      return (
        <a
          href={dest.href}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
          title={label}
          onMouseEnter={warmWorkspace}
          className={itemClasses(isActive)}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={dest.href} aria-label={label} title={label} aria-current={isActive ? 'page' : undefined} className={itemClasses(isActive)}>
        {inner}
      </Link>
    );
  }

  return (
    <nav className={`flex items-center ${className}`} aria-label={lang === 'es' ? 'Navegación del espacio de trabajo' : 'Workspace navigation'}>
      {/* Inline rail — >=960px (or always, when layout="inline") */}
      <div className={layout === 'inline' ? 'flex items-center gap-1' : 'hidden min-[960px]:flex items-center gap-1'}>
        {ORDER.map((surface) => (
          <InlineItem key={surface} surface={surface} />
        ))}
        {/* Phase 22 (PRES-01/02): Cue launcher — bare glyph at consistent anchor.
            Mounted right of the navigation icons, left of the divider+power pair,
            so it groups with workspace navigation rather than the sign-out control.
            Click handler is a stub (Phase 23 wires the summoned surface). */}
        <CueLauncher tone={tone} lang={lang} />
        {/* Group boundary between the nav cluster (…Dashboard·Cue) and the
            destructive Power control. Deliberately weighted — full item height
            (h-10) + wider gap (mx-2) + raised opacity — so the identity→alert
            seam reads pre-attentively on both navy and linen, mitigating a
            Cue-breath-drawn mis-saccade onto sign-out (UIUX review 2026-06-22). */}
        <span className={`mx-2 h-10 w-px ${tone === 'light' ? 'bg-white/30' : 'bg-warm-gray-800/25'}`} aria-hidden="true" />
        <button type="button" onClick={onSignOut} aria-label={LABELS.power[lang]} title={LABELS.power[lang]} className={itemClasses(false)}>
          <PowerIcon />
        </button>
      </div>

      {/* Disclosure dropdown — <960px (hidden when layout="inline") */}
      <div className={layout === 'inline' ? 'hidden' : 'relative min-[960px]:hidden'}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={warmWorkspace}
          aria-expanded={open}
          aria-controls={panelIdRef.current}
          aria-label={lang === 'es' ? 'Menú' : 'Menu'}
          className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-200 ${palette.waffleBtn}`}
        >
          <WaffleIcon />
        </button>

        {open && (
          <>
            {/* click-away */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              id={panelIdRef.current}
              aria-label={lang === 'es' ? 'Navegación del espacio de trabajo' : 'Workspace navigation'}
              className="absolute right-0 mt-2 z-50 w-52 rounded-md bg-linen-white shadow-lg ring-1 ring-warm-gray-800/10 py-1.5"
            >
              {ORDER.map((surface) => {
                const Icon = ICONS[surface];
                const isActive = active === surface;
                const label = LABELS[surface][lang];
                const dest = DESTINATIONS[surface];
                const rowCls = `flex items-center gap-3 px-4 py-2.5 text-sm font-body transition-colors ${
                  isActive ? 'text-clinical-teal bg-clinical-teal/8 font-semibold' : 'text-body-slate hover:bg-linen-warm/40'
                }`;
                const row = (
                  <>
                    <Icon className="shrink-0" />
                    <span>{label}</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clinical-teal" aria-hidden="true" />}
                  </>
                );
                return dest.external ? (
                  <a
                    key={surface}
                    href={dest.href}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={warmWorkspace}
                    onClick={() => setOpen(false)}
                    className={rowCls}
                  >
                    {row}
                  </a>
                ) : (
                  <Link key={surface} href={dest.href} aria-current={isActive ? 'page' : undefined} onClick={() => setOpen(false)} className={rowCls}>
                    {row}
                  </Link>
                );
              })}
              <div className="my-1 h-px bg-warm-gray-800/10" aria-hidden="true" />
              {/* Phase 22 (PRES-01/02): Cue launcher row in the mobile dropdown —
                  consistent anchor mirrors the inline rail position. */}
              <div className="flex items-center gap-3 px-4 py-1.5">
                <CueLauncher tone="dark" lang={lang} />
                <span className="text-sm font-body text-body-slate">Cue</span>
              </div>
              <div className="my-1 h-px bg-warm-gray-800/10" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-body-slate hover:bg-linen-warm/40 transition-colors"
              >
                <PowerIcon className="shrink-0" />
                <span>{LABELS.power[lang]}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
