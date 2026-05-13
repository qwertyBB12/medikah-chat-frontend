// Parameterized OG renderer for future Práctikah marketing pages (App Router).
// Migrated from pages/api/og/practikah.tsx in Phase 20.7.1.

import { ImageResponse } from '@vercel/og';
import { tokens } from '../../../../lib/design-tokens';

export const runtime = 'edge';

const MAX_TITLE = 80;
const MAX_SUBTITLE = 120;
const MAX_EYEBROW = 60;

function clamp(input: string | null, max: number): string {
  if (!input) return '';
  return input.length > max ? input.slice(0, max) : input;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = clamp(searchParams.get('title'), MAX_TITLE) || 'Práctikah';
  const subtitle = clamp(searchParams.get('subtitle'), MAX_SUBTITLE);
  const eyebrow = clamp(searchParams.get('eyebrow'), MAX_EYEBROW) || 'práctikah · workspace';

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
            display: 'flex',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'Oswald',
            fontSize: 112,
            color: tokens.colors.cream300,
            textTransform: 'uppercase',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 32,
              color: tokens.colors.cream400,
              marginTop: 24,
              fontWeight: 400,
              display: 'flex',
            }}
          >
            {subtitle}
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
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
