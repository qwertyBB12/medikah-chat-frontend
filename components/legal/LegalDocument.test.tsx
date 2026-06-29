import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LegalDocument from './LegalDocument';
import type { LegalBlock } from '../../lib/legal/blocks';
import { TERMS_CONTENT } from '../../lib/legal/termsContent';

const SAMPLE: LegalBlock[] = [
  { k: 'title', t: 'MEDIKAH CORPORATION' },
  { k: 'subtitle', t: 'Terms of Service' },
  { k: 'meta', t: 'Effective Date: February 1, 2026' },
  { k: 'callout', variant: 'info', blocks: [
    { k: 'callout-title', t: 'About This Document' },
    { k: 'p', t: 'Reach us at support@medikah.health or www.profeco.gob.mx.' },
  ] },
  { k: 'callout', variant: 'warn', blocks: [{ k: 'callout-title', t: 'Binding Agreement' }] },
  { k: 'callout', variant: 'legal', blocks: [{ k: 'callout-title', t: 'LFPC' }] },
  { k: 'h2', t: '1. Eligibility' },
  { k: 'h3', t: '1.1 Age' },
  { k: 'p', t: 'You must be 18.' },
  { k: 'ul', items: ['First', 'Second'] },
  { k: 'section', num: '3', titles: ['Personal Data', 'Datos Personales'] },
  { k: 'table', rows: [[['Right'], ['How']], [['Access'], ['Email us']]] },
  { k: 'warn', t: 'DO NOT USE FOR EMERGENCIES.' },
  { k: 'footermark', t: 'medikah' },
];

describe('LegalDocument renderer', () => {
  const html = renderToStaticMarkup(<LegalDocument blocks={SAMPLE} />);

  it('renders every block kind without throwing', () => {
    expect(html).toContain('MEDIKAH CORPORATION');
    expect(html).toContain('About This Document');
    expect(html).toContain('1. Eligibility');
    expect(html).toContain('<table');
    expect(html).toContain('DO NOT USE FOR EMERGENCIES.');
  });

  it('shows callout variant glyphs (ℹ / ⚠ / §)', () => {
    expect(html).toContain('ℹ');
    expect(html).toContain('⚠');
    expect(html).toContain('§');
  });

  it('linkifies emails (mailto) and URLs (https)', () => {
    expect(html).toContain('href="mailto:support@medikah.health"');
    expect(html).toContain('href="https://www.profeco.gob.mx"');
  });

  it('renders a numbered section header with its number and bilingual titles', () => {
    expect(html).toContain('Personal Data');
    expect(html).toContain('Datos Personales');
  });

  it('renders the real US/en Terms and includes the binding framework', () => {
    const real = renderToStaticMarkup(<LegalDocument blocks={TERMS_CONTENT.US.en} />);
    expect(real).toContain('Business Associate');
    expect(real).toContain('Informational Appointment');
  });
});
