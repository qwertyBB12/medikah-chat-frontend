import Image from 'next/image';
import { ThemeKey, ThemeSettings } from '../lib/theme';

interface SidebarProps {
  onSignOut: () => void;
  onNewChat: () => void;
  onToggleTheme: () => void;
  theme: ThemeKey;
  themeSettings: ThemeSettings;
}

export default function Sidebar({
  onSignOut,
  onNewChat,
  onToggleTheme,
  theme,
  themeSettings
}: SidebarProps) {
  const toggleLabel = theme === 'warm' ? 'switch to ocean mode' : 'switch to warm mode';

  return (
    <aside
      className={`hidden md:flex md:w-72 lg:w-80 flex-col md:sticky md:top-0 md:h-screen md:max-h-screen md:flex-shrink-0 md:overflow-hidden ${themeSettings.sidebarBackground}`}
    >
      <div className="px-6 py-8 flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt="Medikah logo"
          width={796}
          height={720}
          priority
          className="w-36 sm:w-40 lg:w-48 h-auto mx-auto"
        />
        <Image
          src="/medikah_wht.png"
          alt="Medikah wordmark"
          width={600}
          height={200}
          className="w-40 sm:w-48 lg:w-56 h-auto mx-auto"
        />
      </div>
      <div className="px-6 py-4 space-y-3">
        <button
          onClick={onNewChat}
          className={`w-full text-left text-sm py-3 px-4 transition rounded-none font-heading font-semibold lowercase ${themeSettings.newChatButton}`}
        >
          → Start a New Chat
        </button>
        <button
          onClick={onToggleTheme}
          className={`w-full text-left text-sm py-3 px-4 transition rounded-none font-heading font-semibold lowercase ${themeSettings.toggleButton}`}
        >
          {toggleLabel}
        </button>
      </div>
      <div className="px-6 py-6 text-sm space-y-3">
        <p className="font-heading font-extrabold text-lg lowercase text-center text-white">
          medikah care team + ai guidance
        </p>
        <p className={`text-base leading-relaxed text-center ${themeSettings.descriptionText}`}>
          This assistant blends GPT-4o insight with clinicians across the Americas. It offers calm, clear guidance so you
          know when to seek hands-on care.
        </p>
      </div>
      <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-3 text-base leading-relaxed text-center ${themeSettings.descriptionText}`}>
        <p>
          Everything you share stays private. Tell us what you’re feeling and we’ll explore the next steps by your side.
        </p>
      </div>
      <div className="px-6 py-6">
        <button
          onClick={onSignOut}
          className={`w-full px-4 py-3 font-heading font-semibold tracking-wide rounded-none lowercase transition ${themeSettings.signOutButton}`}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
