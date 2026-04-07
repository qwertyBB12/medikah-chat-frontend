/** MX credential types for Phase 6 — maps to physician_licenses and physician_certifications tables */

// Matches physician_licenses table row for license_type='cedula_profesional'
// Lifetime credential — expiration_date is always NULL for MX cedulas (per PROJECT.md)
export interface CedulaProfesionalEntry {
  id?: string;
  cedulaNumber: string; // Federal cedula number from SEP
  fullName?: string; // auto-populated from SEP lookup (nombre + paterno + materno)
  titulo?: string; // degree title, e.g. "MEDICO CIRUJANO" — auto-populated from SEP
  institucion?: string; // issuing institution — auto-populated from SEP
  anioRegistro?: string; // year of registration — auto-populated from SEP
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
  verifiedAt?: string;
}

// Matches physician_licenses table row for license_type='registro_estatal'
export interface RegistroEstatalEntry {
  id?: string;
  numeroRegistro: string; // state registration number
  issuingState: string; // MX estado abbreviation (e.g., 'CDMX', 'NL', 'JAL')
  degreeType: string; // 'medico_cirujano' | 'especialista' | other
  registrationDate?: string; // ISO date YYYY-MM-DD
}

// Matches physician_licenses table row for license_type='cedula_especialidad'
// Lifetime credential — expiration_date is always NULL for MX cedulas
export interface CedulaEspecialidadEntry {
  id?: string;
  specialtyName: string;
  institution: string;
  completionDate?: string; // ISO date YYYY-MM-DD
  cedulaNumber: string; // specialty-specific cedula number
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
  // Document upload state (not persisted here — tracked separately in physician_documents)
  diplomaFrontUploaded?: boolean;
  diplomaBackUploaded?: boolean;
}

// Matches physician_certifications table row for certification_type='consejo'
export interface ConsejoEntry {
  id?: string;
  consejoName: string; // from CONACEM list or custom entry
  specialty: string; // specialty name this cert covers
  recertificationYear?: number; // year of last recertification cycle (5-year cycles)
  pointThreshold?: number; // optional numeric threshold per D-09 (e.g., 350 for CMGO)
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
}

// Matches physician_certifications table row for certification_type='colegio_membership'
export interface ColegioEntry {
  id?: string;
  colegioName: string; // e.g., 'COMEGO', 'FEMECOG'
  membershipNumber?: string; // optional membership number
  joinedYear?: number;
}

// Discriminated union for MX credential section identifiers
export type MXCredentialSection =
  | 'cedula_profesional'
  | 'registro_estatal'
  | 'cedula_especialidad'
  | 'consejo'
  | 'colegio';

export interface SaveMXCredentialPayload {
  section: MXCredentialSection;
  data:
    | CedulaProfesionalEntry
    | RegistroEstatalEntry
    | CedulaEspecialidadEntry
    | ConsejoEntry
    | ColegioEntry;
}

export interface DeleteMXCredentialPayload {
  section: MXCredentialSection;
  credentialId: string;
}

// Response from GET /api/physicians/[id]/mx-credentials
export interface MXCredentialResponse {
  cedulaProfesional: CedulaProfesionalEntry | null;
  registroEstatal: RegistroEstatalEntry | null;
  especialidades: CedulaEspecialidadEntry[];
  consejos: ConsejoEntry[];
  identity: {
    curp?: string;
    ineFrontUploaded: boolean;
    ineBackUploaded: boolean;
  };
  colegios: ColegioEntry[];
}

