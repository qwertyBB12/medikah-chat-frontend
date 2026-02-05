/**
 * Portal Layout Component
 *
 * Unified layout wrapper for all portal pages (patients, physicians, insurers, employers).
 * Provides consistent structure with sidebar, main content area, and optional chat input.
 */

import { ReactNode, RefObject, KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LOGO_SRC, WORDMARK_SRC } from '../lib/assets';
import ChatInput from './ChatInput';
import Footer from './Footer';

export type PortalType = 'patient' | 'physician' | 'insurer' | 'employer';

interface ChatInputConfig {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
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
    subtitle: 'Managing cross-border healthcare benefits.',
  },
  employer: {
    title: 'Employer Portal',
    subtitle: 'Supporting employee health across borders.',
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
}: PortalLayoutProps) {
  const labels = portalLabels[portal];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-[#FAFAFB] text-deep-charcoal">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-72 lg:w-80 bg-gradient-to-b from-inst-blue to-[#243447] text-white md:sticky md:top-0 md:h-screen md:max-h-screen">
        <div className="flex flex-col items-center justify-center py-10 px-6">
          <Image
            src={LOGO_SRC}
            alt="Medikah"
            width={320}
            height={320}
            priority
            className="w-16 h-auto mb-4"
          />
          <Image
            src={WORDMARK_SRC}
            alt="Medikah"
            width={480}
            height={180}
            className="w-32 h-auto mb-2"
          />
          <p className="font-dm-sans text-xs text-white/50 text-center">
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
                className="font-dm-sans w-full py-3 text-center font-semibold text-sm tracking-wide text-white/70 border border-white/20 hover:text-white hover:border-white/30 transition rounded-lg mb-4"
              >
                New conversation
              </button>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="px-6 py-6 mt-auto border-t border-white/10">
          <button
            onClick={onSignOut}
            className="font-dm-sans w-full py-3 text-center text-sm font-medium tracking-wide text-white/60 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-[#FAFAFB]">
        {/* Mobile header */}
        <header className="md:hidden px-4 py-4 bg-gradient-to-r from-inst-blue to-[#243447] text-white">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={LOGO_SRC}
                alt="Medikah"
                width={96}
                height={96}
                priority
                className="w-10 h-auto"
              />
              {headerTitle && (
                <span className="font-dm-sans text-sm font-medium text-white/80">
                  {headerTitle}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-3">
              {onNewChat && (
                <button
                  onClick={onNewChat}
                  className="font-dm-sans px-3 py-2 text-xs font-semibold tracking-wide text-white/70 hover:text-white transition"
                >
                  New chat
                </button>
              )}
              <button
                onClick={onSignOut}
                className="font-dm-sans px-3 py-2 text-xs font-semibold tracking-wide text-white/80 border border-white/20 hover:text-white hover:border-white/30 transition rounded-[8px]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

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
          />
        )}

        <Footer />
      </div>
    </div>
  );
}
