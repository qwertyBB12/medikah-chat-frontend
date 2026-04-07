/** SEP Cédula Profesional registry lookup via Solr endpoint (free, no API key required) */

// SEP Solr endpoint — proxied through Next.js API route (never called client-side)
// Reasons: CORS restrictions, HTTP-only endpoint, same security posture as NPI lookup (T-06-03)
// Source: github.com/fmacias64/cedulas-sep-api, github.com/LuisEduardoHernandez/cedulas-de-la-sep-API
const SEP_SOLR_BASE = 'http://search.sep.gob.mx/solr/cedulasCore/select';

export interface SEPLookupResult {
  found: boolean;
  cedulaNumber?: string;
  fullName?: string; // nombre + paterno + materno joined with space
  titulo?: string; // degree title, e.g. "MEDICO CIRUJANO"
  institucion?: string; // issuing institution
  anioRegistro?: string; // year of registration
  tipo?: string; // cedula type
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export async function lookupCedula(cedulaNumber: string): Promise<SEPLookupResult> {
  // 1. Validate: must be non-empty, digits only (SEP cedula numbers are numeric)
  //    Prevents Solr injection (T-06-04)
  if (!cedulaNumber || cedulaNumber.trim() === '') {
    return { found: false, error: 'Cedula number is required' };
  }

  if (!/^\d+$/.test(cedulaNumber.trim())) {
    return { found: false, error: 'Cedula number must be digits only' };
  }

  // 2. Build Solr query URL — exact match on numCedula field
  const url = `${SEP_SOLR_BASE}?fl=*,score&q=numCedula:${encodeURIComponent(cedulaNumber.trim())}&start=0&rows=3&wt=json`;

  try {
    // 3. Fetch with 7-second timeout (T-06-05 — prevents hung connections to SEP)
    //    SEP is slower than NPPES; 7s shorter than NPI's 10s to fail fast
    //    NOTE: SEP may be unreachable from non-Mexico IPs — always handle gracefully (D-05)
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return { found: false, error: `SEP returned ${response.status}` };
    }

    const data = await response.json() as Record<string, unknown>;
    const responseBody = data?.response as Record<string, unknown> | undefined;
    const docs = responseBody?.docs as Record<string, unknown>[] | undefined;

    if (!docs || docs.length === 0) {
      return { found: false, error: 'Cedula not found in SEP registry', rawResponse: data };
    }

    // 4. Extract fields from first result
    const doc = docs[0];
    const nameParts = [doc.nombre, doc.paterno, doc.materno]
      .filter(Boolean)
      .map(String);

    return {
      found: true,
      cedulaNumber: doc.numCedula ? String(doc.numCedula) : cedulaNumber.trim(),
      fullName: nameParts.join(' ') || undefined,
      titulo: doc.titulo ? String(doc.titulo) : undefined,
      institucion: doc.institucion ? String(doc.institucion) : undefined,
      anioRegistro: doc.anioRegistro ? String(doc.anioRegistro) : undefined,
      tipo: doc.tipo ? String(doc.tipo) : undefined,
      rawResponse: data,
    };
  } catch (err) {
    // On any error (timeout, network, parse) — return graceful failure
    // Doctor is NEVER blocked by SEP failures (D-05)
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { found: false, error: `SEP lookup failed: ${message}` };
  }
}
