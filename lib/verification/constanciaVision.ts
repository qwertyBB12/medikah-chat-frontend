/**
 * LLM-vision fallback for the Constancia parser (Cédula Verification Cockpit).
 *
 * Used only when the deterministic text parse (constanciaParse.ts) cannot read a
 * usable name + cédula — typically an image-only scan with no PDF text layer.
 * This extracts fields for a HUMAN to confirm; it never auto-approves.
 *
 * Provider: OpenAI (GPT-4o vision) — reads OPENAI_API_KEY, mirroring bioPolisher.
 * Injected into parseConstancia() as the `visionExtract` dep so the pure parser
 * stays provider-agnostic and unit-testable.
 */

import OpenAI from 'openai';
import type { ConstanciaFields, VisionExtract } from './constanciaParse';

const PROMPT =
  'This image is an official SEP "Constancia de Situación Profesional" from Mexico. ' +
  'Extract EXACTLY these fields and return JSON with keys: nombre, titulo, cedula, ' +
  'institucion, anio. Rules: nombre = full name as printed; titulo = profession/título; ' +
  'cedula = digits only; anio = 4-digit year of registration; institucion = issuing ' +
  'institution. Use null for any field not legibly present. Never invent data.';

/** Normalize a loosely-typed model field to a trimmed string or null. */
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export const openaiConstanciaVision: VisionExtract = async (image): Promise<ConstanciaFields> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set — vision fallback unavailable');

  const client = new OpenAI({ apiKey });
  const resp = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } },
        ],
      },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? '{}';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const cedulaDigits = str(parsed.cedula)?.replace(/\D/g, '') || null;
  return {
    nombre: str(parsed.nombre),
    titulo: str(parsed.titulo),
    cedula: cedulaDigits,
    institucion: str(parsed.institucion),
    anio: str(parsed.anio),
  };
};
