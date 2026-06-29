/**
 * Constancia parser (Cédula Verification Cockpit, slice 2).
 *
 * Turns the official SEP "Constancia de Situación Profesional" into the five
 * fields a human admin matches against the doctor's profile. The text layer is
 * parsed deterministically (no model, no network); an injectable LLM-vision step
 * is the fallback for image-only scans that have no usable text layer.
 *
 * This NEVER auto-approves. It extracts evidence for a human to confirm.
 */

export interface ConstanciaFields {
  /** Full name as printed on the constancia. */
  nombre: string | null;
  /** Profession / título / grado, e.g. "MÉDICO CIRUJANO". */
  titulo: string | null;
  /** Cédula profesional — digits only. */
  cedula: string | null;
  /** Issuing institution. */
  institucion: string | null;
  /** Four-digit year of registration / expedition. */
  anio: string | null;
}

export interface ConstanciaParseResult {
  fields: ConstanciaFields;
  /** Count of the five fields that were found (0..5). */
  found: number;
  /** True only when a usable identity (name AND cédula) was extracted. */
  ok: boolean;
  /** Which path produced the fields. */
  source: 'text' | 'vision';
}

/** An image handed to the vision fallback when the PDF has no text layer. */
export interface ConstanciaImage {
  base64: string;
  mime: string;
}

export type VisionExtract = (image: ConstanciaImage) => Promise<ConstanciaFields>;

const EMPTY: ConstanciaFields = {
  nombre: null,
  titulo: null,
  cedula: null,
  institucion: null,
  anio: null,
};

/**
 * Pull the free-text value that follows a labelled field. Handles three real
 * layouts: "Label: value", a bare "Label" with the value on the next line, and
 * "Label value" with no colon. `labelAlts` is a regex fragment of accent-tolerant
 * alternatives (e.g. `instituci[oó]n|universidad`).
 */
function fieldAfterLabel(text: string, labelAlts: string): string | null {
  const label = `(?:${labelAlts})`;
  // "Label ... : value"
  const colon = text.match(new RegExp(`(?:^|\\n)[ \\t]*${label}[^:\\n]*:[ \\t]*([^\\n]+)`, 'i'));
  if (colon && colon[1].trim()) return colon[1].trim();
  // "Label" then value on the next non-empty line
  const nextLine = text.match(new RegExp(`(?:^|\\n)[ \\t]*${label}[ \\t]*\\n+[ \\t]*([^\\n]+)`, 'i'));
  if (nextLine && nextLine[1].trim()) return nextLine[1].trim();
  // "Label value" (no colon, same line, label at line start)
  const inline = text.match(new RegExp(`(?:^|\\n)[ \\t]*${label}[ \\t]+([^\\n:]+)`, 'i'));
  if (inline && inline[1].trim()) return inline[1].trim();
  return null;
}

export function parseConstanciaText(text: string): ConstanciaParseResult {
  const src = text || '';

  // Cédula: the first 5–8 digit run shortly after a "cédula" label.
  const cedulaMatch = src.match(/c[eé]dula[^\d]{0,40}?(\d{5,8})/i);
  const cedula = cedulaMatch ? cedulaMatch[1] : null;

  // Año: prefer a 4-digit year near a registro/expedición label; else any year.
  const anioLabelled = src.match(
    /(?:a[ñn]o|registro|expedici[oó]n|expedid[oa])[^\n]*?\b((?:19|20)\d{2})\b/i,
  );
  const anioMatch = anioLabelled || src.match(/\b((?:19|20)\d{2})\b/);
  const anio = anioMatch ? anioMatch[1] : null;

  const nombre = fieldAfterLabel(src, 'nombre');
  const titulo = fieldAfterLabel(src, 't[ií]tulo|profesi[oó]n|grado');
  const institucion = fieldAfterLabel(src, 'instituci[oó]n|universidad');

  const fields: ConstanciaFields = { nombre, titulo, cedula, institucion, anio };
  const found = (Object.values(fields) as (string | null)[]).filter(Boolean).length;
  const ok = Boolean(nombre && cedula);
  return { fields, found, ok, source: 'text' };
}

function countFound(fields: ConstanciaFields): number {
  return (Object.values(fields) as (string | null)[]).filter(Boolean).length;
}

/**
 * Parse a constancia from its extracted text, falling back to an injected vision
 * extractor when the text layer is insufficient and an image is available. The
 * vision dependency is injected so callers (and tests) control the model seam.
 */
export async function parseConstancia(
  input: { text?: string; image?: ConstanciaImage },
  deps: { visionExtract?: VisionExtract } = {},
): Promise<ConstanciaParseResult> {
  const textResult = parseConstanciaText(input.text || '');
  if (textResult.ok) return textResult;

  if (input.image && deps.visionExtract) {
    const fields = await deps.visionExtract(input.image);
    return {
      fields: { ...EMPTY, ...fields },
      found: countFound(fields),
      ok: Boolean(fields.nombre && fields.cedula),
      source: 'vision',
    };
  }

  return textResult;
}
