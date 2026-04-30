/**
 * AccentPalettePicker
 *
 * Renders a 4-column grid of the 12 WCAG-AA swatches from WCAG_AA_PALETTE.
 * Selected swatch name shown below the grid in big type (bilingual).
 */

import { WCAG_AA_PALETTE } from '../../../../lib/practikahTheme';
import { content } from '../../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../../lib/i18n';

interface AccentPalettePickerProps {
  value: string;
  onChange: (hex: string) => void;
  lang: SupportedLang;
}

export default function AccentPalettePicker({
  value,
  onChange,
  lang,
}: AccentPalettePickerProps) {
  const t = content[lang].theming;

  const selectedSwatch = WCAG_AA_PALETTE.find(
    (s) => s.hex.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div>
      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1">
        {t.colors.title}
      </p>
      <p className="font-dm-sans text-xs text-body-slate mb-4">{t.colors.helper}</p>

      <div className="grid grid-cols-4 gap-3">
        {WCAG_AA_PALETTE.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            aria-label={lang === 'es' ? swatch.name_es : swatch.name_en}
            title={lang === 'es' ? swatch.name_es : swatch.name_en}
            onClick={() => onChange(swatch.hex)}
            className={`w-12 h-12 rounded-full border-2 transition-all ${
              value.toLowerCase() === swatch.hex.toLowerCase()
                ? 'border-deep-charcoal ring-2 ring-deep-charcoal ring-offset-2 scale-110'
                : 'border-deep-charcoal/10 hover:scale-110'
            }`}
            style={{ backgroundColor: swatch.hex }}
          />
        ))}
      </div>

      {selectedSwatch && (
        <p className="font-dm-sans text-sm font-semibold mt-4" style={{ color: selectedSwatch.hex }}>
          {lang === 'es' ? selectedSwatch.name_es : selectedSwatch.name_en}
        </p>
      )}
    </div>
  );
}
