/**
 * LayoutVariantPicker
 *
 * Renders 3 layout variant cards with screenshot thumbnails from /theming-thumbnails/.
 * Selecting a card calls onChange with the variant identifier.
 * Active variant gets a clinical-teal ring.
 */

import Image from 'next/image';
import type { LayoutVariant } from '../../../../lib/practikahTheme';
import { content } from '../../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../../lib/i18n';

const VARIANTS: LayoutVariant[] = ['classic', 'editorial', 'minimal'];

interface LayoutVariantPickerProps {
  value: LayoutVariant;
  onChange: (v: LayoutVariant) => void;
  lang: SupportedLang;
}

export default function LayoutVariantPicker({
  value,
  onChange,
  lang,
}: LayoutVariantPickerProps) {
  const t = content[lang].theming;

  return (
    <div>
      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-4">
        {t.tabLayout}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VARIANTS.map((variant) => (
          <button
            key={variant}
            type="button"
            onClick={() => onChange(variant)}
            className={`relative rounded-md border-2 p-4 transition-all text-left ${
              value === variant
                ? 'border-clinical-teal ring-2 ring-clinical-teal ring-offset-2 bg-clinical-teal/5'
                : 'border-deep-charcoal/10 hover:border-deep-charcoal/30 bg-white'
            }`}
          >
            <div className="relative w-full overflow-hidden rounded-sm mb-3" style={{ aspectRatio: '4/3' }}>
              <Image
                src={`/theming-thumbnails/${variant}.png`}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <h3 className="font-heading uppercase text-base text-inst-blue">
              {t.layout[variant].name}
            </h3>
            <p className="font-body text-xs text-body-slate mt-1 leading-snug">
              {t.layout[variant].desc}
            </p>
            {value === variant && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-clinical-teal flex items-center justify-center">
                <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
