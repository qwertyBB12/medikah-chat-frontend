import { ThemeSettings } from '../lib/theme';

interface FooterProps {
  themeSettings: ThemeSettings;
}

export default function Footer({ themeSettings }: FooterProps) {
  return (
    <footer className={`px-6 py-6 text-center text-xs space-y-2 ${themeSettings.footerBackground} ${themeSettings.footerText}`}>
      <p>Every conversation is encrypted and treated with cariño. Your privacy stays at the center of our work.</p>
      <p>Licensed professionals may review chats when needed to ensure you receive safe, thoughtful guidance.</p>
    </footer>
  );
}
