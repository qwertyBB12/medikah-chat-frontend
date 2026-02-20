export interface BoardCertification {
  board: string;
  certification: string;
  year?: number;
}

export interface TrainingEntry {
  institution: string;
  specialty: string;
}

export type CommunicationStyle = 'thorough' | 'collaborative' | 'direct' | 'reassuring';
type SupportedLanguage = 'en' | 'es';

export interface BioInput {
  // From physicians table
  fullName: string;
  primarySpecialty?: string;
  subSpecialties?: string[];
  medicalSchool?: string;
  medicalSchoolCountry?: string;
  graduationYear?: number;
  boardCertifications?: BoardCertification[];
  residency?: TrainingEntry[];
  fellowships?: TrainingEntry[];
  currentInstitutions?: string[];
  languages?: string[];
  // From physician_website table (narrative questionnaire)
  communicationStyle?: CommunicationStyle;
  firstConsultExpectation?: string;
  specialtyMotivation?: string;
  careValues?: string;
  originSentence?: string;
  personalStatement?: string;
  personalInterests?: string;
  customTagline?: string;
}

export interface BioOutput {
  bioEn: string;
  bioEs: string;
  taglineEn: string;
  taglineEs: string;
}

const TONE_MODIFIERS = {
  thorough: {
    en: { adj: 'meticulous', approach: 'thorough, evidence-based', style: 'detailed explanations' },
    es: { adj: 'meticuloso', approach: 'exhaustivo, basado en evidencia', style: 'explicaciones detalladas' },
  },
  collaborative: {
    en: { adj: 'collaborative', approach: 'patient-partnered', style: 'shared decision-making' },
    es: { adj: 'colaborativo', approach: 'centrado en el paciente', style: 'toma de decisiones compartida' },
  },
  direct: {
    en: { adj: 'straightforward', approach: 'clear, direct', style: 'straightforward answers' },
    es: { adj: 'directo', approach: 'claro, directo', style: 'respuestas directas' },
  },
  reassuring: {
    en: { adj: 'compassionate', approach: 'warm, reassuring', style: 'empathetic communication' },
    es: { adj: 'compasivo', approach: 'calido, tranquilizador', style: 'comunicacion empatica' },
  },
} as const;

