// Per-request OG renderer for /dr/[slug] physician public profiles (App Router).
// Migrated from pages/api/og/physician/[slug].tsx in Phase 20.7.1.
//
// Reads ?name= and ?specialty= from the query string — these are user-influenced
// inputs, so we length-limit them (T-20-07-01) and JSX-render (no string concat).
// The [slug] route param is unused inside the renderer; the slug is part of the
// URL only so the OG image URL has a stable shape matching /dr/[slug].

import { ImageResponse } from '@vercel/og';
import { tokens } from '../../../../../lib/design-tokens';

export const runtime = 'edge';

const MAX_NAME = 80;
const MAX_SPECIALTY = 80;

function clamp(input: string | null, max: number): string {
  if (!input) return '';
  return input.length > max ? input.slice(0, max) : input;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = clamp(searchParams.get('name'), MAX_NAME) || 'Medikah Physician';
  const specialty = clamp(searchParams.get('specialty'), MAX_SPECIALTY);

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
            fontSize: 20,
            color: tokens.colors.teal400,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          medikah · physician
        </div>
        <div
          style={{
            fontFamily: 'Oswald',
            fontSize: 104,
            color: tokens.colors.cream300,
            textTransform: 'uppercase',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          {name}
        </div>
        {specialty && (
          <div
            style={{
              fontSize: 36,
              color: tokens.colors.cream400,
              marginTop: 20,
              fontWeight: 400,
              display: 'flex',
            }}
          >
            {specialty}
          </div>
        )}
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
        // CDN absorbs repeat requests; mitigates T-20-07-02 (DoS via synthetic slugs).
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
