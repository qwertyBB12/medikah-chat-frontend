export type ThemeKey = 'warm' | 'ocean';

export interface ThemeSettings {
  appBackground: string;
  mainPanelBackground: string;
  sidebarBackground: string;
  newChatButton: string;
  toggleButton: string;
  signOutButton: string;
  headerBackground: string;
  rotatorBackground: string;
  emptyStateBackground: string;
  userBubble: string;
  botBubble: string;
  userTextClass: string;
  botTextClass: string;
  primaryButton: string;
  chatInputBackground: string;
  chatInputSurface: string;
  guidanceText: string;
  footerBackground: string;
  footerText: string;
  descriptionText: string;
  headerText: string;
  mobileOutlineButton: string;
  baseTextColor: string;
}

export const THEMES: Record<ThemeKey, ThemeSettings> = {
  warm: {
    appBackground: 'bg-[#b38382]',
    mainPanelBackground: 'bg-[#d4a5a3]',
    sidebarBackground: 'bg-[#1b1b1f] text-white',
    newChatButton: 'bg-white/10 text-white/90 hover:bg-white/20',
    toggleButton: 'border border-white/40 text-white hover:bg-white/10 bg-transparent',
    signOutButton: 'border border-[#1a7c8b]/60 text-[#1a7c8b] hover:bg-[#1a7c8b]/10 hover:border-[#1a7c8b] bg-transparent',
    headerBackground: 'bg-[#874b49]/95 text-white',
    rotatorBackground: 'bg-[#c47f7c]',
    emptyStateBackground: 'bg-[#e8b6b3] text-[#4a2e2d]',
    userBubble: 'bg-[#f4d7d1]/95 rounded-3xl shadow-sm',
    botBubble: 'bg-transparent shadow-none',
    userTextClass: 'text-white',
    botTextClass: 'text-white',
    primaryButton: 'bg-[#1a7c8b] text-white hover:bg-[#166776]',
    chatInputBackground: 'bg-[#c47f7c]/70',
    chatInputSurface: 'bg-[#2b2f33] text-white shadow-lg shadow-black/15',
    guidanceText: 'text-white/85',
    footerBackground: 'bg-[#b07a78]',
    footerText: 'text-white/80',
    descriptionText: 'text-[#3f2a28]',
    headerText: 'text-white/85',
    mobileOutlineButton: 'border border-[#1a7c8b]/60 text-[#1a7c8b] hover:bg-[#1a7c8b]/10 hover:border-[#1a7c8b] bg-transparent',
    baseTextColor: 'text-[#3f2a28]',
  },
  ocean: {
    appBackground: 'bg-[#1a7c8b]',
    mainPanelBackground: 'bg-[#1f8a99]',
    sidebarBackground: 'bg-[#1b1b1f] text-white',
    newChatButton: 'bg-white/10 text-white/90 hover:bg-white/20',
    toggleButton: 'border border-white/50 text-white hover:bg-white/15 bg-transparent',
    signOutButton: 'border border-white/50 text-white hover:bg-white/15 bg-transparent',
    headerBackground: 'bg-[#0d3840]/95 text-white',
    rotatorBackground: 'bg-[#1a7c8b]',
    emptyStateBackground: 'bg-[#1f8a99] text-white/90',
    userBubble: 'bg-transparent shadow-none',
    botBubble: 'bg-transparent shadow-none',
    userTextClass: 'text-white',
    botTextClass: 'text-white',
    primaryButton: 'bg-white/85 text-[#104a53] hover:bg-white',
    chatInputBackground: 'bg-[#165f6b]/80',
    chatInputSurface: 'bg-[#2b2f33] text-white shadow-lg shadow-black/25',
    guidanceText: 'text-white/85',
    footerBackground: 'bg-[#0d3840]',
    footerText: 'text-white/85',
    descriptionText: 'text-white/85',
    headerText: 'text-white/85',
    mobileOutlineButton: 'border border-white/50 text-white hover:bg-white/15 bg-transparent',
    baseTextColor: 'text-white',
  },
};
