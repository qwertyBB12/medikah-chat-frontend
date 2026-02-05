import Image from 'next/image';
import { LOGO_SRC, WORDMARK_SRC } from '../lib/assets';

interface SidebarProps {
  onSignOut: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ onSignOut, onNewChat }: SidebarProps) {
  return (
    <aside className="hidden md:flex md:w-72 lg:w-80 flex-col md:sticky md:top-0 md:h-screen md:max-h-screen md:flex-shrink-0 md:overflow-hidden bg-gradient-to-b from-inst-blue to-[#243447] text-white shadow-[2px_0_12px_rgba(27,42,65,0.12)]">
      <div className="px-6 py-10 flex flex-col items-center gap-5">
        <Image
          src={LOGO_SRC}
          alt="Medikah"
          width={1024}
          height={1024}
          priority
          className="w-20 h-auto mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
        />
        <Image
          src={WORDMARK_SRC}
          alt="Medikah"
          width={600}
          height={200}
          className="w-36 h-auto mx-auto"
        />
      </div>

      <div className="px-6 pb-4">
        <button
          onClick={onNewChat}
          className="font-dm-sans w-full text-center text-[15px] py-3.5 px-5 font-semibold tracking-[0.01em] text-white bg-white/[0.08] backdrop-blur-sm border-[1.5px] border-white/20 rounded-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[rgba(44,122,140,0.2)] hover:border-[rgba(44,122,140,0.4)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.2)] active:translate-y-0"
        >
          New conversation
        </button>
      </div>

      <div className="px-6 py-6">
        <p className="font-dm-sans font-normal text-[13px] text-white/65 leading-relaxed text-center">
          Share what you are feeling. Your conversation stays private and helps your doctor prepare.
        </p>
      </div>

      <div className="flex-1" />

      <div className="px-6 py-6">
        <button
          onClick={onSignOut}
          className="font-dm-sans w-full px-4 py-2.5 font-medium tracking-wide text-sm text-white/80 border border-white/20 transition-all duration-200 hover:bg-white/5 hover:text-white hover:border-white/30 rounded-[8px] text-center"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