// CURP format validation regex (18-character format check — not full check-digit validation)
// Full algorithm is complex; format errors are flagged here, real validation via SEP lookup
// Source: standard CURP regex with complete Mexican state code list
export const CURP_REGEX =
  /^[A-Z]{1}[AEIOUX]{1}[A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

// All 47 CONACEM-recognized specialty councils (Consejos de Especialidades Médicas)
// Source: conacem.org.mx/consejos-especialidades-medicas
// Used in Consejo combobox (D-08) — static list embedded in code
// Phase 8 can add admin management if Consejo list changes
export const CONACEM_CONSEJOS: readonly string[] = [
  'Consejo Mexicano de Alergia e Inmunología Clínica, A.C.',
  'Consejo Mexicano de Anestesiología, A.C.',
  'Consejo Mexicano de Cardiología, A.C.',
  'Consejo Mexicano de Cirugía General, A.C.',
  'Consejo Mexicano de Cirugía Plástica, Estética y Reconstructiva, A.C.',
  'Consejo Mexicano de Coloproctología, A.C.',
  'Consejo Mexicano de Dermatología, A.C.',
  'Consejo Mexicano de Endocrinología, A.C.',
  'Consejo Mexicano de Gastroenterología, A.C.',
  'Consejo Mexicano de Genética Médica, A.C.',
  'Consejo Mexicano de Geriatría, A.C.',
  'Consejo Mexicano de Ginecología y Obstetricia, A.C.',
  'Consejo Mexicano de Hematología, A.C.',
  'Consejo Mexicano de Infectología, A.C.',
  'Consejo Mexicano de Medicina de Urgencias, A.C.',
  'Consejo Mexicano de Medicina del Deporte, A.C.',
  'Consejo Mexicano de Medicina del Trabajo, A.C.',
  'Consejo Mexicano de Medicina Familiar, A.C.',
  'Consejo Mexicano de Medicina Interna, A.C.',
  'Consejo Mexicano de Medicina Nuclear e Imagen Molecular, A.C.',
  'Consejo Mexicano de Neonatología, A.C.',
  'Consejo Mexicano de Nefrología, A.C.',
  'Consejo Mexicano de Neurología, A.C.',
  'Consejo Mexicano de Neurocirugía, A.C.',
  'Consejo Mexicano de Neurofisiología Clínica, A.C.',
  'Consejo Mexicano de Nutriología, A.C.',
  'Consejo Mexicano de Oftalmología, A.C.',
  'Consejo Mexicano de Oncología, A.C.',
  'Consejo Mexicano de Ortopedia y Traumatología, A.C.',
  'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello, A.C.',
  'Consejo Mexicano de Patología Clínica y Medicina de Laboratorio, A.C.',
  'Consejo Mexicano de Pediatría, A.C.',
  'Consejo Mexicano de Psiquiatría, A.C.',
  'Consejo Mexicano de Radiología e Imagen, A.C.',
  'Consejo Mexicano de Radioterapia, A.C.',
  'Consejo Mexicano de Reumatología, A.C.',
  'Consejo Mexicano de Salud Pública, A.C.',
  'Consejo Mexicano de Urología, A.C.',
  'Consejo Mexicano de Neumología y Cirugía de Tórax, A.C.',
  'Consejo Mexicano de Cirugía de Cabeza y Cuello, A.C.',
  'Consejo Mexicano de Cirugía Cardiovascular, A.C.',
  'Consejo Mexicano de Medicina Crítica, A.C.',
  'Consejo Mexicano de Medicina Física y Rehabilitación, A.C.',
  'Consejo Mexicano de Medicina Paliativa, A.C.',
  'Consejo Mexicano de Patología, A.C.',
  'Consejo Mexicano de Trasplantes, A.C.',
  'Consejo Mexicano para la Certificación en Epidemiología, A.C.',
] as const;

// Mexican state abbreviations for Registro Estatal issuing_state dropdown
export const MX_ESTADOS = [
  'AGS', 'BC', 'BCS', 'CAMP', 'CHIS', 'CHIH', 'CDMX', 'COAH', 'COL', 'DGO',
  'GTO', 'GRO', 'HGO', 'JAL', 'MEX', 'MICH', 'MOR', 'NAY', 'NL', 'OAX',
  'PUE', 'QRO', 'QROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAMPS', 'TLAX', 'VER',
  'YUC', 'ZAC',
] as const;
