/**
 * LLM Polish Pass for Physician Bios
 *
 * Optional layer on top of the deterministic template engine (bioTemplates.ts).
 * Smooths grammatical rough edges and improves sentence transitions — without
 * changing meaning or adding information.
 *
 * Provider: OpenAI (GPT-4o-mini) — reads OPENAI_API_KEY.
 * Swap target: Anthropic Claude Haiku — uncomment the Claude block and swap
 * the env var check to ANTHROPIC_API_KEY when ready to migrate.
 *
 * Gracefully degrades: if the API key is not set or the call fails, returns
 * the template output unchanged with wasPolished = false.
 */

import OpenAI from 'openai';
// Future: import Anthropic from '@anthropic-ai/sdk';

export interface PolishInput {
  templateBioEn: string;
  templateBioEs: string;
  templateTaglineEn: string;
  templateTaglineEs: string;
  physicianName: string;
  primarySpecialty?: string;
}

export interface PolishOutput {
  polishedBioEn: string;
  polishedBioEs: string;
  polishedTaglineEn: string;
  polishedTaglineEs: string;
  wasPolished: boolean;
}

const SYSTEM_PROMPT = `You are editing a physician's profile bio for Medikah, a healthcare platform.

You are given a template-assembled bio and tagline in English and Spanish. Your job is to lightly polish the prose for natural flow. Do NOT rewrite — only smooth grammatical rough edges and improve sentence transitions.

Rules:
- Preserve the physician's exact meaning. Do not add claims.
- Warm but authoritative tone.
- Maximum 3 paragraphs per language, maximum 400 words per language.
- Separate paragraphs with a blank line (two newlines).
- No exclamation marks. No marketing language.
- Forbidden phrases: "passionate about", "dedicated to excellence", "committed to providing", "world-class", "cutting-edge".
- Clinical terms are fine. Jargon is not.
- Do not invent biographical details.
- Do not add information not present in the input.
- If the input already reads naturally, return it unchanged.
- Return valid JSON only — no markdown fences, no explanation.`;

function buildUserPrompt(input: PolishInput): string {
  const specialtyLine = input.primarySpecialty
    ? `, ${input.primarySpecialty}`
    : '';

  return `Polish the following physician profile content. Return JSON with exactly these keys: bioEn, bioEs, taglineEn, taglineEs.

Physician: Dr. ${input.physicianName}${specialtyLine}

--- English Bio ---
${input.templateBioEn}

--- Spanish Bio ---
${input.templateBioEs}

--- English Tagline ---
${input.templateTaglineEn}

--- Spanish Tagline ---
${input.templateTaglineEs}`;
}

interface ParsedPolishResponse {
  bioEn: string;
  bioEs: string;
  taglineEn: string;
  taglineEs: string;
}

function parsePolishResponse(text: string): ParsedPolishResponse | null {
  // Strip markdown code fences if the model wrapped its response
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
      return parsed as ParsedPolishResponse;
    }

    return null;
  } catch {
    return null;
  }
}

function toUnpolishedOutput(input: PolishInput): PolishOutput {
  return {
    polishedBioEn: input.templateBioEn,
    polishedBioEs: input.templateBioEs,
    polishedTaglineEn: input.templateTaglineEn,
    polishedTaglineEs: input.templateTaglineEs,
    wasPolished: false,
  };
}

// ─── OpenAI provider (current) ──────────────────────────────────────────────

async function polishViaOpenAI(input: PolishInput, apiKey: string): Promise<PolishOutput> {
  const client = new OpenAI({ apiKey });
  const userPrompt = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1500,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  const parsed = parsePolishResponse(text);

  if (!parsed) {
    console.warn('Bio polisher: could not parse OpenAI response, using template output');
    return toUnpolishedOutput(input);
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
// 1. npm install @anthropic-ai/sdk (already installed)
// 2. Set ANTHROPIC_API_KEY in env
// 3. Uncomment polishViaClaude below
// 4. In polishBio(), swap the provider check from OPENAI_API_KEY to ANTHROPIC_API_KEY
//
// async function polishViaClaude(input: PolishInput, apiKey: string): Promise<PolishOutput> {
//   const Anthropic = (await import('@anthropic-ai/sdk')).default;
//   const client = new Anthropic({ apiKey });
//   const userPrompt = buildUserPrompt(input);
//
//   const response = await client.messages.create({
//     model: 'claude-haiku-4-5-20251001',
//     max_tokens: 1500,
//     temperature: 0.3,
//     system: SYSTEM_PROMPT,
//     messages: [{ role: 'user', content: userPrompt }],
//   });
//
//   const block = response.content[0];
//   const text = block.type === 'text' ? block.text : '';
//   const parsed = parsePolishResponse(text);
//
//   if (!parsed) {
//     console.warn('Bio polisher: could not parse Claude response, using template output');
//     return toUnpolishedOutput(input);
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

export async function polishBio(input: PolishInput): Promise<PolishOutput> {
  // Current: OpenAI  |  Future: swap to ANTHROPIC_API_KEY + polishViaClaude
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return toUnpolishedOutput(input);
  }

  try {
    return await polishViaOpenAI(input, apiKey);
    // Future: return await polishViaClaude(input, apiKey);
  } catch (err) {
    console.error('Bio polish failed, using template output:', err);
    return toUnpolishedOutput(input);
  }
}
