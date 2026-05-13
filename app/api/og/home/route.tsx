// Per-request OG renderer for the public homepage (App Router).
// Migrated from pages/api/og/home.tsx in Phase 20.7.1 — @netlify/plugin-nextjs
// only translates App Router route handlers into Netlify Edge Functions;
// pages-router edge routes fall back to Node serverless and crash on the Web
// Request signature. See `.planning/phases/20.../20-07.1-SUMMARY.md`.
//
// Copy: "Care Without Distance" (CLAUDE.md brand context — never "cross-border").
// Bilingual: ?lang=es flips to "Cuidado Sin Distancia".

import { ImageResponse } from '@vercel/og';
import { tokens } from '../../../../lib/design-tokens';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') === 'es' ? 'es' : 'en';

  const eyebrow = 'medikah';
  const headline = lang === 'es' ? 'CUIDADO SIN DISTANCIA' : 'CARE WITHOUT DISTANCE';
  const subline = lang === 'es'
    ? 'Coordinación de salud panamericana'
    : 'Pan-American health coordination';

  const [mulishRegular, mulishSemiBold, oswald] = await Promise.all([
    fetch(new URL('/fonts/Mulish-Regular.ttf', req.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('/fonts/Mulish-SemiBold.ttf', req.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('/fonts/Oswald-Medium.ttf', req.url)).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: tokens.gradients.navy,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'Mulish',
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: tokens.colors.teal400,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            marginBottom: 32,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'Oswald',
            fontSize: 128,
            color: tokens.colors.cream300,
            textTransform: 'uppercase',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            fontWeight: 500,
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontSize: 32,
            color: tokens.colors.cream400,
            marginTop: 28,
            fontWeight: 400,
          }}
        >
          {subline}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Mulish', data: mulishRegular, weight: 400 },
        { name: 'Mulish', data: mulishSemiBold, weight: 600 },
        { name: 'Oswald', data: oswald, weight: 500 },
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
