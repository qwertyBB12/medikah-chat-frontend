/**
 * FontWeightPicker
 *
 * 3-option toggle showing live "Aa" samples at 300/400/700.
 * Active option gets a clinical-teal border.
 */

import type { FontWeight } from '../../../../lib/practikahTheme';
import { content } from '../../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../../lib/i18n';

const WEIGHTS: { key: FontWeight; cssWeight: number }[] = [
  { key: 'light', cssWeight: 300 },
  { key: 'regular', cssWeight: 400 },
  { key: 'bold', cssWeight: 700 },
];

interface FontWeightPickerProps {
  value: FontWeight;
  onChange: (v: FontWeight) => void;
  lang: SupportedLang;
}

export default function FontWeightPicker({
  value,
  onChange,
  lang,
}: FontWeightPickerProps) {
  const t = content[lang].theming;

  return (
    <div>
      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-4">
        {t.fonts.title}
      </p>
      <div className="flex gap-3">
        {WEIGHTS.map(({ key, cssWeight }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex-1 px-4 py-4 rounded-md border-2 transition-all text-center ${
              value === key
                ? 'border-clinical-teal bg-linen/40'
                : 'border-deep-charcoal/10 bg-white hover:border-deep-charcoal/30'
            }`}
            style={{ fontWeight: cssWeight }}
          >
            <span
              className="font-body text-2xl text-deep-charcoal block"
              style={{ fontWeight: cssWeight }}
            >
              Aa
            </span>
            <p className="font-dm-sans text-xs text-body-slate mt-1">
              {t.fonts[key]}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
