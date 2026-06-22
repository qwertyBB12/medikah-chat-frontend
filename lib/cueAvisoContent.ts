/**
 * cueAvisoContent.ts
 *
 * Bilingual (ES / EN) content module for the Cue-scoped aviso de privacidad
 * surface (/cue/aviso-privacidad).
 *
 * Legal basis: LFPDPPP (Ley Federal de Protección de Datos Personales en
 * Posesión de los Particulares) + NOM-024-SSA3 (digital health records norm).
 *
 * IMPORTANT — DRAFT STATUS:
 * This document is a STRUCTURED DRAFT prepared for review by Hector H. Lopez
 * and Mexico-qualified legal counsel prior to the Phase-25 aviso-acknowledgment
 * gate going live. It MUST NOT be presented to users as a counsel-approved
 * instrument until that review is complete and recorded.
 *
 * Scope: Cue — the physician-facing AI workspace assistant in the Práctikah
 * surface. This notice is NOT a Business Associate Agreement (BAA) and is NOT
 * a HIPAA artifact. HIPAA is explicitly out of scope for the Mexico launch
 * (see AI-SPEC §1b). This is the Mexico-law privacy notice the launch needs.
 *
 * CUE-13 — Phase 22. Retention/TTL slot is marked [PATCH-03] for binding
 * during the Phase-25 acknowledgment gate.
 *
 * Do NOT import from frozen legal files:
 *   pages/privacy.tsx, pages/terms.tsx, lib/consentContent.ts,
 *   lib/physicianConsentContent.ts
 */

import { SupportedLang } from './i18n';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface CueAvisoSection {
  id: string;
  heading: string;
  body: string;
}

export interface CueAvisoContent {
  /**
   * Page meta / head title.
   */
  pageTitle: string;
  /**
   * Browser <title> tag value.
   */
  htmlTitle: string;
  /**
   * Prominent draft-status banner shown at the top of the page.
   * Removed by legal counsel once the notice is approved.
   */
  draftBanner: string;
  /**
   * Primary display headline (Oswald, ALL CAPS in the page component).
   */
  headline: string;
  /**
   * Responsible party (responsable) name and contact block — rendered
   * directly below the headline before the section list.
   */
  responsableBlock: string;
  /**
   * Effective / draft date note.
   */
  dateNote: string;
  /**
   * Ordered sections of the aviso.
   */
  sections: CueAvisoSection[];
  /**
   * Footer note — not-a-BAA statement + INAI complaint path.
   */
  footerNote: string;
}

// ---------------------------------------------------------------------------
// Content — Spanish (primary)
// ---------------------------------------------------------------------------