function hasText(value?: string | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function cleanClause(value: string): string {
  return cleanText(value).replace(/[.?!]+$/, '');
}

function toSentence(value: string): string {
  const text = cleanText(value);
  if (!text) return '';
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function firstNonEmpty(values?: string[]): string | undefined {
  if (!values) return undefined;
  return values.map((v) => (hasText(v) ? cleanText(v) : '')).find(Boolean);
}

function hasBoardCertification(input: BioInput): boolean {
  return Boolean(input.boardCertifications && input.boardCertifications.length > 0);
}

function getGenericBio(input: BioInput, lang: SupportedLanguage): string {
  const fullName = cleanText(input.fullName);
  const specialty = hasText(input.primarySpecialty) ? cleanText(input.primarySpecialty) : '';
  const subSpecialties = (input.subSpecialties || []).filter(hasText).map(cleanText);
  const focus = subSpecialties.length > 0 ? subSpecialties.join(', ') : '';

  if (lang === 'es') {
    if (specialty) {
      return `${fullName} es especialista en ${specialty}${focus ? `, con enfoque en ${focus}` : ''}. Como miembro de la Red de Medicos de Medikah, ofrece atencion medica coordinada a pacientes en las Americas.`;
    }
    return `${fullName} es miembro verificado de la Red de Medicos de Medikah, ofreciendo atencion medica coordinada a pacientes en las Americas.`;
  }

  if (specialty) {
    return `${fullName} specializes in ${specialty}${focus ? `, with a focus on ${focus}` : ''}. As a member of the Medikah Physician Network, they provide coordinated healthcare to patients across the Americas.`;
  }
  return `${fullName} is a verified member of the Medikah Physician Network, providing coordinated healthcare to patients across the Americas.`;
}

export function getLastName(fullName: string): string {
  const parts = cleanText(fullName).split(' ').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : cleanText(fullName);
}

function getToneCloser(style: CommunicationStyle, lang: SupportedLanguage): string {
  if (lang === 'es') {
    if (style === 'thorough') return 'Conocido por una atencion meticulosa y basada en evidencia.';
    if (style === 'collaborative') return 'Comprometido con decisiones de cuidado compartidas con cada paciente.';
    if (style === 'direct') return 'Valorado por una comunicacion clara y directa.';
    return 'Reconocido por una atencion compasiva y centrada en el paciente.';
  }

  if (style === 'thorough') return 'Known for meticulous, evidence-based care.';
  if (style === 'collaborative') return 'Committed to partnering with patients in their care decisions.';
  if (style === 'direct') return 'Valued for clear, straightforward communication.';
  return 'Recognized for compassionate, patient-centered care.';
}

function getTaglineStyleModifier(style: CommunicationStyle, lang: SupportedLanguage): string {
  if (lang === 'es') {
    if (style === 'thorough') return 'Atencion exhaustiva y basada en evidencia';
    if (style === 'collaborative') return 'Atencion en colaboracion con el paciente';
    if (style === 'direct') return 'Comunicacion clara y directa';
    return 'Atencion calida y tranquilizadora';
  }

  if (style === 'thorough') return 'Thorough, evidence-based care';
  if (style === 'collaborative') return 'Patient-partnered care';
  if (style === 'direct') return 'Clear, direct communication';
  return 'Warm, reassuring care';
}

function getFellowship(input: BioInput): TrainingEntry | undefined {
  return (input.fellowships || []).find((f) => hasText(f.specialty) || hasText(f.institution));
}

function hasNarrativeData(input: BioInput): boolean {
  return Boolean(
    input.communicationStyle ||
    hasText(input.firstConsultExpectation) ||
    hasText(input.specialtyMotivation) ||
    hasText(input.careValues) ||
    hasText(input.originSentence) ||
    hasText(input.personalStatement) ||
    hasText(input.personalInterests)
  );
}

function buildAuthorityParagraph(input: BioInput, lang: SupportedLanguage): string {
  const fullName = cleanText(input.fullName);
  const specialty = hasText(input.primarySpecialty) ? cleanText(input.primarySpecialty) : '';
  const institution = firstNonEmpty(input.currentInstitutions);
  const hasBoard = hasBoardCertification(input);
  const fellowship = getFellowship(input);
  const style = input.communicationStyle;
  const hasCredentials = Boolean(
    specialty ||
    institution ||
    hasBoard ||
    hasText(input.medicalSchool) ||
    fellowship ||
    style
  );

  if (!hasCredentials) {
    return '';
  }

  const sentences: string[] = [];

  if (lang === 'es') {
    if (specialty) {
      const specialtyPrefix = hasBoard ? 'un especialista certificado por la junta en ' : 'especialista en ';
      sentences.push(toSentence(`El Dr. ${fullName} es ${specialtyPrefix}${specialty}${institution ? ` en ${institution}` : ''}`));
    } else if (institution) {
      sentences.push(toSentence(`El Dr. ${fullName} ejerce en ${institution}`));
    } else {
      sentences.push(toSentence(`El Dr. ${fullName} es medico`));
    }

    if (hasText(input.medicalSchool)) {
      sentences.push(
        toSentence(
          `Se graduo de ${cleanText(input.medicalSchool)}${hasText(input.medicalSchoolCountry) ? ` en ${cleanText(input.medicalSchoolCountry)}` : ''}${input.graduationYear ? ` (${input.graduationYear})` : ''}`
        )
      );
    }

    if (fellowship) {
      if (hasText(fellowship.specialty) && hasText(fellowship.institution)) {
        sentences.push(toSentence(`Completo una subespecialidad en ${cleanText(fellowship.specialty)} en ${cleanText(fellowship.institution)}`));
      } else if (hasText(fellowship.specialty)) {
        sentences.push(toSentence(`Completo una subespecialidad en ${cleanText(fellowship.specialty)}`));
      } else if (hasText(fellowship.institution)) {
        sentences.push(toSentence(`Completo una subespecialidad en ${cleanText(fellowship.institution)}`));
      }
    }
  } else {
    if (specialty) {
      sentences.push(toSentence(`Dr. ${fullName} is a ${hasBoard ? 'board-certified ' : ''}${specialty}${institution ? ` at ${institution}` : ''}`));
    } else if (institution) {
      sentences.push(toSentence(`Dr. ${fullName} practices at ${institution}`));
    } else {
      sentences.push(toSentence(`Dr. ${fullName} is a physician`));
    }

    if (hasText(input.medicalSchool)) {
      sentences.push(
        toSentence(
          `A graduate of ${cleanText(input.medicalSchool)}${hasText(input.medicalSchoolCountry) ? ` in ${cleanText(input.medicalSchoolCountry)}` : ''}${input.graduationYear ? ` (${input.graduationYear})` : ''}`
        )
      );
    }

    if (fellowship) {
      if (hasText(fellowship.specialty) && hasText(fellowship.institution)) {
        sentences.push(toSentence(`Completed a fellowship in ${cleanText(fellowship.specialty)} at ${cleanText(fellowship.institution)}`));
      } else if (hasText(fellowship.specialty)) {
        sentences.push(toSentence(`Completed a fellowship in ${cleanText(fellowship.specialty)}`));
      } else if (hasText(fellowship.institution)) {
        sentences.push(toSentence(`Completed a fellowship at ${cleanText(fellowship.institution)}`));
      }
    }
  }

  if (style) {
    sentences.push(getToneCloser(style, lang));
  }

  return sentences.filter(Boolean).join(' ');
}

function buildMotivationParagraph(input: BioInput, lang: SupportedLanguage): string | null {
  const hasMotivation = hasText(input.specialtyMotivation) || hasText(input.careValues) || hasText(input.originSentence);
  if (!hasMotivation) {
    return null;
  }

  const lastName = getLastName(input.fullName);
  const specialty = hasText(input.primarySpecialty) ? cleanText(input.primarySpecialty) : lang === 'es' ? 'su especialidad' : 'this field';
  const sentences: string[] = [];

  if (hasText(input.specialtyMotivation)) {
    const clause = cleanClause(input.specialtyMotivation);
    if (lang === 'es') {
      sentences.push(toSentence(`El Dr. ${lastName} se sintio atraido por ${specialty} ${clause}`));
    } else {
      sentences.push(toSentence(`Dr. ${lastName} was drawn to ${specialty} ${clause}`));
    }
  }

  if (hasText(input.careValues)) {
    const clause = cleanClause(input.careValues);
    if (lang === 'es') {
      sentences.push(toSentence(`Lo que mas valora el Dr. ${lastName} es ${clause}`));
    } else {
      sentences.push(toSentence(`What matters most to Dr. ${lastName} is ${clause}`));
    }
  }

  if (hasText(input.originSentence)) {
    const clause = cleanClause(input.originSentence).replace(/^["']|["']$/g, '');
    if (lang === 'es') {
      sentences.push(toSentence(`"${clause}" - en palabras del Dr. ${lastName}`));
    } else {
      sentences.push(toSentence(`"${clause}" - in Dr. ${lastName}'s own words`));
    }
  }

  return sentences.filter(Boolean).join(' ') || null;
}

function buildHumanParagraph(input: BioInput, lang: SupportedLanguage): string | null {
  const hasHuman = hasText(input.firstConsultExpectation) || hasText(input.personalStatement) || hasText(input.personalInterests);
  if (!hasHuman) {
    return null;
  }

  const lastName = getLastName(input.fullName);
  const sentences: string[] = [];

  if (hasText(input.firstConsultExpectation)) {
    const clause = cleanClause(input.firstConsultExpectation);
    if (lang === 'es') {
      sentences.push(toSentence(`Los pacientes que acuden por primera vez pueden esperar ${clause}`));
    } else {
      sentences.push(toSentence(`Patients visiting for the first time can expect ${clause}`));
    }
  }

  if (hasText(input.personalStatement)) {
    const clause = cleanClause(input.personalStatement);
    if (lang === 'es') {
      sentences.push(toSentence(`El Dr. ${lastName} quiere que cada paciente sepa ${clause}`));
    } else {
      sentences.push(toSentence(`Dr. ${lastName} wants every patient to know ${clause}`));
    }
  }

  if (hasText(input.personalInterests)) {
    const clause = cleanClause(input.personalInterests);
    if (lang === 'es') {
      sentences.push(toSentence(`Fuera de la consulta, ${clause}`));
    } else {
      sentences.push(toSentence(`Outside the clinic, ${clause}`));
    }
  }

  if (lang === 'es') {
    sentences.push(`El Dr. ${lastName} es miembro verificado de la Red de Medicos de Medikah.`);
  } else {
    sentences.push(`Dr. ${lastName} is a verified member of the Medikah Physician Network.`);
  }

  return sentences.filter(Boolean).join(' ') || null;
}

function buildTagline(input: BioInput, lang: SupportedLanguage): string {
  if (hasText(input.customTagline)) {
    return cleanText(input.customTagline);
  }

  const specialty = hasText(input.primarySpecialty) ? cleanText(input.primarySpecialty) : '';
  const focus = firstNonEmpty(input.subSpecialties);
  const institution = firstNonEmpty(input.currentInstitutions);
  const hasBoard = hasBoardCertification(input);
  const style = input.communicationStyle;

  let left: string;
  if (lang === 'es') {
    if (specialty) {
      left = hasBoard ? `${specialty} con certificacion de junta` : `Especialista en ${specialty}`;
    } else {
      left = hasBoard ? 'Medico con certificacion de junta' : 'Medico';
    }

    if (focus) {
      left += `, con enfoque en ${focus}`;
    }
  } else {
    if (specialty) {
      left = hasBoard ? `Board-Certified ${specialty}` : specialty;
    } else {
      left = hasBoard ? 'Board-Certified Physician' : 'Physician';
    }

    if (focus) {
      left += `, focused on ${focus}`;
    }
  }

  let right: string;
  if (institution) {
    right = institution;
  } else if (style) {
    right = getTaglineStyleModifier(style, lang);
  } else if (lang === 'es') {
    right = 'Red de Medicos de Medikah';
  } else {
    right = 'Medikah Physician Network';
  }

  return `${left} · ${capitalizeFirst(right)}`;
}

function buildBio(input: BioInput, lang: SupportedLanguage): string {
  const paragraphs = [
    buildAuthorityParagraph(input, lang),
    buildMotivationParagraph(input, lang),
    buildHumanParagraph(input, lang),
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  return paragraphs.join('\n\n');
}

export function generateBioAndTagline(input: BioInput): BioOutput {
  const normalizedInput: BioInput = {
    ...input,
    fullName: cleanText(input.fullName),
  };

  const taglineEn = buildTagline(normalizedInput, 'en');
  const taglineEs = buildTagline(normalizedInput, 'es');

  // If there are no narrative responses yet, preserve the existing generic one-liner behavior.
  if (!hasNarrativeData(normalizedInput)) {
    return {
      bioEn: getGenericBio(normalizedInput, 'en'),
      bioEs: getGenericBio(normalizedInput, 'es'),
      taglineEn,
      taglineEs,
    };
  }

  const generatedBioEn = buildBio(normalizedInput, 'en');
  const generatedBioEs = buildBio(normalizedInput, 'es');

  return {
    bioEn: generatedBioEn || getGenericBio(normalizedInput, 'en'),
    bioEs: generatedBioEs || getGenericBio(normalizedInput, 'es'),
    taglineEn,
    taglineEs,
  };
}

export { TONE_MODIFIERS };
