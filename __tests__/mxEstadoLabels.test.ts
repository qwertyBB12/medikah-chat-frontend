import { describe, it, expect } from 'vitest';
import { MX_ESTADOS, MX_ESTADO_LABELS } from '../lib/mxCredentialTypes';

describe('MX_ESTADO_LABELS (Annotation 4 — full state names)', () => {
  it('has a full-name label for every MX_ESTADOS abbreviation', () => {
    for (const code of MX_ESTADOS) {
      expect(MX_ESTADO_LABELS[code], `missing label for ${code}`).toBeTruthy();
      expect(MX_ESTADO_LABELS[code]).not.toBe(code); // label must differ from the abbreviation
    }
  });

  it('maps known abbreviations to their full names', () => {
    expect(MX_ESTADO_LABELS['CDMX']).toBe('Ciudad de México');
    expect(MX_ESTADO_LABELS['NL']).toBe('Nuevo León');
    expect(MX_ESTADO_LABELS['BCS']).toBe('Baja California Sur');
  });
});
