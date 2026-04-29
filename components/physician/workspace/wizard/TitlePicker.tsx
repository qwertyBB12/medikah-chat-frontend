/**
 * Phase 12 Plan 12-01: TitlePicker
 *
 * Wizard Step 1 — Doctor picks their gendered honorific: Dr (masculine) or Dra (feminine).
 * Per FREE-04: title is user-selected — never guessed from name.
 *
 * Chip-toggle pattern mirrors BatchedSpecialtyForm.tsx:153-172.
 * Card chrome mirrors DashboardContent.tsx card shape.
 * All copy from practikahWorkspaceContent.ts.
 */

import { useState } from 'react';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

interface TitlePickerProps {
  lang: SupportedLang;
  onSubmit: (title: 'Dr' | 'Dra') => void;
}

export default function TitlePicker({ lang, onSubmit }: TitlePickerProps) {
  const t = workspaceContent[lang];
  const [selected, setSelected] = useState<'Dr' | 'Dra' | null>(null);

  const options: Array<{ value: 'Dr' | 'Dra'; label: string; disambig: string }> = [
    { value: 'Dr', label: t.wizard.title.dr, disambig: t.wizard.title.drDisambig },
    { value: 'Dra', label: t.wizard.title.dra, disambig: t.wizard.title.draDisambig },
  ];

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-body font-bold text-lg text-deep-charcoal mb-1">
        {t.wizard.title.cardTitle}
      </h3>
      <p className="font-body text-sm text-body-slate mb-6">
        {t.wizard.title.cardSubtitle}
      </p>

      <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-3">
        {t.wizard.title.label}
      </p>

      {/* 2-col chip grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {options.map(({ value, label, disambig }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center px-4 py-5 rounded-[12px] border-2 transition-all ${
                isSelected
                  ? 'bg-clinical-teal text-white border-clinical-teal shadow-md'
                  : 'bg-linen text-body-slate border-transparent hover:bg-linen-white hover:border-clinical-teal/30'
              }`}
            >
              <span className="font-heading text-3xl uppercase mb-1">{label}</span>
              <span className={`font-dm-sans text-xs text-center ${isSelected ? 'text-white/80' : 'text-archival-grey'}`}>
                {disambig}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onSubmit(selected)}
        className="w-full bg-inst-blue text-white py-3 rounded-md font-dm-sans font-medium text-sm hover:bg-inst-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t.wizard.title.continue}
      </button>
    </div>
  );
}
