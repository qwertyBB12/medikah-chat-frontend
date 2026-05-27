import { Html, Head, Main, NextScript } from 'next/document';

// Plan 20-06: no-flash theme resolver. MUST run before any React render or
// stylesheet load so <html data-theme="..."> is set on first paint. Resolution
// rules mirror lib/useThemeMode.ts AND mailcow-config/sogo/custom-sogo.js:65-128
// so medikah.health and practikah.medikah.health hydrate to the same theme.
//
// Read order: localStorage 'medikah_theme' → cookie 'medikah_theme' → matchMedia.
// Wrapped in try/catch so storage exceptions never block first paint
// (STRIDE T-20-06-03 mitigation).
const NO_FLASH_THEME_SCRIPT = `(function(){
  try {
    var ls = null;
    try { ls = localStorage.getItem('medikah_theme'); } catch (e) {}
    var ckMatch = document.cookie.match(/(?:^|; )medikah_theme=([^;]*)/);
    var ck = ckMatch ? decodeURIComponent(ckMatch[1]) : null;
    var raw = (ls === 'light' || ls === 'dark' || ls === 'auto') ? ls
            : (ck === 'light' || ck === 'dark' || ck === 'auto') ? ck
            : 'auto';
    var resolved = raw;
    if (raw === 'auto') {
      resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* MUST be the first child of <Head> — runs before fonts/CSS. Plan 20-06. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        {/* Oswald is now self-hosted at build time via next/font (see lib/fonts.ts).
            The former render-blocking Google Fonts <link> + preconnects were removed:
            on slow/blocked LatAm networks they delayed first paint before the main
            stylesheet and dropped headings to serif fallback. */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1B2A41" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
