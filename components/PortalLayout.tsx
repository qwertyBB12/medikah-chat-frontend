/**
 * Portal Layout Component
 *
 * Unified layout wrapper for all portal pages (patients, physicians, insurers, employers).
 * Provides consistent structure with sidebar, main content area, and optional chat input.
 */

import { ReactNode, RefObject, KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LOGO_SRC } from '../lib/assets';
import { tokens } from '../lib/design-tokens';
import ChatInput from './ChatInput';
import Footer from './Footer';
import PhysicianIconRail, { RailSurface } from './physician/PhysicianIconRail';
import LanguageToggle from './LanguageToggle';
import CueSurface from './physician/CueSurface';
import { useCueSurface } from '../lib/cue/surface';
import { useBackendToken } from '../lib/useBackendToken';

export type PortalType = 'patient' | 'physician' | 'insurer' | 'employer';

// Portal-specific color schemes
const portalColors: Record<PortalType, {
  sidebarGradient: string;
  accentBorder: string;
}> = {
  patient: {
    sidebarGradient: 'from-inst-blue to-[#243447]',
    accentBorder: 'border-inst-blue',
  },
  physician: {
    // Mirrors SOGo's --mk-surface-base → --mk-surface-deep (custom-sogo.js:203-204)
    // so the physician sidebar reads continuous with Práctikah's mail/contact/calendar rail.
    sidebarGradient: 'from-inst-blue to-[#0D1520]',
    accentBorder: 'border-inst-blue',
  },
  insurer: {
    sidebarGradient: 'from-inst-blue to-[#243447]',
    accentBorder: 'border-inst-blue',
  },
  employer: {
    sidebarGradient: 'from-inst-blue to-[#243447]',
    accentBorder: 'border-inst-blue',
  },
};

interface ChatInputConfig {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  placeholder?: string;
  accentColor?: 'blue' | 'teal';
}

interface PortalLayoutProps {
  children: ReactNode;
  portal: PortalType;
  onSignOut: () => void;
  onNewChat?: () => void;
  sidebarContent?: ReactNode;
  showChatInput?: boolean;
  chatInputProps?: ChatInputConfig;
  headerTitle?: string;
  /** Phase 21: which surface the steady-state icon rail marks active (physician portal). */
  activeSurface?: RailSurface | null;
  /** Phase 21: locale for the icon-rail labels (physician portal). */
  lang?: 'en' | 'es';
  /**
   * Phase 21: opt this surface into the steady-state workspace icon rail.
   * Only a physician who already has a provisioned workspace (the dashboard)
   * should show Mail/Contacts/Calendar — NOT onboarding, where no mailbox
   * exists yet. Defaults false so a surface must explicitly opt in.
   */
  showWorkspaceRail?: boolean;
}

const portalLabels: Record<PortalType, { title: string; subtitle: string }> = {
  patient: {
    title: 'Patient Portal',
    subtitle: 'Share what you are feeling. Your conversation stays private.',
  },
  physician: {
    title: 'Physician Network',
    subtitle: 'Connecting credentialed physicians across the Americas.',
  },
  insurer: {
    title: 'Insurance Portal',
    subtitle: 'Managing international healthcare benefits.',
  },
  employer: {
    title: 'Employer Portal',
    subtitle: 'Supporting employee health internationally.',
  },
};

