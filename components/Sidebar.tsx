import Image from 'next/image';
import { LOGO_SRC, WORDMARK_SRC } from '../lib/assets';

interface SidebarProps {
  onSignOut: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ onSignOut, onNewChat }: SidebarProps) {
  return (
    <aside className="hidden md:flex md:w-72 lg:w-80 flex-col md:sticky md:top-0 md:h-screen md:max-h-screen md:flex-shrink-0 md:overflow-hidden bg-navy-900 text-cream-300">
      <div className="px-6 py-8 flex flex-col items-center gap-4">
        <Image
          src={LOGO_SRC}
          alt="Medikah"
          width={1024}
          height={1024}
          priority
          className="w-28 sm:w-32 lg:w-36 h-auto mx-auto"
        />
        <Image
          src={WORDMARK_SRC}
          alt="Medikah"
          width={600}
          height={200}
          className="w-36 sm:w-40 lg:w-44 h-auto mx-auto"
        />
      </div>

      <div className="px-6 py-4">
        <button
          onClick={onNewChat}
          className="w-full text-left text-sm py-3 px-4 transition font-heading font-normal uppercase tracking-wider text-cream-300/70 hover:text-cream-300 hover:bg-cream-500/5 rounded-sm"
        >
          New conversation
        </button>
      </div>

      <div className="px-6 py-6 space-y-3">
        <p className="font-body text-sm text-cream-300/50 leading-relaxed text-center">
          Share what you are feeling. Your conversation stays private and helps your doctor prepare.
        </p>
      </div>

      <div className="flex-1" />

      <div className="px-6 py-6">
        <button
          onClick={onSignOut}
          className="w-full px-4 py-3 font-heading font-normal uppercase tracking-wider text-sm text-cream-300/50 border border-cream-500/15 transition hover:text-cream-300/80 hover:border-cream-500/30 rounded-sm"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
