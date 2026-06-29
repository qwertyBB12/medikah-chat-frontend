/**
 * Tests for the Constancia parser (Cédula Verification Cockpit, slice 2).
 *
 * The official SEP "Constancia de Situación Profesional" is the artifact a human
 * admin downloads from the RNP after passing reCAPTCHA. We parse its TEXT layer
 * deterministically into {nombre, título, cédula, institución, año}; an injectable
 * LLM-vision step is the fallback for image-only scans. These tests cover the pure
 * text parser and the fallback orchestration seam — no network, no real OpenAI.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseConstanciaText,
  parseConstancia,
  type ConstanciaFields,
  type VisionExtract,
} from '../lib/verification/constanciaParse';

// A clean, accented constancia with "Label: value" lines.
const WELL_FORMED = `GOBIERNO DE MÉXICO
Secretaría de Educación Pública
Dirección General de Profesiones
Constancia de Situación Profesional

Nombre: JOSÉ LUIS AGUIRRE RODRÍGUEZ
Cédula Profesional: 1234567
Profesión: MÉDICO CIRUJANO
Institución: UNIVERSIDAD NACIONAL AUTÓNOMA DE MÉXICO
Año de Registro: 1998`;

// A messier OCR-style text: no accents, label-on-its-own-line, no colons,
// a date instead of a bare year, and the cédula label before its number.
const OCR_VARIANT = `Numero de Cedula 9876543
Nombre
MARIA FERNANDA GARCIA SOTO
Titulo MEDICO ESPECIALISTA EN PEDIATRIA
Institucion Educativa: INSTITUTO POLITECNICO NACIONAL
Fecha de expedicion: 15/06/2005`;

describe('parseConstanciaText', () => {
  it('extracts all five fields from a well-formed accented constancia', () => {
    const r = parseConstanciaText(WELL_FORMED);
    expect(r.fields.nombre).toBe('JOSÉ LUIS AGUIRRE RODRÍGUEZ');
    expect(r.fields.cedula).toBe('1234567');
    expect(r.fields.titulo).toBe('MÉDICO CIRUJANO');
    expect(r.fields.institucion).toBe('UNIVERSIDAD NACIONAL AUTÓNOMA DE MÉXICO');
    expect(r.fields.anio).toBe('1998');
    expect(r.found).toBe(5);
    expect(r.ok).toBe(true);
  });

  it('parses an OCR variant: no accents, label-on-own-line, no colons, dated year', () => {
    const r = parseConstanciaText(OCR_VARIANT);
    expect(r.fields.nombre).toBe('MARIA FERNANDA GARCIA SOTO');
    expect(r.fields.cedula).toBe('9876543');
    expect(r.fields.titulo).toBe('MEDICO ESPECIALISTA EN PEDIATRIA');
    expect(r.fields.institucion).toBe('INSTITUTO POLITECNICO NACIONAL');
    expect(r.fields.anio).toBe('2005');
    expect(r.ok).toBe(true);
  });

  it('returns only the digits of the cédula, never the label noise', () => {
    const r = parseConstanciaText('Cédula Profesional No.: 5550012');
    expect(r.fields.cedula).toBe('5550012');
  });

  it('is not ok when name or cédula is missing', () => {
    const r = parseConstanciaText('Institución: UNAM\nAño: 2010');
    expect(r.fields.nombre).toBeNull();
    expect(r.fields.cedula).toBeNull();
    expect(r.ok).toBe(false);
  });

  it('returns an empty, not-ok result for unrelated text', () => {
    const r = parseConstanciaText('hello world, this is not a constancia');
    expect(r.found).toBe(0);
    expect(r.ok).toBe(false);
  });
});

describe('parseConstancia (orchestration)', () => {
  it('uses the deterministic text parse and does NOT call vision when text is sufficient', async () => {
    const visionExtract = vi.fn<VisionExtract>();
    const r = await parseConstancia({ text: WELL_FORMED }, { visionExtract });
    expect(r.fields.cedula).toBe('1234567');
    expect(r.source).toBe('text');
    expect(visionExtract).not.toHaveBeenCalled();
  });

  it('falls back to the injected vision extractor when the text parse is not ok', async () => {
    const visionFields: ConstanciaFields = {
      nombre: 'ANA SOFIA TORRES LUNA',
      cedula: '7654321',
      titulo: 'MEDICO CIRUJANO',
      institucion: 'UNIVERSIDAD DE GUADALAJARA',
      anio: '2012',
    };
    const visionExtract = vi.fn().mockResolvedValue(visionFields);
    const r = await parseConstancia(
      { text: 'scanned, no text layer', image: { base64: 'AAAA', mime: 'image/png' } },
      { visionExtract },
    );
    expect(visionExtract).toHaveBeenCalledOnce();
    expect(r.fields.nombre).toBe('ANA SOFIA TORRES LUNA');
    expect(r.source).toBe('vision');
    expect(r.ok).toBe(true);
  });

  it('returns the not-ok text result when no image/vision fallback is available', async () => {
    const r = await parseConstancia({ text: 'nothing useful here' });
    expect(r.ok).toBe(false);
    expect(r.source).toBe('text');
  });
});
