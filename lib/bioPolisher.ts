/**
 * LLM Bio Crafter for Physician Profiles
 *
 * Takes raw physician credentials + narrative questionnaire answers and crafts
 * compelling, personalized, bilingual bios and taglines. The LLM is the primary
 * creative engine — the deterministic template (bioTemplates.ts) serves as
 * fallback when no API key is set or the LLM call fails.
 *
 * Provider: OpenAI (GPT-4o) — reads OPENAI_API_KEY.
 * Swap target: Anthropic Claude — uncomment the Claude block and swap
 * the env var check to ANTHROPIC_API_KEY when ready to migrate.
 *
 * Gracefully degrades: if the API key is not set or the call fails, returns
 * the template output unchanged with wasPolished = false.
 */

import OpenAI from 'openai';
// Future: import Anthropic from '@anthropic-ai/sdk';

export interface CraftInput {
  // Physician credentials
  physicianName: string;
  primarySpecialty?: string;
  subSpecialties?: string[];
  medicalSchool?: string;
  medicalSchoolCountry?: string;
  graduationYear?: number;
  boardCertifications?: { board: string; certification: string; year?: number }[];
  residency?: { institution: string; specialty: string }[];
  fellowships?: { institution: string; specialty: string }[];
  currentInstitutions?: string[];
  languages?: string[];
  // Narrative questionnaire answers
  communicationStyle?: string;
  firstConsultExpectation?: string;
  specialtyMotivation?: string;
  careValues?: string;
  originSentence?: string;
  personalStatement?: string;
  personalInterests?: string;
  customTagline?: string;
  // Template fallback (used if LLM fails)
  templateBioEn: string;
  templateBioEs: string;
  templateTaglineEn: string;
  templateTaglineEs: string;
}

// Keep the old interface name exported for backwards compatibility with bioGenerator
export type PolishInput = CraftInput;

export interface PolishOutput {
  polishedBioEn: string;
  polishedBioEs: string;
  polishedTaglineEn: string;
  polishedTaglineEs: string;
  wasPolished: boolean;
}

const SYSTEM_PROMPT = `You are a senior healthcare writer crafting a physician's profile for Medikah, a HIPAA-compliant platform that coordinates care across the Americas.

You receive the physician's credentials and their personal questionnaire answers. Your job: write a bio that makes a patient think "this is MY doctor." Every physician who joins Medikah has a story — find it in the data and tell it well.

## Bio structure — 3 paragraphs, each with a distinct emotional job

PARAGRAPH 1 — AUTHORITY (who they are, why they're qualified)
Open with a confident, specific sentence about who this physician is. Weave in board certifications, training, fellowship, and current institution naturally — not as a list, but as a narrative of expertise. End with a sentence that connects their communication style to how patients experience their care.

PARAGRAPH 2 — MOTIVATION (why they chose this path)
This is the heart. Use the physician's own words from the questionnaire (specialtyMotivation, careValues, originSentence) to reveal what drives them. If they provided an origin sentence, integrate it as a pull quote or woven naturally into prose. This paragraph should feel personal and specific — not something that could describe any doctor.

PARAGRAPH 3 — THE HUMAN (what patients can expect)
Ground the bio in the practical. What does a first visit look like? What should patients know? If there are personal interests, use them to show the full person. Close with the Medikah network membership as a quiet signal of credibility, not a sales pitch.

## Tagline
Craft a memorable 6-12 word tagline that captures this physician's essence. It should feel like a headline, not a job title. If the physician provided a custom tagline, use it verbatim.

## Rules
- Write in third person ("Dr. López" / "she" / "he" / "they").
- Warm, authoritative tone. The reader should feel trust and warmth simultaneously.
- Maximum 3 paragraphs per language, maximum 400 words per language.
- Separate paragraphs with a blank line (two newlines).
- NO exclamation marks. NO marketing buzzwords.
- FORBIDDEN phrases: "passionate about", "dedicated to excellence", "committed to providing", "world-class", "cutting-edge", "journey", "holistic approach".
- Every claim must come from the input data. Do NOT invent credentials, institutions, or biographical details.
- If a field is missing, skip it gracefully — do not mention its absence.
- Both English and Spanish bios must be original compositions, not translations. Each should read naturally in its language.
- The Spanish bio should use the same warm professional register, but follow Spanish medical conventions (e.g., "Dr./Dra.", institution references).
- Return valid JSON only — no markdown fences, no commentary, no explanation.`;

function buildCredentialsBlock(input: CraftInput): string {
  const lines: string[] = [];

  lines.push(`Name: Dr. ${input.physicianName}`);

  if (input.primarySpecialty) {
    lines.push(`Primary specialty: ${input.primarySpecialty}`);
  }

  if (input.subSpecialties && input.subSpecialties.length > 0) {
    lines.push(`Sub-specialties: ${input.subSpecialties.join(', ')}`);
  }

  if (input.boardCertifications && input.boardCertifications.length > 0) {
    const certs = input.boardCertifications
      .map((c) => `${c.certification} (${c.board}${c.year ? `, ${c.year}` : ''})`)
      .join('; ');
    lines.push(`Board certifications: ${certs}`);
  }

  if (input.medicalSchool) {
    let schoolLine = `Medical school: ${input.medicalSchool}`;
    if (input.medicalSchoolCountry) schoolLine += `, ${input.medicalSchoolCountry}`;
    if (input.graduationYear) schoolLine += ` (${input.graduationYear})`;
    lines.push(schoolLine);
  }

  if (input.residency && input.residency.length > 0) {
    const res = input.residency
      .map((r) => `${r.specialty} at ${r.institution}`)
      .join('; ');
    lines.push(`Residency: ${res}`);
  }

  if (input.fellowships && input.fellowships.length > 0) {
    const fell = input.fellowships
      .map((f) => `${f.specialty} at ${f.institution}`)
      .join('; ');
    lines.push(`Fellowship: ${fell}`);
  }

  if (input.currentInstitutions && input.currentInstitutions.length > 0) {
    lines.push(`Current institution(s): ${input.currentInstitutions.join(', ')}`);
  }

  if (input.languages && input.languages.length > 0) {
    lines.push(`Languages: ${input.languages.join(', ')}`);
  }

  return lines.join('\n');
}

