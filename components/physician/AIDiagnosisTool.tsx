/**
 * AIDiagnosisTool Component
 *
 * Clinical decision support tool for physicians.
 * Generates ranked differential diagnoses from symptom descriptions.
 * Session-only history (not persisted).
 */

import { useState } from 'react';
import { SupportedLang } from '../../lib/i18n';

interface DifferentialItem {
  condition: string;
  rationale: string;
  confidence: string;
  distinguishing_factors: string;
}

interface DiagnosisResult {
  differentials: DifferentialItem[];
  red_flags: string[];
  disclaimer: string;
  raw_text: string;
}

interface HistoryEntry {
  symptoms: string;
  age_range?: string;
  sex?: string;
  result: DiagnosisResult;
  timestamp: Date;
}

interface AIDiagnosisToolProps {
  lang: SupportedLang;
  accessToken?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const content = {
  en: {
    title: 'AI Clinical Decision Support',
    disclaimer: 'For clinical decision support only. Not a diagnosis. Clinical correlation and examination are required.',
    symptomsLabel: 'Clinical Presentation',
    symptomsPlaceholder: 'Describe the patient\'s symptoms, history, and relevant findings...',
    ageLabel: 'Age Range (optional)',
    agePlaceholder: 'e.g., 30-40, pediatric, elderly',
    sexLabel: 'Biological Sex (optional)',
    sexPlaceholder: 'e.g., male, female',
    submit: 'Generate Differential',
    generating: 'Analyzing...',
    differentials: 'Differential Diagnosis',
    redFlags: 'Red Flags',
    confidence: 'Confidence',
    rationale: 'Rationale',
    distinguishing: 'Key Factors',
    history: 'Session History',
    clearHistory: 'Clear History',
    noResults: 'Submit a clinical presentation to generate a differential diagnosis.',
    error: 'Unable to generate diagnosis. Please try again.',
  },
  es: {
    title: 'Soporte de Decision Clinica con IA',
    disclaimer: 'Solo para soporte de decision clinica. No es un diagnostico. Se requiere correlacion clinica y examinacion.',
    symptomsLabel: 'Presentacion Clinica',
    symptomsPlaceholder: 'Describa los sintomas del paciente, historia y hallazgos relevantes...',
    ageLabel: 'Rango de Edad (opcional)',
    agePlaceholder: 'ej., 30-40, pediatrico, anciano',
    sexLabel: 'Sexo Biologico (opcional)',
    sexPlaceholder: 'ej., masculino, femenino',
    submit: 'Generar Diferencial',
    generating: 'Analizando...',
    differentials: 'Diagnostico Diferencial',
    redFlags: 'Senales de Alerta',
    confidence: 'Confianza',
    rationale: 'Razonamiento',
    distinguishing: 'Factores Clave',
    history: 'Historial de Sesion',
    clearHistory: 'Limpiar Historial',
    noResults: 'Envie una presentacion clinica para generar un diagnostico diferencial.',
    error: 'No se pudo generar el diagnostico. Intente de nuevo.',
  },
};

const confidenceColors: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  MODERATE: { bg: 'bg-amber-50', text: 'text-amber-700' },
  LOW: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function AIDiagnosisTool({ lang, accessToken }: AIDiagnosisToolProps) {
  const t = content[lang];

  const [symptoms, setSymptoms] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [currentResult, setCurrentResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleSubmit = async () => {
    if (!symptoms.trim() || symptoms.trim().length < 5) return;

    setLoading(true);
    setError(false);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(`${API_URL}/ai/diagnosis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          age_range: ageRange.trim() || null,
          sex: sex.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const data: DiagnosisResult = await res.json();
      setCurrentResult(data);
      setHistory((prev) => [
        {
          symptoms: symptoms.trim(),
          age_range: ageRange.trim() || undefined,
          sex: sex.trim() || undefined,
          result: data,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-border-line shadow-sm">
      {/* Header with disclaimer */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">{t.title}</h2>
        <div className="mt-2 bg-caution-amber/10 border border-caution-amber/30 rounded-lg px-4 py-2">
          <p className="font-dm-sans text-xs text-caution-amber font-medium">{t.disclaimer}</p>
        </div>
      </div>

      {/* Input form */}
      <div className="px-6 pb-4 space-y-4">
        <div>
          <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
            {t.symptomsLabel}
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={t.symptomsPlaceholder}
            className="w-full border border-border-line rounded-lg p-3 font-dm-sans text-sm text-deep-charcoal resize-none focus:outline-none focus:border-clinical-teal min-h-[100px]"
            rows={4}
            maxLength={3000}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
              {t.ageLabel}
            </label>
            <input
              type="text"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder={t.agePlaceholder}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
              {t.sexLabel}
            </label>
            <input
              type="text"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              placeholder={t.sexPlaceholder}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
              maxLength={20}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !symptoms.trim() || symptoms.trim().length < 5}
          className="font-dm-sans text-sm font-semibold px-6 py-2.5 bg-inst-blue text-white rounded-lg hover:bg-inst-blue/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.generating : t.submit}
        </button>
      </div>

      {/* Results */}
      <div className="px-6 pb-6">
        {error && (
          <div className="bg-alert-garnet/10 border border-alert-garnet/30 rounded-lg px-4 py-3 mb-4">
            <p className="font-dm-sans text-sm text-alert-garnet">{t.error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-body-slate">
              <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.4s]" />
              <span className="font-dm-sans text-sm ml-2">{t.generating}</span>
            </div>
          </div>
        )}

        {!loading && !currentResult && !error && (
          <p className="font-dm-sans text-sm text-archival-grey text-center py-6">
            {t.noResults}
          </p>
        )}

        {!loading && currentResult && (
          <div className="space-y-4">
            {/* Differentials */}
            {currentResult.differentials.length > 0 && (
              <div>
                <h3 className="font-dm-sans font-semibold text-sm text-deep-charcoal mb-3">
                  {t.differentials}
                </h3>
                <div className="space-y-3">
                  {currentResult.differentials.map((diff, i) => {
                    const confColor = confidenceColors[diff.confidence.toUpperCase()] || confidenceColors.MODERATE;
                    return (
                      <div
                        key={i}
                        className="border border-border-line rounded-[12px] p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-dm-sans font-semibold text-deep-charcoal">
                            {i + 1}. {diff.condition}
                          </h4>
                          <span
                            className={`shrink-0 font-dm-sans text-xs font-medium px-2 py-0.5 rounded-full ${confColor.bg} ${confColor.text}`}
                          >
                            {diff.confidence}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-dm-sans text-sm text-body-slate">
                            <span className="font-medium text-archival-grey">{t.rationale}:</span>{' '}
                            {diff.rationale}
                          </p>
                          <p className="font-dm-sans text-sm text-body-slate">
                            <span className="font-medium text-archival-grey">{t.distinguishing}:</span>{' '}
                            {diff.distinguishing_factors}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {currentResult.red_flags.length > 0 && (
              <div className="bg-alert-garnet/5 border border-alert-garnet/20 rounded-[12px] p-4">
                <h3 className="font-dm-sans font-semibold text-sm text-alert-garnet mb-2">
                  {t.redFlags}
                </h3>
                <ul className="space-y-1">
                  {currentResult.red_flags.map((flag, i) => (
                    <li
                      key={i}
                      className="font-dm-sans text-sm text-body-slate flex items-start gap-2"
                    >
                      <span className="text-alert-garnet mt-1 shrink-0">!</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-caution-amber/10 border border-caution-amber/30 rounded-lg px-4 py-2">
              <p className="font-dm-sans text-xs text-caution-amber font-medium">
                {currentResult.disclaimer}
              </p>
            </div>
          </div>
        )}

        {/* Session history */}
        {history.length > 1 && (
          <div className="mt-6 pt-4 border-t border-border-line">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-dm-sans font-semibold text-sm text-deep-charcoal">
                {t.history} ({history.length})
              </h3>
              <button
                onClick={() => {
                  setHistory([]);
                  setCurrentResult(null);
                }}
                className="font-dm-sans text-xs text-archival-grey hover:text-alert-garnet transition"
              >
                {t.clearHistory}
              </button>
            </div>
            <div className="space-y-2">
              {history.slice(1).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentResult(entry.result)}
                  className="w-full text-left border border-border-line rounded-lg p-3 hover:border-clinical-teal/30 transition"
                >
                  <p className="font-dm-sans text-sm text-deep-charcoal line-clamp-1">
                    {entry.symptoms}
                  </p>
                  <p className="font-dm-sans text-xs text-archival-grey mt-1">
                    {entry.result.differentials.length} {t.differentials.toLowerCase()} &middot;{' '}
                    {entry.timestamp.toLocaleTimeString(lang === 'es' ? 'es' : 'en', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
