/**
 * Onboarding Phase Indicator
 *
 * Shows the 7 phases of physician onboarding with visual progress.
 * Used in the sidebar and as a mobile progress bar.
 */

import { SupportedLang } from '../../lib/i18n';

export type OnboardingPhaseKey =
  | 'welcome'
  | 'identity'
  | 'licensing'
  | 'specialty'
  | 'education'
  | 'publications'
  | 'availability'
  | 'your_story'
  | 'confirmation';

interface PhaseDefinition {
  key: OnboardingPhaseKey;
  en: string;
  es: string;
  icon: string;
}

export const ONBOARDING_PHASES: PhaseDefinition[] = [
  { key: 'welcome', en: 'Welcome', es: 'Bienvenida', icon: '1' },
  { key: 'identity', en: 'Identity', es: 'Identidad', icon: '2' },
  { key: 'licensing', en: 'Licensing', es: 'Licencias', icon: '3' },
  { key: 'specialty', en: 'Specialty', es: 'Especialidad', icon: '4' },
  { key: 'education', en: 'Education', es: 'Educación', icon: '5' },
  { key: 'publications', en: 'Publications', es: 'Publicaciones', icon: '6' },
  { key: 'availability', en: 'Availability', es: 'Disponibilidad', icon: '7' },
  { key: 'your_story', en: 'Your Story', es: 'Su Historia', icon: '8' },
  { key: 'confirmation', en: 'Confirmation', es: 'Confirmación', icon: '✓' },
];

// Map agent phases to indicator phases
export function mapAgentPhaseToIndicator(
  agentPhase: string
): OnboardingPhaseKey {
  switch (agentPhase) {
    case 'briefing':
      return 'welcome';
    case 'identity':
      return 'identity';
    case 'licensing':
      return 'licensing';
    case 'specialty':
      return 'specialty';
    case 'education':
      return 'education';
    case 'intellectual':
      return 'publications';
    case 'presence':
      return 'availability';
    case 'narrative':
      return 'your_story';
    case 'confirmation':
    case 'completed':
      return 'confirmation';
    default:
      return 'welcome';
  }
}

interface OnboardingPhaseIndicatorProps {
  currentPhase: OnboardingPhaseKey;
  lang: SupportedLang;
  variant?: 'sidebar' | 'mobile';
}

export default function OnboardingPhaseIndicator({
  currentPhase,
  lang,
  variant = 'sidebar',
}: OnboardingPhaseIndicatorProps) {
  const currentIndex = ONBOARDING_PHASES.findIndex(
    (p) => p.key === currentPhase
  );

  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2">
        {ONBOARDING_PHASES.map((phase, idx) => {
          const isComplete = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={phase.key}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                isComplete
                  ? 'bg-clinical-teal'
                  : isCurrent
                  ? 'bg-clinical-teal/60'
                  : 'bg-white/20'
              }`}
              title={phase[lang]}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="font-dm-sans text-[11px] text-white/40 uppercase tracking-[0.08em] mb-3">
        {lang === 'en' ? 'Onboarding Progress' : 'Progreso de Registro'}
      </p>
      {ONBOARDING_PHASES.map((phase, idx) => {
        const isComplete = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div
            key={phase.key}
            className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${
              isCurrent ? 'bg-white/10' : ''
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-300 ${
                isComplete
                  ? 'bg-clinical-teal text-white'
                  : isCurrent
                  ? 'bg-white text-clinical-teal'
                  : 'bg-white/10 text-white/30'
              }`}
            >
              {isComplete ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                phase.icon
              )}
            </div>
            <span
              className={`font-dm-sans text-sm transition-all duration-300 ${
                isCurrent
                  ? 'text-white font-medium'
                  : isComplete
                  ? 'text-white/70'
                  : 'text-white/30'
              }`}
            >
              {phase[lang]}
            </span>
          </div>
        );
      })}

      {/* Progress percentage */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="font-dm-sans text-[11px] text-white/40">
            {lang === 'en' ? 'Progress' : 'Progreso'}
          </span>
          <span className="font-dm-sans text-[11px] text-white/60 font-medium">
            {Math.round(
              (currentIndex / (ONBOARDING_PHASES.length - 1)) * 100
            )}
            %
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-clinical-teal rounded-full transition-all duration-500"
            style={{
              width: `${
                (currentIndex / (ONBOARDING_PHASES.length - 1)) * 100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