function buildNarrativeBlock(input: CraftInput): string {
  const lines: string[] = [];

  if (input.communicationStyle) {
    lines.push(`Communication style: ${input.communicationStyle}`);
  }

  if (input.specialtyMotivation) {
    lines.push(`Why they chose this specialty: ${input.specialtyMotivation}`);
  }

  if (input.careValues) {
    lines.push(`What matters most in patient care: ${input.careValues}`);
  }

  if (input.originSentence) {
    lines.push(`In their own words: "${input.originSentence}"`);
  }

  if (input.firstConsultExpectation) {
    lines.push(`What patients can expect on first visit: ${input.firstConsultExpectation}`);
  }

  if (input.personalStatement) {
    lines.push(`What they want every patient to know: ${input.personalStatement}`);
  }

  if (input.personalInterests) {
    lines.push(`Outside the clinic: ${input.personalInterests}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No narrative questionnaire data provided.';
}

function buildUserPrompt(input: CraftInput): string {
  const credentials = buildCredentialsBlock(input);
  const narrative = buildNarrativeBlock(input);
  const taglineNote = input.customTagline
    ? `\nCustom tagline (use verbatim): "${input.customTagline}"`
    : '';

  return `Craft a compelling physician profile. Return JSON with exactly these keys: bioEn, bioEs, taglineEn, taglineEs.

=== CREDENTIALS ===
${credentials}

=== QUESTIONNAIRE ANSWERS ===
${narrative}
${taglineNote}

Remember: both English and Spanish should be original compositions. The tagline should be memorable, not generic.`;
}

interface ParsedResponse {
  bioEn: string;
  bioEs: string;
  taglineEn: string;
  taglineEs: string;
}

function parseResponse(text: string): ParsedResponse | null {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.bioEn === 'string' && parsed.bioEn.length > 0 &&
      typeof parsed.bioEs === 'string' && parsed.bioEs.length > 0 &&
      typeof parsed.taglineEn === 'string' && parsed.taglineEn.length > 0 &&
      typeof parsed.taglineEs === 'string' && parsed.taglineEs.length > 0
    ) {
      return parsed as ParsedResponse;
    }

    return null;
  } catch {
    return null;
  }
}

function toFallbackOutput(input: CraftInput): PolishOutput {
  return {
    polishedBioEn: input.templateBioEn,
    polishedBioEs: input.templateBioEs,
    polishedTaglineEn: input.templateTaglineEn,
    polishedTaglineEs: input.templateTaglineEs,
    wasPolished: false,
  };
}

// ─── OpenAI provider (current) ──────────────────────────────────────────────

async function craftViaOpenAI(input: CraftInput, apiKey: string): Promise<PolishOutput> {
  const client = new OpenAI({ apiKey });
  const userPrompt = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  const parsed = parseResponse(text);

  if (!parsed) {
    console.warn('Bio crafter: could not parse OpenAI response, using template output');
    return toFallbackOutput(input);
  }

  return {
    polishedBioEn: parsed.bioEn,
    polishedBioEs: parsed.bioEs,
    polishedTaglineEn: parsed.taglineEn,
    polishedTaglineEs: parsed.taglineEs,
    wasPolished: true,
  };
}

// ─── Anthropic provider (future swap) ───────────────────────────────────────
//
// To switch to Claude:
// 1. npm install @anthropic-ai/sdk
// 2. Set ANTHROPIC_API_KEY in env
// 3. Uncomment craftViaClaude below
// 4. In polishBio(), swap the provider check from OPENAI_API_KEY to ANTHROPIC_API_KEY
//
// async function craftViaClaude(input: CraftInput, apiKey: string): Promise<PolishOutput> {
//   const Anthropic = (await import('@anthropic-ai/sdk')).default;
//   const client = new Anthropic({ apiKey });
//   const userPrompt = buildUserPrompt(input);
//
//   const response = await client.messages.create({
//     model: 'claude-haiku-4-5-20251001',
//     max_tokens: 2000,
//     temperature: 0.6,
//     system: SYSTEM_PROMPT,
//     messages: [{ role: 'user', content: userPrompt }],
//   });
//
//   const block = response.content[0];
//   const text = block.type === 'text' ? block.text : '';
//   const parsed = parseResponse(text);
//
//   if (!parsed) {
//     console.warn('Bio crafter: could not parse Claude response, using template output');
//     return toFallbackOutput(input);
//   }
//
//   return {
//     polishedBioEn: parsed.bioEn,
//     polishedBioEs: parsed.bioEs,
//     polishedTaglineEn: parsed.taglineEn,
//     polishedTaglineEs: parsed.taglineEs,
//     wasPolished: true,
//   };
// }

// ─── Public entry point ─────────────────────────────────────────────────────

export async function polishBio(input: CraftInput): Promise<PolishOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return toFallbackOutput(input);
  }

  try {
    return await craftViaOpenAI(input, apiKey);
    // Future: return await craftViaClaude(input, apiKey);
  } catch (err) {
    console.error('Bio craft failed, using template output:', err);
    return toFallbackOutput(input);
  }
}