const avisoEs: CueAvisoContent = {
  pageTitle: 'Aviso de Privacidad — Cue para Médicos',
  htmlTitle: 'Aviso de Privacidad de Cue — Medikah / Práctikah',
  draftBanner:
    'BORRADOR — Pendiente de revisión por asesor legal en México. ' +
    'Este documento no ha sido aprobado por consejo jurídico y no debe ' +
    'presentarse a usuarios como instrumento final hasta completar dicha revisión.',
  headline: 'AVISO DE PRIVACIDAD',
  responsableBlock:
    'Responsable: Medikah Corporation\n' +
    'Contacto de privacidad: privacy@medikah.health\n' +
    'Oficial de Protección de Datos (DPO): dpo@medikah.health\n' +
    'Domicilio registrado: Delaware, EE. UU. | Operaciones: Ciudad de México, México',
  dateNote:
    'Versión: BORRADOR | Fecha: Junio 2026 | Pendiente de aprobación legal',
  sections: [
    {
      id: 'identidad',
      heading: '1. Identidad y Domicilio del Responsable',
      body:
        'Medikah Corporation ("Medikah"), entidad incorporada en Delaware, EE. UU., ' +
        'con operaciones en la Ciudad de México, México, es el responsable del tratamiento ' +
        'de sus datos personales en relación con el uso del asistente de IA Cue dentro de ' +
        'la plataforma Práctikah, de conformidad con la Ley Federal de Protección de Datos ' +
        'Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.\n\n' +
        'Cue es la herramienta de apoyo clínico a la toma de decisiones dirigida ' +
        'exclusivamente a médicos verificados. Cue no es un prescriptor ni un dispositivo ' +
        'médico. No realiza diagnósticos ni sustituye el criterio clínico del médico tratante.',
    },
    {
      id: 'finalidad',
      heading: '2. Finalidad del Tratamiento de Datos (Finalidad)',
      body:
        'Los datos que Medikah recaba en el contexto de Cue se tratan para las siguientes ' +
        'finalidades necesarias y proporcionales al servicio:\n\n' +
        '• Proporcionar asistencia de apoyo clínico a la toma de decisiones para el médico ' +
        'verificado durante y entre consultas (apoyo en diferenciales, referencias clínicas, ' +
        'organización de la práctica).\n\n' +
        '• Personalizar el asistente mediante notas de memoria a nivel de práctica ' +
        '(Fase 25, PATCH-03) — derivadas de interacciones del médico, ' +
        'redactadas en tercera persona, sin datos de identificación del paciente ' +
        '(PHI minimizado). Estas notas NO se generan en la Fase 22.\n\n' +
        '• Operar el servicio de análisis de viñetas clínicas anónimas en la superficie ' +
        'de diagnóstico (Fase 24) — las viñetas son anónimas desde el origen; ' +
        'Cue no recibe ni almacena información de identificación del paciente.\n\n' +
        '• Gestión y control de calidad de la plataforma: monitoreo de tokens, ' +
        'presupuesto diario de uso, interruptor de emergencia (kill-switch) y ' +
        'registro de auditoría de llamadas.\n\n' +
        'Finalidades secundarias (opcionales, requieren consentimiento separado):\n' +
        '• Mejora del modelo de inteligencia artificial mediante datos anonimizados ' +
        'y agregados de interacción (sin PHI identificable).',
    },
    {
      id: 'datos',
      heading: '3. Datos Personales Tratados y Postura de Minimización de PHI',
      body:
        'Medikah trata los siguientes datos en el contexto de Cue:\n\n' +
        'Datos de identificación del médico (derivados del perfil verificado en Práctikah):\n' +
        '• Nombre completo, correo electrónico, identificador de sesión autenticada.\n' +
        '• Especialidad médica y configuración de disponibilidad (para personalización del asistente).\n\n' +
        'Datos de interacción con Cue:\n' +
        '• Turnos de conversación de la sesión actual (mantenidos en memoria de sesión ' +
        'únicamente; no se persisten en la Fase 22).\n' +
        '• Presupuesto de tokens del día (almacenado sin contenido de conversación).\n\n' +
        'Notas de memoria a nivel de práctica [FASE 25 / PATCH-03 — no activas en Fase 22]:\n' +
        '• Notas redactadas en tercera persona a nivel de práctica, generadas por el ' +
        'juez de memoria de Cue tras cada turno. POSTURA DE PHI MINIMIZADO: las notas ' +
        'NUNCA incluyen nombre, fecha de nacimiento, número de expediente (MRN), ni ' +
        'ningún otro identificador del paciente. Redacción de ejemplo: ' +
        '"El médico consultó un caso con presentación de disnea en adulto mayor — ' +
        'sin identificadores." El cumplimiento de esta postura es verificado ' +
        'automáticamente antes de persistir cada nota (PATCH-01).\n\n' +
        'Datos que Cue NO recaba ni almacena:\n' +
        '• Nombre completo del paciente, fecha de nacimiento, número de expediente (MRN), ' +
        'CURP, número de seguridad social ni ningún otro dato de identificación directa del paciente.\n' +
        '• Registros clínicos en formato SOAP ni historias clínicas completas.\n' +
        '• Grabaciones de voz o video.',
    },
    {
      id: 'base-legal',
      heading: '4. Base Legal del Tratamiento (LFPDPPP)',
      body:
        'El tratamiento de sus datos personales se sustenta en las siguientes bases ' +
        'establecidas por la LFPDPPP:\n\n' +
        '• Consentimiento (Art. 8 LFPDPPP): el médico presta su consentimiento al ' +
        'aceptar los presentes términos y este aviso de privacidad al activar Cue en ' +
        'su cuenta de Práctikah.\n\n' +
        '• Ejecución de una relación jurídica (Art. 10, fracción II LFPDPPP): el ' +
        'tratamiento es necesario para el cumplimiento de las obligaciones derivadas ' +
        'del acuerdo de servicio entre el médico y Medikah.\n\n' +
        '• Proporcionalidad (Art. 13 LFPDPPP): solo se recaban los datos estrictamente ' +
        'necesarios para las finalidades declaradas. La postura de PHI minimizado es el ' +
        'control técnico que garantiza esta proporcionalidad.\n\n' +
        'Este aviso NO constituye un Business Associate Agreement (BAA) y NO es un ' +
        'instrumento de HIPAA. HIPAA no es aplicable al despliegue en México. ' +
        'Esta es la notificación de privacidad bajo la ley mexicana que el lanzamiento requiere.',
    },
    {
      id: 'residencia',
      heading: '5. Residencia de los Datos',
      body:
        'Los datos personales tratados por Cue se almacenan en la instancia de Supabase ' +
        '(PostgreSQL) propia de Medikah, alojada en una región de nube segura. ' +
        'Medikah no comparte ni transfiere datos de sesión de Cue a proveedores externos ' +
        'de modelo de lenguaje con carácter de almacenamiento permanente. Las llamadas al ' +
        'modelo de inteligencia artificial son transaccionales (en tránsito) y el proveedor ' +
        'del modelo está contractualmente obligado a no retener datos de entrada o salida ' +
        'con fines de entrenamiento.\n\n' +
        'Transferencias internacionales: en la medida en que el proveedor de modelo ' +
        'se encuentre fuera de México, la transferencia se realiza al amparo de cláusulas ' +
        'contractuales equivalentes a las previstas en el Art. 36 LFPDPPP, y con la ' +
        'instrumentación descrita en el contrato de prestación de servicios correspondiente.',
    },
    {
      id: 'retencion',
      heading: '6. Retención y Plazo de Conservación de Datos [PATCH-03]',
      body:
        'NOTA DE BORRADOR: El valor exacto del período de retención (TTL) de las notas ' +
        'de memoria de Cue será determinado y vinculante a partir de la Fase 25 (PATCH-03), ' +
        'sujeto a la revisión del consejo legal. El siguiente es el marco previsto:\n\n' +
        '• Historial de conversación de sesión: conservado ÚNICAMENTE durante la sesión ' +
        'activa; eliminado al cerrar sesión o al vencer el token de autenticación.\n\n' +
        '• Presupuesto diario de tokens: conservado por un período de 90 días, ' +
        'luego eliminado o anonimizado para fines de auditoría de uso.\n\n' +
        '• Notas de memoria a nivel de práctica (Fase 25): [TTL_VALOR_DIAS] días ' +
        'desde la fecha de creación de cada nota, o hasta que el médico las elimine ' +
        'explícitamente mediante sus derechos ARCO, lo que ocurra primero.\n\n' +
        '• Viñetas de diagnóstico anónimas (Fase 24): no son persistidas en asociación ' +
        'con la identidad del médico; se conservan en formato anonimizado por un ' +
        'máximo de [TTL_DIAGNOSTICO_DIAS] días.\n\n' +
        'Al expirar el período de retención, los datos son eliminados de forma segura ' +
        'o anonimizados de manera irreversible. El médico puede solicitar la eliminación ' +
        'anticipada mediante el ejercicio de sus derechos ARCO (ver Sección 7).',
    },
    {
      id: 'arco',
      heading: '7. Derechos ARCO — Acceso, Rectificación, Cancelación y Oposición',
      body:
        'De conformidad con el Capítulo IV de la LFPDPPP, usted como médico titular de ' +
        'los datos tiene derecho a:\n\n' +
        '• ACCESO: Conocer qué datos personales suyos obra en posesión de Medikah ' +
        'en el contexto de Cue, y los fines para los que se tratan.\n\n' +
        '• RECTIFICACIÓN: Solicitar la corrección de sus datos personales cuando ' +
        'sean inexactos, incompletos o desactualizados.\n\n' +
        '• CANCELACIÓN: Solicitar la eliminación de sus datos personales de los ' +
        'sistemas de Cue, cuando no sea necesario su tratamiento para el cumplimiento ' +
        'de las finalidades declaradas, o haya concluido la relación jurídica. La ' +
        'cancelación dará lugar a un período de bloqueo previo a su eliminación, ' +
        'conforme a la LFPDPPP.\n\n' +
        '• OPOSICIÓN: Oponerse al tratamiento de sus datos personales para finalidades ' +
        'secundarias o cuando exista una causa legítima que lo justifique.\n\n' +
        'Cómo ejercer sus derechos ARCO:\n' +
        '1. Envíe su solicitud a: privacy@medikah.health\n' +
        '2. Asunto del mensaje: "Solicitud ARCO — Cue / Práctikah"\n' +
        '3. Incluya: nombre completo, correo registrado en Práctikah, descripción ' +
        'del derecho que desea ejercer, copia de identificación oficial.\n' +
        '4. Tiempo de respuesta: 20 días hábiles a partir de la recepción de la ' +
        'solicitud completa, conforme al Art. 32 LFPDPPP.\n\n' +
        'Revocación del consentimiento: puede revocar su consentimiento al tratamiento ' +
        'de sus datos para finalidades secundarias en cualquier momento, sin efectos ' +
        'retroactivos, enviando su solicitud a privacy@medikah.health.\n\n' +
        'Derecho de queja ante la autoridad: si considera que Medikah ha vulnerado ' +
        'sus derechos en materia de datos personales, puede presentar una queja ante ' +
        'el Instituto Nacional de Transparencia, Acceso a la Información y Protección ' +
        'de Datos Personales (INAI): www.inai.org.mx',
    },
    {
      id: 'cofepris',
      heading: '8. Alcance y Límites de Cue — Apoyo Clínico, No Prescriptor',
      body:
        'Cue es una herramienta de apoyo a la toma de decisiones clínicas (CDSS), ' +
        'diseñada exclusivamente para médicos verificados. En cumplimiento de la ' +
        'NOM-024-SSA3 y el marco de COFEPRIS para software de uso en salud:\n\n' +
        '• Cue NO es un dispositivo médico bajo la NOM-241-SSA1-2025.\n' +
        '• Cue NO diagnostica enfermedades, NO prescribe medicamentos, NO ordena ' +
        'estudios ni establece planes de tratamiento definitivos.\n' +
        '• Toda respuesta de Cue es información de apoyo; la decisión clínica ' +
        'final recae exclusivamente en el médico tratante con licencia.\n' +
        '• El diseño de Cue mantiene un ancla de deferencia clínica activa en ' +
        'cada turno de conversación para evitar la creep de alcance.\n\n' +
        'Si Cue opera fuera de estos límites en alguna interacción, le pedimos ' +
        'reportarlo a: legal@medikah.health',
    },
    {
      id: 'nom024',
      heading: '9. NOM-024-SSA3 — Contexto de Cumplimiento',
      body:
        'La NOM-024-SSA3-2012 (y su versión actualizada) establece los requisitos de ' +
        'interoperabilidad, seguridad y manejo de información en sistemas de salud ' +
        'digitales en México. El presente aviso es el primer artefacto de cumplimiento ' +
        'de Cue bajo esta norma.\n\n' +
        'Medikah llevará a cabo una evaluación formal de cumplimiento de la NOM-024-SSA3 ' +
        'antes de la activación de las funcionalidades de memoria de Cue (Fase 25) y de ' +
        'la superficie de diagnóstico (Fase 24), que son los puntos donde el sistema ' +
        'interactúa con información de naturaleza clínica. La evaluación será realizada ' +
        'con el asesoramiento del revisor de cumplimiento legal/normativo en México ' +
        'designado para el lanzamiento.\n\n' +
        'En la Fase 22 (fundación), Cue no maneja información de pacientes ni ' +
        'constituye un sistema de registro clínico, por lo que el impacto directo ' +
        'sobre la NOM-024-SSA3 es limitado en esta fase.',
    },
    {
      id: 'cambios',
      heading: '10. Cambios a Este Aviso de Privacidad',
      body:
        'Medikah podrá actualizar este aviso de privacidad cuando sea necesario. ' +
        'En caso de cambios materiales que afecten los derechos del titular:\n\n' +
        '• Se notificará al médico mediante un aviso visible en la plataforma ' +
        'Práctikah y/o por correo electrónico a la dirección registrada.\n' +
        '• Se otorgará un período de 15 días naturales antes de que los cambios ' +
        'entren en vigor, durante el cual el médico podrá ejercer su derecho de oposición.\n' +
        '• La versión vigente siempre estará disponible en /cue/aviso-privacidad.\n\n' +
        'El uso continuado de Cue tras el período de notificación implica la ' +
        'aceptación de los cambios.',
    },
    {
      id: 'contacto',
      heading: '11. Contacto y Autoridad Supervisora',
      body:
        'Para cualquier consulta, solicitud ARCO, revocación de consentimiento ' +
        'o reporte relacionado con este aviso:\n\n' +
        'Privacidad y ARCO: privacy@medikah.health\n' +
        'Oficial de Protección de Datos (DPO): dpo@medikah.health\n' +
        'Reportes legales y de cumplimiento: legal@medikah.health\n' +
        'Soporte de la plataforma: support@medikah.health\n\n' +
        'Autoridad supervisora en México:\n' +
        'Instituto Nacional de Transparencia, Acceso a la Información y ' +
        'Protección de Datos Personales (INAI)\n' +
        'www.inai.org.mx',
    },
  ],
  footerNote:
    'Este aviso de privacidad aplica exclusivamente a Cue, el asistente de IA de ' +
    'Medikah para médicos, en el marco de la plataforma Práctikah. No es un ' +
    'Business Associate Agreement (BAA) ni un instrumento de HIPAA — HIPAA no ' +
    'es aplicable al despliegue en México. Para la política de privacidad general ' +
    'de la plataforma Medikah, consulte /privacy.',
};