export default function PortalLayout({
  children,
  portal,
  onSignOut,
  onNewChat,
  sidebarContent,
  showChatInput = false,
  chatInputProps,
  headerTitle,
  activeSurface = null,
  lang = 'en',
  showWorkspaceRail = false,
}: PortalLayoutProps) {
  const railOn = portal === 'physician' && showWorkspaceRail;
  const labels = portalLabels[portal];
  const colors = portalColors[portal];

  // Phase 23 (PRES-03): CueSurface open state + workspace bearer token.
  // The surface is mounted once here, at the layout level, and opens on the
  // medikah:cue:open CustomEvent dispatched by CueLauncher or the SOGo injection.
  const { isOpen: isCueOpen, close: closeCue } = useCueSurface();
  const accessToken = useBackendToken();

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-linen-light text-deep-charcoal">
      {/* Sidebar - Desktop. Physician portal uses a wider sidebar to give
          centered text breathing room from the right-edge vertical wave. */}
      <aside className={`hidden md:flex md:flex-col ${portal === 'physician' ? 'md:w-96 lg:w-[28rem]' : 'md:w-72 lg:w-80'} bg-gradient-to-b ${colors.sidebarGradient} text-white md:sticky md:top-0 md:h-screen md:max-h-screen md:relative`}>
        <div className={`flex flex-col items-center justify-center py-10 gap-3 ${portal === 'physician' ? 'pl-6 pr-16' : 'px-6'}`}>
          <Image
            src={LOGO_SRC}
            alt=""
            width={320}
            height={320}
            priority
            className="w-14 h-auto opacity-80"
          />
          <span className="font-body text-[1.5rem] font-medium tracking-[0.04em] lowercase text-white">
            medikah
          </span>
          <p className="font-body text-xs text-white/50 text-center mt-1">
            {labels.subtitle}
          </p>
        </div>

        {/* Custom sidebar content slot */}
        {sidebarContent && (
          <div className="flex-1 px-4 overflow-y-auto">
            {sidebarContent}
          </div>
        )}

        {/* Default sidebar actions */}
        {!sidebarContent && (
          <div className="flex-1 px-6">
            {onNewChat && (
              <button
                onClick={onNewChat}
                className="font-body w-full py-3 text-center font-semibold text-sm tracking-wide text-white/70 border border-white/20 hover:text-white hover:border-white/30 transition rounded-lg mb-4"
              >
                New conversation
              </button>
            )}
          </div>
        )}

        {/* Language toggle + sign out */}
        <div className={`py-6 mt-auto flex flex-col items-center gap-4 ${portal === 'physician' ? 'pl-6 pr-16' : 'px-6'}`}>
          <LanguageToggle />
          <button
            onClick={onSignOut}
            className="font-body w-full py-3 text-center text-sm font-medium tracking-wide text-white/60 hover:text-white transition"
          >
            Sign out
          </button>
        </div>

        {/* Práctikah vertical wave — physician surface signature.
            Lens-shaped linen bulge protrudes leftward into the navy sidebar
            from the right edge — deepest at the middle, zero at top/bottom
            so logo (top) and sign-out (bottom) sit clear of the curve.
            Same Wave vocabulary as SOGo's horizontal masthead (Plan 20-03),
            different grammar per surface (sidebar = spine, vertical). */}
        {portal === 'physician' && (
          <svg
            className="hidden md:block absolute top-0 right-0 h-full w-[80px] pointer-events-none"
            viewBox="0 0 80 1440"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Práctikah vertical lens — single bezier full-height arc, linen
                bulges left into navy sidebar. Wider sidebar (above) + shallower
                lens (80px) keeps the curve hugging the right edge well clear
                of the centered text column. */}
            <path
              d="M80,0 C0,480 0,960 80,1440 Z"
              fill={tokens.colors.linenLight}
            />
          </svg>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-linen-light">
        {/* Mobile header */}
        <header className={`md:hidden px-4 py-4 bg-gradient-to-r ${colors.sidebarGradient} text-white`}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={LOGO_SRC}
                alt=""
                width={96}
                height={96}
                priority
                className="w-8 h-auto opacity-80"
              />
              <span className="font-body text-[1.125rem] font-medium tracking-[0.04em] lowercase text-white">
                medikah
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              {railOn ? (
                /* Phase 21: steady-state icon rail (waffle on mobile), white ink on the navy header. */
                <PhysicianIconRail active={activeSurface} tone="light" lang={lang} onSignOut={onSignOut} />
              ) : (
                <div className="flex items-center gap-3">
                  {onNewChat && (
                    <button
                      onClick={onNewChat}
                      className="font-body px-3 py-2 text-xs font-semibold tracking-wide text-white/70 hover:text-white transition"
                    >
                      New chat
                    </button>
                  )}
                  <button
                    onClick={onSignOut}
                    className="font-body px-3 py-2 text-xs font-semibold tracking-wide text-white/80 border border-white/20 hover:text-white hover:border-white/30 transition rounded-sm"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Práctikah wave — horizontal masthead grammar for the mobile
            physician surface. Fill matches the mobile header's horizontal
            gradient (from-inst-blue → #0D1520) so the wave reads as a
            continuation of the header, not a separate band. */}
        {portal === 'physician' && (
          <svg
            className="md:hidden block -mt-px w-full h-[60px]"
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="mk-mobile-wave-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={tokens.colors.instBlue} />
                <stop offset="100%" stopColor="#0D1520" />
              </linearGradient>
            </defs>
            <path
              d="M0,60 C480,0 960,0 1440,60 L1440,0 L0,0 Z"
              fill="url(#mk-mobile-wave-fill)"
            />
          </svg>
        )}

        {/* Desktop top chrome bar — physician steady-state icon rail (Phase 21).
            Sticky above the internally-scrolling content so the rail stays put.
            headerTitle anchors the left (physician workspace surfaces only;
            still unused by patient/insurer/employer). */}
        {railOn && (
          <header className="hidden md:flex items-center justify-between shrink-0 h-16 px-8 bg-linen-light border-b border-warm-gray-800/[0.06]">
            {headerTitle ? (
              <span className="font-body text-sm font-semibold tracking-[0.1em] uppercase text-body-slate">
                {headerTitle}
              </span>
            ) : (
              <span />
            )}
            <PhysicianIconRail active={activeSurface} tone="dark" lang={lang} onSignOut={onSignOut} />
          </header>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Chat input - conditionally rendered */}
        {showChatInput && chatInputProps && (
          <ChatInput
            value={chatInputProps.value}
            onChange={chatInputProps.onChange}
            onSubmit={chatInputProps.onSubmit}
            onKeyDown={chatInputProps.onKeyDown}
            textareaRef={chatInputProps.textareaRef}
            isSending={chatInputProps.isSending}
            placeholder={chatInputProps.placeholder}
            accentColor={chatInputProps.accentColor}
          />
        )}

        <Footer />
      </div>

      {/* Phase 23 (PRES-03): CueSurface — mounted once at layout level.
          Opens on the medikah:cue:open CustomEvent (dispatched by CueLauncher)
          or Cmd+K (handled by useCueSurface in lib/cue/surface.ts).
          NOT mounted in DashboardContent — the layout owns the rail + the surface. */}
      <CueSurface
        isOpen={isCueOpen}
        onClose={closeCue}
        accessToken={accessToken}
        locale={lang === 'es' ? 'es' : 'en'}
      />
    </div>
  );
}
