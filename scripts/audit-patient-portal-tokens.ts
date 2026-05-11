/**
 * Patient Portal Token-Conformance Audit (Plan 20-05, Task 1)
 *
 * READ-ONLY. Walks imports one level deep from pages/patients/*.tsx (and from
 * components/PortalLayout.tsx which the plan also flags as patient-surface),
 * then greps each file for token drift against lib/design-tokens.ts.
 *
 * Drift categories:
 *   - hex   : Hex color literal not in the allowed set (tokens.colors +
 *             tailwind.config.js legacy literals)
 *   - radius: Inline border-radius or `rounded-[...]` value not in
 *             {8, 16, 24, 32, 0, 9999, 50%}
 *   - font  : Inline font-family or Tailwind font-* class outside the
 *             allowed Mulish / Oswald / Mono allowlist
 *   - legacy-font: Legacy Tailwind aliases (font-display / font-inter /
 *             font-instrument / font-playfair / font-source) — catalogued
 *             separately, not "drift" per se but flagged for cleanup
 *
 * Output:
 *   .planning-tmp/patient-portal-audit.json
 *   .planning-tmp/patient-surface-files.txt
 *
 * Usage:
 *   cd medikah-chat-frontend
 *   mkdir -p .planning-tmp
 *   npx tsx scripts/audit-patient-portal-tokens.ts
 *
 * This script does NOT mutate source files. Plan 20-05 Task 2 applies the
 * fixes manually using this JSON + the SUMMARY md as the punch list.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { tokens } from '../lib/design-tokens';

// ---------------------------------------------------------------------------
// Allowed sets
// ---------------------------------------------------------------------------

function collectAllowedHexes(): Set<string> {
  const set = new Set<string>();
  for (const v of Object.values(tokens.colors)) {
    if (typeof v !== 'string') continue;
    // Pull every #RRGGBB inside the string (handles rgba() entries too — rgba
    // does not contain `#`, so they are skipped, which is fine).
    const matches = v.match(/#[0-9a-fA-F]{3,8}/g);
    if (matches) for (const m of matches) set.add(m.toLowerCase());
  }
  // Legacy literals carried in tailwind.config.js (intentional carve-outs).
  for (const legacy of ['#E8F4F6', '#2E476B', '#3A5A85', '#F5F6F8', '#3B82B6', '#243447']) {
    set.add(legacy.toLowerCase());
  }
  return set;
}

const ALLOWED_HEXES = collectAllowedHexes();

const ALLOWED_RADII_PX = new Set(['0', '0px', '8px', '16px', '24px', '32px', '9999px']);
// Tailwind class radii (token-mapped): rounded-sm/md/lg/xl + rounded-none/full
const ALLOWED_TW_RADIUS_CLASSES = new Set([
  'rounded',
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-none',
  'rounded-full',
  'rounded-t-sm',
  'rounded-t-md',
  'rounded-t-lg',
  'rounded-t-xl',
  'rounded-b-sm',
  'rounded-b-md',
  'rounded-b-lg',
  'rounded-b-xl',
  'rounded-l-sm',
  'rounded-l-md',
  'rounded-l-lg',
  'rounded-l-xl',
  'rounded-r-sm',
  'rounded-r-md',
  'rounded-r-lg',
  'rounded-r-xl',
]);

const ALLOWED_FONT_CLASSES = new Set([
  'font-body',
  'font-heading',
  'font-mulish',
  'font-oswald',
  'font-sans',
  'font-mono',
  'font-dm-sans', // backwards-compat alias (CLAUDE.md typography override)
  'font-dm-serif', // backwards-compat alias
]);

const LEGACY_FONT_CLASSES = new Set([
  'font-display',
  'font-inter',
  'font-instrument',
  'font-playfair',
  'font-source',
]);

// ---------------------------------------------------------------------------
// Patient surface: entrypoints + one-level transitive
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');

const ENTRYPOINTS = [
  'pages/patients/index.tsx',
  'components/PortalLayout.tsx',
];

// Legal-file blocklist — these must never be edited. We still audit them
// (visibility), but Task 2 will refuse to apply fixes.
const LEGAL_FILES = new Set([
  'pages/privacy.tsx',
  'pages/terms.tsx',
  'lib/consentContent.ts',
  'lib/physicianConsentContent.ts',
  'components/landing/RegulatoryDisclosure.tsx',
]);

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // skip externals
  const fromDir = path.dirname(path.join(ROOT, fromFile));
  const base = path.resolve(fromDir, spec);
  const candidates = [
    base,
    base + '.ts',
    base + '.tsx',
    base + '.js',
    base + '.jsx',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return path.relative(ROOT, c);
    }
  }
  return null;
}

function collectSurface(): string[] {
  const out = new Set<string>();
  for (const entry of ENTRYPOINTS) {
    const abs = path.join(ROOT, entry);
    if (!fs.existsSync(abs)) continue;
    out.add(entry);
    const src = fs.readFileSync(abs, 'utf8');
    const importRe = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src)) !== null) {
      const resolved = resolveImport(entry, m[1]);
      if (resolved) out.add(resolved);
    }
  }
  return Array.from(out).sort();
}

// ---------------------------------------------------------------------------
// File auditor
// ---------------------------------------------------------------------------

interface Finding {
  file: string;
  line: number;
  category: 'hex' | 'radius' | 'font' | 'legacy-font';
  value: string;
  context: string;
  isLegal: boolean;
}

function auditFile(relPath: string): Finding[] {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  const findings: Finding[] = [];
  const isLegal = LEGAL_FILES.has(relPath);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();

    // Skip pure-comment lines for hex detection (less noise) — but keep them
    // for other categories.
    const isPureComment = /^\s*(\/\/|\*|\/\*)/.test(line);

    // --- Hex literals ---
    if (!isPureComment) {
      const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
      let hm: RegExpExecArray | null;
      while ((hm = hexRe.exec(line)) !== null) {
        const hex = hm[0].toLowerCase();
        // Normalize 3-digit shorthand (e.g. #fff -> #ffffff) for matching.
        const normalized =
          hex.length === 4
            ? '#' + hex.slice(1).split('').map((c) => c + c).join('')
            : hex;
        if (!ALLOWED_HEXES.has(hex) && !ALLOWED_HEXES.has(normalized)) {
          findings.push({
            file: relPath,
            line: lineNo,
            category: 'hex',
            value: hm[0],
            context: trimmed.slice(0, 160),
            isLegal,
          });
        }
      }
    }

    // --- Inline border-radius css ---
    const cssRadiusRe = /border-radius\s*:\s*([^;'"`)\n]+)/g;
    let rm: RegExpExecArray | null;
    while ((rm = cssRadiusRe.exec(line)) !== null) {
      const val = rm[1].trim();
      // Allow shorthand multi-value if all parts are allowed.
      const parts = val.split(/\s+/);
      if (!parts.every((p) => ALLOWED_RADII_PX.has(p) || /^(50%)$/.test(p))) {
        findings.push({
          file: relPath,
          line: lineNo,
          category: 'radius',
          value: val,
          context: trimmed.slice(0, 160),
          isLegal,
        });
      }
    }

    // --- Tailwind arbitrary rounded-[...] ---
    const arbRoundRe = /\brounded(?:-(?:t|b|l|r|tl|tr|bl|br))?-\[([^\]]+)\]/g;
    let arm: RegExpExecArray | null;
    while ((arm = arbRoundRe.exec(line)) !== null) {
      const val = arm[1];
      // Even if value happens to equal 8px etc., a rounded-[...] is a smell
      // because the canonical Tailwind alias exists; flag for swap.
      findings.push({
        file: relPath,
        line: lineNo,
        category: 'radius',
        value: `rounded-[${val}]`,
        context: trimmed.slice(0, 160),
        isLegal,
      });
    }

    // --- Inline font-family css ---
    const fontFaceRe = /font-family\s*:\s*([^;'"`)\n]+)/g;
    let fm: RegExpExecArray | null;
    while ((fm = fontFaceRe.exec(line)) !== null) {
      const val = fm[1].trim();
      const ok =
        /mulish/i.test(val) ||
        /oswald/i.test(val) ||
        /var\(--font-(mulish|oswald|body|heading|sans|mono)\)/i.test(val);
      if (!ok) {
        findings.push({
          file: relPath,
          line: lineNo,
          category: 'font',
          value: val,
          context: trimmed.slice(0, 160),
          isLegal,
        });
      }
    }

    // --- Tailwind font-* classes ---
    // Match font-foo (avoid font-bold/medium/normal/light/semibold/thin/black/extrabold + numerics)
    const fontWeightSkip = new Set([
      'font-thin',
      'font-extralight',
      'font-light',
      'font-normal',
      'font-medium',
      'font-semibold',
      'font-bold',
      'font-extrabold',
      'font-black',
    ]);
    const fontClassRe = /\bfont-[a-z][a-z0-9-]+/gi;
    let fcm: RegExpExecArray | null;
    while ((fcm = fontClassRe.exec(line)) !== null) {
      const cls = fcm[0];
      if (fontWeightSkip.has(cls)) continue;
      if (/^font-\[/.test(cls)) continue; // arbitrary value — covered elsewhere
      if (/^font-(weight|style|size|smoothing|variant|stretch|feature)/.test(cls)) continue;
      if (LEGACY_FONT_CLASSES.has(cls)) {
        findings.push({
          file: relPath,
          line: lineNo,
          category: 'legacy-font',
          value: cls,
          context: trimmed.slice(0, 160),
          isLegal,
        });
      } else if (!ALLOWED_FONT_CLASSES.has(cls)) {
        findings.push({
          file: relPath,
          line: lineNo,
          category: 'font',
          value: cls,
          context: trimmed.slice(0, 160),
          isLegal,
        });
      }
    }
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const surface = collectSurface();
  const findings: Finding[] = [];
  for (const f of surface) findings.push(...auditFile(f));

  const summary = {
    surfaceCount: surface.length,
    totalFindings: findings.length,
    byCategory: {
      hex: findings.filter((f) => f.category === 'hex').length,
      radius: findings.filter((f) => f.category === 'radius').length,
      font: findings.filter((f) => f.category === 'font').length,
      'legacy-font': findings.filter((f) => f.category === 'legacy-font').length,
    },
    legalFileFindings: findings.filter((f) => f.isLegal).length,
  };

  const outDir = path.join(ROOT, '.planning-tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'patient-surface-files.txt'),
    surface.join('\n') + '\n',
  );

  fs.writeFileSync(
    path.join(outDir, 'patient-portal-audit.json'),
    JSON.stringify({ summary, surface, findings }, null, 2),
  );

  // Console summary so CI / re-runs can show the punch-list size.
  console.log('Patient portal token audit complete.');
  console.log(`  Surface files: ${summary.surfaceCount}`);
  console.log(`  Findings: ${summary.totalFindings}`);
  console.log(
    `    hex=${summary.byCategory.hex}  radius=${summary.byCategory.radius}  font=${summary.byCategory.font}  legacy-font=${summary.byCategory['legacy-font']}`,
  );
  if (summary.legalFileFindings > 0) {
    console.log(
      `  WARNING: ${summary.legalFileFindings} finding(s) inside legal files — DO NOT auto-fix (Plan 20-05 <interfaces>).`,
    );
  }
}

main();