// ---------------------------------------------------------------------------
// Content — English
// ---------------------------------------------------------------------------

const avisoEn: CueAvisoContent = {
  pageTitle: 'Privacy Notice — Cue for Physicians',
  htmlTitle: 'Cue Privacy Notice — Medikah / Práctikah',
  draftBanner:
    'DRAFT — Pending review by Mexico-qualified legal counsel. ' +
    'This document has not been approved by legal counsel and must not be ' +
    'presented to users as a final instrument until that review is complete and recorded.',
  headline: 'PRIVACY NOTICE',
  responsableBlock:
    'Data Controller (Responsable): Medikah Corporation\n' +
    'Privacy Contact: privacy@medikah.health\n' +
    'Data Protection Officer (DPO): dpo@medikah.health\n' +
    'Registered address: Delaware, USA | Operations: Mexico City, Mexico',
  dateNote:
    'Version: DRAFT | Date: June 2026 | Pending legal approval',
  sections: [
    {
      id: 'identity',
      heading: '1. Identity and Address of the Data Controller',
      body:
        'Medikah Corporation ("Medikah"), a Delaware-incorporated entity with ' +
        'operations in Mexico City, Mexico, is the data controller responsible for ' +
        'processing your personal data in connection with your use of the Cue AI ' +
        'assistant within the Práctikah platform, pursuant to the Ley Federal de ' +
        'Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) ' +
        'and its Regulations.\n\n' +
        'Cue is a clinical decision-support tool directed exclusively at verified ' +
        'physicians. Cue is not a prescriber and is not a medical device. It does not ' +
        'diagnose conditions and does not replace the clinical judgment of the treating physician.',
    },
    {
      id: 'purpose',
      heading: '2. Purpose of Data Processing (Finalidad)',
      body:
        'The data Medikah collects in the Cue context is processed for the following ' +
        'necessary and proportionate purposes:\n\n' +
        '• Providing clinical decision-support assistance to the verified physician ' +
        'during and between patient encounters (support with differentials, clinical ' +
        'references, and practice organization).\n\n' +
        '• Personalizing the assistant through practice-level memory notes ' +
        '(Phase 25, PATCH-03) — derived from physician interactions, written ' +
        'in third-person, with no patient-identifying information (PHI-minimized). ' +
        'These notes are NOT generated in Phase 22.\n\n' +
        '• Operating the anonymous clinical vignette analysis service on the ' +
        'diagnosis surface (Phase 24) — vignettes are anonymous at the source; ' +
        'Cue does not receive or store patient-identifying information.\n\n' +
        '• Platform quality control and management: token monitoring, daily usage ' +
        'budget, emergency kill-switch, and call audit logging.\n\n' +
        'Secondary purposes (optional, require separate consent):\n' +
        '• Improvement of the AI model using anonymized, aggregated interaction data ' +
        '(no identifiable PHI).',
    },
    {
      id: 'data',
      heading: '3. Personal Data Processed and PHI-Minimization Posture',
      body:
        'Medikah processes the following data in the Cue context:\n\n' +
        'Physician identification data (derived from the verified Práctikah profile):\n' +
        '• Full name, email address, authenticated session identifier.\n' +
        '• Medical specialty and availability settings (for assistant personalization).\n\n' +
        'Cue interaction data:\n' +
        '• Conversation turns for the current session (held in session memory only; ' +
        'not persisted in Phase 22).\n' +
        '• Daily token budget (stored without conversation content).\n\n' +
        'Practice-level memory notes [PHASE 25 / PATCH-03 — not active in Phase 22]:\n' +
        '• Third-person, practice-level notes generated by the Cue memory judge after ' +
        'each turn. PHI-MINIMIZATION POSTURE: notes NEVER include patient name, date ' +
        'of birth, medical record number (MRN), or any other patient identifier. ' +
        'Example redaction: "The physician consulted a case with dyspnea presentation ' +
        'in an older adult — no identifiers." Compliance is verified automatically ' +
        'before each note is persisted (PATCH-01).\n\n' +
        'Data Cue does NOT collect or store:\n' +
        '• Full patient name, date of birth, MRN, CURP, social security number, or ' +
        'any other direct patient identifier.\n' +
        '• Clinical records in SOAP format or complete medical histories.\n' +
        '• Voice or video recordings.',
    },
    {
      id: 'legal-basis',
      heading: '4. Legal Basis for Processing (LFPDPPP)',
      body:
        'The processing of your personal data is supported by the following bases ' +
        'established by the LFPDPPP:\n\n' +
        '• Consent (Art. 8 LFPDPPP): the physician provides consent by accepting ' +
        'these terms and this privacy notice when activating Cue in their Práctikah account.\n\n' +
        '• Performance of a legal relationship (Art. 10, section II LFPDPPP): ' +
        'processing is necessary to fulfill the obligations arising from the service ' +
        'agreement between the physician and Medikah.\n\n' +
        '• Proportionality (Art. 13 LFPDPPP): only data strictly necessary for the ' +
        'stated purposes is collected. The PHI-minimization posture is the technical ' +
        'control that ensures this proportionality.\n\n' +
        'This notice is NOT a Business Associate Agreement (BAA) and is NOT a ' +
        'HIPAA instrument. HIPAA does not apply to the Mexico deployment. ' +
        'This is the Mexico-law privacy notice the launch requires.',
    },
    {
      id: 'residency',
      heading: '5. Data Residency',
      body:
        'Personal data processed by Cue is stored in Medikah\'s own Supabase ' +
        '(PostgreSQL) instance, hosted in a secure cloud region. Medikah does not ' +
        'share or transfer Cue session data to external AI model providers for permanent ' +
        'storage. Calls to the AI model are transactional (in transit only), and the ' +
        'model provider is contractually prohibited from retaining input or output data ' +
        'for training purposes.\n\n' +
        'International transfers: to the extent that the model provider is located ' +
        'outside Mexico, transfers are carried out under contractual clauses equivalent ' +
        'to those provided in Art. 36 LFPDPPP, as described in the applicable service agreement.',
    },
    {
      id: 'retention',
      heading: '6. Data Retention Period [PATCH-03]',
      body:
        'DRAFT NOTE: The exact retention period (TTL) for Cue memory notes will be ' +
        'determined and binding from Phase 25 (PATCH-03) onward, subject to legal ' +
        'counsel review. The following is the intended framework:\n\n' +
        '• Session conversation history: retained ONLY during the active session; ' +
        'deleted upon logout or expiration of the authentication token.\n\n' +
        '• Daily token budget: retained for 90 days, then deleted or anonymized ' +
        'for usage audit purposes.\n\n' +
        '• Practice-level memory notes (Phase 25): [TTL_VALUE_DAYS] days from the ' +
        'creation date of each note, or until the physician explicitly deletes them ' +
        'via ARCO rights, whichever occurs first.\n\n' +
        '• Anonymous diagnostic vignettes (Phase 24): not persisted in association ' +
        'with the physician\'s identity; retained in anonymized form for a maximum of ' +
        '[TTL_DIAGNOSTIC_DAYS] days.\n\n' +
        'Upon expiration of the retention period, data is securely deleted or ' +
        'irreversibly anonymized. Physicians may request early deletion by exercising ' +
        'their ARCO rights (see Section 7).',
    },
    {
      id: 'arco',
      heading: '7. ARCO Rights — Access, Rectification, Cancellation, and Opposition',
      body:
        'In accordance with Chapter IV of the LFPDPPP, you as the physician data ' +
        'subject have the right to:\n\n' +
        '• ACCESS: Know what personal data Medikah holds about you in the Cue ' +
        'context, and the purposes for which it is processed.\n\n' +
        '• RECTIFICATION: Request correction of your personal data when it is ' +
        'inaccurate, incomplete, or out of date.\n\n' +
        '• CANCELLATION: Request deletion of your personal data from Cue\'s systems ' +
        'when processing is no longer necessary for the stated purposes, or when the ' +
        'legal relationship has ended. Cancellation triggers a blocking period prior ' +
        'to deletion, as established by the LFPDPPP.\n\n' +
        '• OPPOSITION: Object to the processing of your personal data for secondary ' +
        'purposes, or when a legitimate cause justifies it.\n\n' +
        'How to exercise your ARCO rights:\n' +
        '1. Submit your request to: privacy@medikah.health\n' +
        '2. Subject line: "ARCO Request — Cue / Práctikah"\n' +
        '3. Include: full name, email registered in Práctikah, description of the ' +
        'right you wish to exercise, copy of official ID.\n' +
        '4. Response time: 20 business days from receipt of the complete request, ' +
        'as required by Art. 32 LFPDPPP.\n\n' +
        'Withdrawal of consent: you may withdraw your consent to the processing of ' +
        'your data for secondary purposes at any time, without retroactive effect, ' +
        'by sending your request to privacy@medikah.health.\n\n' +
        'Right to file a complaint with the supervisory authority: if you believe ' +
        'Medikah has violated your data protection rights, you may file a complaint with ' +
        'the Instituto Nacional de Transparencia, Acceso a la Información y Protección ' +
        'de Datos Personales (INAI): www.inai.org.mx',
    },
    {
      id: 'cofepris',
      heading: '8. Cue\'s Scope and Limits — Clinical Support, Not a Prescriber',
      body:
        'Cue is a clinical decision support system (CDSS), designed exclusively for ' +
        'verified physicians. In compliance with NOM-024-SSA3 and the COFEPRIS framework ' +
        'for health software:\n\n' +
        '• Cue is NOT a medical device under NOM-241-SSA1-2025.\n' +
        '• Cue does NOT diagnose diseases, does NOT prescribe medications, does NOT ' +
        'order studies, and does NOT establish definitive treatment plans.\n' +
        '• Every Cue response is supporting information; the final clinical decision ' +
        'rests exclusively with the licensed treating physician.\n' +
        '• Cue\'s design maintains an active clinical-deference anchor in every ' +
        'conversational turn to prevent scope creep.\n\n' +
        'If Cue operates outside these boundaries in any interaction, please report it ' +
        'to: legal@medikah.health',
    },
    {
      id: 'nom024',
      heading: '9. NOM-024-SSA3 — Compliance Context',
      body:
        'NOM-024-SSA3-2012 (and its updated version) establishes interoperability, ' +
        'security, and data-handling requirements for digital health information systems ' +
        'in Mexico. This notice is the first Cue compliance artifact under this standard.\n\n' +
        'Medikah will conduct a formal NOM-024-SSA3 compliance assessment prior to ' +
        'activating Cue\'s memory functionality (Phase 25) and the diagnosis surface ' +
        '(Phase 24), which are the points at which the system interacts with clinical ' +
        'information. The assessment will be conducted with the assistance of the ' +
        'Mexico-qualified legal/regulatory compliance reviewer designated for the launch.\n\n' +
        'In Phase 22 (foundation), Cue does not handle patient information and does not ' +
        'constitute a clinical record system, so the direct impact on NOM-024-SSA3 is ' +
        'limited in this phase.',
    },
    {
      id: 'changes',
      heading: '10. Changes to This Privacy Notice',
      body:
        'Medikah may update this privacy notice as necessary. In the event of material ' +
        'changes affecting data subject rights:\n\n' +
        '• The physician will be notified via a visible notice in the Práctikah platform ' +
        'and/or by email to the registered address.\n' +
        '• A 15-calendar-day period will be provided before changes take effect, during ' +
        'which the physician may exercise their right to oppose.\n' +
        '• The current version will always be available at /cue/aviso-privacidad.\n\n' +
        'Continued use of Cue after the notification period implies acceptance of the changes.',
    },
    {
      id: 'contact',
      heading: '11. Contact and Supervisory Authority',
      body:
        'For any query, ARCO request, consent withdrawal, or report related to this notice:\n\n' +
        'Privacy and ARCO: privacy@medikah.health\n' +
        'Data Protection Officer (DPO): dpo@medikah.health\n' +
        'Legal and compliance reports: legal@medikah.health\n' +
        'Platform support: support@medikah.health\n\n' +
        'Supervisory authority in Mexico:\n' +
        'Instituto Nacional de Transparencia, Acceso a la Información y ' +
        'Protección de Datos Personales (INAI)\n' +
        'www.inai.org.mx',
    },
  ],
  footerNote:
    'This privacy notice applies exclusively to Cue, Medikah\'s AI assistant for ' +
    'physicians, within the Práctikah platform. It is NOT a Business Associate ' +
    'Agreement (BAA) and is NOT a HIPAA instrument — HIPAA does not apply to the ' +
    'Mexico deployment. For the general Medikah platform privacy policy, see /privacy.',
};

// ---------------------------------------------------------------------------
// Public export — keyed by locale
// ---------------------------------------------------------------------------

/**
 * Returns the aviso de privacidad content for the given locale.
 * Falls back to Spanish (the primary locale for this physician-facing surface).
 */
export const cueAvisoContent: Record<SupportedLang, CueAvisoContent> = {
  es: avisoEs,
  en: avisoEn,
};

// CueAvisoContent and CueAvisoSection are already exported inline above.
