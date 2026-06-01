import { Mulish, IBM_Plex_Mono, Oswald, DM_Serif_Display, DM_Sans } from 'next/font/google';

export const mulish = Mulish({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-mulish',
  display: 'swap',
});

// Self-hosted (build-time) replacement for the former runtime Google Fonts
// <link> in _document. That <link> was a render-blocking third-party dependency
// placed before the main stylesheet; when fonts.googleapis.com was slow/blocked
// (common on LatAm networks) it produced serif-fallback headings and unstyled
// flashes. weight:500 matches the prior `Oswald:wght@500` request exactly.
export const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-oswald',
  display: 'swap',
});

export const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
