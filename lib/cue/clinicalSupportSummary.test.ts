import { describe, it, expect } from 'vitest';
import { buildClinicalSupportSummaryHtml, clinicalSupportSubject } from './clinicalSupportSummary';
import type { CueClinicalSupportCard } from './cueStream';

const CARD: CueClinicalSupportCard = {
  kind: 'clinical_support',
  considerations: [
    {
      condition: 'Acute viral pharyngitis',
      rationale: 'Sore throat with low-grade fever',
      confidence: 'HIGH',
      distinguishing_factors: 'Centor criteria; rapid strep antigen',
    },
  ],
  red_flags: ['Difficulty breathing or drooling (possible epiglottitis)'],
  disclaimer: 'Clinical decision support only — not a diagnosis.',
};

describe('buildClinicalSupportSummaryHtml', () => {
  it('renders a full branded HTML document with considerations, red flags, and the disclaimer', () => {
    const html = buildClinicalSupportSummaryHtml(CARD, { locale: 'en', physicianName: 'Dra. García' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Acute viral pharyngitis');
    expect(html).toContain('Centor criteria'); // distinguishing factors
    expect(html).toContain('Difficulty breathing'); // red flag
    expect(html).toContain('not a diagnosis'); // disclaimer travels in the payload
    expect(html).toContain('Dra. García');
    // Framed as decision support — never labeled a diagnosis.
    expect(html.toLowerCase()).toContain('clinical decision support');
  });

  it('escapes HTML in card content (no injection through the model output)', () => {
    const evil: CueClinicalSupportCard = {
      ...CARD,
      considerations: [
        { condition: '<img src=x onerror=alert(1)>', rationale: 'r', confidence: 'LOW', distinguishing_factors: 'd' },
      ],
    };
    const html = buildClinicalSupportSummaryHtml(evil, { locale: 'en' });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('subject is bilingual and never says "diagnosis"', () => {
    expect(clinicalSupportSubject('en').toLowerCase()).toContain('decision-support');
    expect(clinicalSupportSubject('en').toLowerCase()).not.toContain('diagnosis');
    expect(clinicalSupportSubject('es').toLowerCase()).toContain('decisión clínica');
  });
});
