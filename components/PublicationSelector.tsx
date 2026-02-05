/**
 * Publication Selector Component
 *
 * Displays a list of publications fetched from external sources,
 * allowing the user to select which ones to include in their profile.
 */

import { useState, useCallback } from 'react';
import { Publication, PublicationSource } from '../lib/publications';

interface PublicationSelectorProps {
  publications: Publication[];
  source: PublicationSource;
  profileName?: string;
  lang?: 'en' | 'es';
  onConfirm: (selected: Publication[]) => void;
  onCancel: () => void;
  maxSelectable?: number;
}

export default function PublicationSelector({
  publications,
  source,
  profileName,
  lang = 'en',
  onConfirm,
  onCancel,
  maxSelectable = 20,
}: PublicationSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(publications.slice(0, Math.min(10, publications.length)).map((_, i) => i))
  );

  const labels = lang === 'es'
    ? {
        title: 'Selecciona tus publicaciones',
        subtitle: `Encontramos ${publications.length} publicaciones de ${sourceLabel(source, 'es')}`,
        profileName: profileName ? `Perfil: ${profileName}` : '',
        selectAll: 'Seleccionar todas',
        deselectAll: 'Deseleccionar todas',
        selected: 'seleccionadas',
        confirm: 'Confirmar selección',
        cancel: 'Cancelar',
        noPublications: 'No se encontraron publicaciones',
        maxNote: `Puedes seleccionar hasta ${maxSelectable} publicaciones`,
      }
    : {
        title: 'Select your publications',
        subtitle: `Found ${publications.length} publications from ${sourceLabel(source, 'en')}`,
        profileName: profileName ? `Profile: ${profileName}` : '',
        selectAll: 'Select all',
        deselectAll: 'Deselect all',
        selected: 'selected',
        confirm: 'Confirm selection',
        cancel: 'Cancel',
        noPublications: 'No publications found',
        maxNote: `You can select up to ${maxSelectable} publications`,
      };

  const togglePublication = useCallback((index: number) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else if (newSet.size < maxSelectable) {
        newSet.add(index);
      }
      return newSet;
    });
  }, [maxSelectable]);

  const selectAll = useCallback(() => {
    setSelected(new Set(publications.slice(0, maxSelectable).map((_, i) => i)));
  }, [publications, maxSelectable]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedPubs = publications
      .filter((_, i) => selected.has(i))
      .map(pub => ({ ...pub, includedInProfile: true }));
    onConfirm(selectedPubs);
  }, [publications, selected, onConfirm]);

  if (publications.length === 0) {
    return (
      <div className="bg-white border border-border-line rounded-lg p-6 text-center">
        <p className="text-body-slate mb-4">{labels.noPublications}</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-inst-blue font-medium hover:underline"
        >
          {labels.cancel}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-line rounded-lg overflow-hidden max-w-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-line bg-clinical-surface">
        <div className="flex items-center gap-3 mb-2">
          <SourceIcon source={source} />
          <h3 className="font-dm-sans font-semibold text-inst-blue">{labels.title}</h3>
        </div>
        <p className="text-sm text-body-slate">{labels.subtitle}</p>
        {labels.profileName && (
          <p className="text-xs text-archival-grey mt-1">{labels.profileName}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-3 border-b border-border-line flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={selectAll}
            className="text-sm text-clinical-teal hover:underline"
          >
            {labels.selectAll}
          </button>
          <button
            onClick={deselectAll}
            className="text-sm text-archival-grey hover:underline"
          >
            {labels.deselectAll}
          </button>
        </div>
        <span className="text-sm text-body-slate">
          {selected.size} {labels.selected}
        </span>
      </div>

      {/* Publications List */}
      <div className="max-h-80 overflow-y-auto">
        {publications.map((pub, index) => (
          <label
            key={index}
            className={`flex items-start gap-3 px-6 py-3 border-b border-border-line/50 cursor-pointer transition-colors ${
              selected.has(index) ? 'bg-clinical-surface/50' : 'hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(index)}
              onChange={() => togglePublication(index)}
              disabled={!selected.has(index) && selected.size >= maxSelectable}
              className="mt-1 w-4 h-4 text-clinical-teal border-border-line rounded focus:ring-clinical-teal"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${selected.has(index) ? 'text-inst-blue' : 'text-deep-charcoal'}`}>
                {pub.title}
              </p>
              {pub.authors && (
                <p className="text-xs text-archival-grey mt-1 truncate">{pub.authors}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-body-slate">
                {pub.journal && <span>{pub.journal}</span>}
                {pub.journal && pub.year && <span>·</span>}
                {pub.year && <span>{pub.year}</span>}
                {pub.citationCount !== undefined && (
                  <>
                    <span>·</span>
                    <span>{pub.citationCount} citations</span>
                  </>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Note about max */}
      {publications.length > maxSelectable && (
        <div className="px-6 py-2 bg-yellow-50 text-xs text-yellow-700">
          {labels.maxNote}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-line flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-body-slate font-dm-sans font-medium text-sm hover:text-inst-blue transition-colors"
        >
          {labels.cancel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="px-5 py-2 bg-clinical-teal text-white font-dm-sans font-semibold text-sm rounded-lg hover:bg-clinical-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {labels.confirm} ({selected.size})
        </button>
      </div>
    </div>
  );
}

function SourceIcon({ source }: { source: PublicationSource }) {
  switch (source) {
    case 'pubmed':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          PM
        </div>
      );
    case 'researchgate':
      return (
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
          RG
        </div>
      );
    case 'academia':
      return (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
          Ac
        </div>
      );
    case 'scholar':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
          GS
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold">
          ?
        </div>
      );
  }
}

function sourceLabel(source: PublicationSource, lang: 'en' | 'es'): string {
  const labels: Record<PublicationSource, { en: string; es: string }> = {
    pubmed: { en: 'PubMed', es: 'PubMed' },
    researchgate: { en: 'ResearchGate', es: 'ResearchGate' },
    academia: { en: 'Academia.edu', es: 'Academia.edu' },
    scholar: { en: 'Google Scholar', es: 'Google Scholar' },
    manual: { en: 'Manual entry', es: 'Entrada manual' },
  };
  return labels[source]?.[lang] || source;
}

/**
 * Manual Publication Entry Form
 */
interface ManualPublicationFormProps {
  lang?: 'en' | 'es';
  onSubmit: (pub: Omit<Publication, 'source' | 'includedInProfile'>) => void;
  onCancel: () => void;
}

export function ManualPublicationForm({
  lang = 'en',
  onSubmit,
  onCancel,
}: ManualPublicationFormProps) {
  const [title, setTitle] = useState('');
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState('');
  const [doi, setDoi] = useState('');
  const [url, setUrl] = useState('');

  const labels = lang === 'es'
    ? {
        title: 'Agregar publicación manualmente',
        titleLabel: 'Título *',
        journalLabel: 'Revista/Journal',
        yearLabel: 'Año',
        doiLabel: 'DOI',
        urlLabel: 'URL',
        submit: 'Agregar publicación',
        cancel: 'Cancelar',
        addAnother: 'Agregar otra',
      }
    : {
        title: 'Add publication manually',
        titleLabel: 'Title *',
        journalLabel: 'Journal',
        yearLabel: 'Year',
        doiLabel: 'DOI',
        urlLabel: 'URL',
        submit: 'Add publication',
        cancel: 'Cancel',
        addAnother: 'Add another',
      };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      journal: journal.trim() || undefined,
      year: year ? parseInt(year) : undefined,
      doi: doi.trim() || undefined,
      url: url.trim() || undefined,
    });

    // Clear form for next entry
    setTitle('');
    setJournal('');
    setYear('');
    setDoi('');
    setUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border-line rounded-lg p-6 max-w-xl">
      <h3 className="font-dm-sans font-semibold text-inst-blue mb-4">{labels.title}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-1">
            {labels.titleLabel}
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-border-line rounded-lg text-sm focus:outline-none focus:border-clinical-teal"
            placeholder={lang === 'es' ? 'Título de la publicación' : 'Publication title'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-deep-charcoal mb-1">
              {labels.journalLabel}
            </label>
            <input
              type="text"
              value={journal}
              onChange={e => setJournal(e.target.value)}
              className="w-full px-3 py-2 border border-border-line rounded-lg text-sm focus:outline-none focus:border-clinical-teal"
              placeholder={lang === 'es' ? 'Nombre de la revista' : 'Journal name'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-deep-charcoal mb-1">
              {labels.yearLabel}
            </label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min="1950"
              max={new Date().getFullYear()}
              className="w-full px-3 py-2 border border-border-line rounded-lg text-sm focus:outline-none focus:border-clinical-teal"
              placeholder="2023"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-1">
            {labels.doiLabel}
          </label>
          <input
            type="text"
            value={doi}
            onChange={e => setDoi(e.target.value)}
            className="w-full px-3 py-2 border border-border-line rounded-lg text-sm focus:outline-none focus:border-clinical-teal"
            placeholder="10.1234/example.2023"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-1">
            {labels.urlLabel}
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-border-line rounded-lg text-sm focus:outline-none focus:border-clinical-teal"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-body-slate font-dm-sans font-medium text-sm hover:text-inst-blue transition-colors"
        >
          {labels.cancel}
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-5 py-2 bg-clinical-teal text-white font-dm-sans font-semibold text-sm rounded-lg hover:bg-clinical-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
