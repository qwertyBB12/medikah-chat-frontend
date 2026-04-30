/**
 * ThemingEditor
 *
 * 6-tab orchestrator for the Práctikah Try Pro theming experience.
 *
 * Tabs: Layout | Colors | Typography | Photos | Brand | Content
 *
 * Split-screen layout:
 *  - Left: editor controls (max-w-md)
 *  - Right: live <slug>.medikah.health iframe with cachebust query param
 *
 * Auto-save: 800ms debounce after any picker change → PUT /api/practikah/theme/update.
 * On 200, increments previewKey to refresh iframe. Shows inline status.
 *
 * Content tab embeds the existing <WebsiteEditor> — NO duplication.
 *
 * Development: iframe points at http://localhost:3000/sites/${slug} (process.env.NODE_ENV === 'development').
 * Production: https://${slug}.medikah.health.
 *
 * Per T-12-05-09: iframe src is hardcoded template — slug comes from session physician,
 * not from user-controlled input at editor time.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { SupportedLang } from '../../../../lib/i18n';
import type { LayoutVariant, FontWeight, PracikahTheme } from '../../../../lib/practikahTheme';
import { trackEngagementEvent } from '../../../../lib/practikahEngagementHeuristic';
import { DEFAULT_THEME } from '../../../../lib/practikahTheme';
import { content } from '../../../../lib/practikahWorkspaceContent';
import LayoutVariantPicker from './LayoutVariantPicker';
import AccentPalettePicker from './AccentPalettePicker';
import FontWeightPicker from './FontWeightPicker';
import FaviconUploader from './FaviconUploader';
import PhotoGalleryEditor from './PhotoGalleryEditor';
import WebsiteEditor from '../../editor/WebsiteEditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'layout' | 'colors' | 'typography' | 'photos' | 'brand' | 'content';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ThemingEditorProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
  slug: string;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ThemingEditor({
  physicianId,
  lang,
  accessToken,
  slug,
  onClose,
}: ThemingEditorProps) {
  const t = content[lang].theming;

  // Tab navigation
  const [activeTab, setActiveTab] = useState<TabId>('layout');

  // Theme state (loaded from BFF on mount)
  const [theme, setTheme] = useState<PracikahTheme | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Preview iframe refreshes via key increment
  const [previewKey, setPreviewKey] = useState(() => Date.now());

  // Autosave state
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Load theme on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/practikah/theme/get');
        if (!res.ok) {
          // 404 → default theme (doctor hasn't customized yet)
          if (res.status === 404) {
            setTheme({
              physician_id: physicianId,
              ...DEFAULT_THEME,
              updated_at: new Date().toISOString(),
            });
            return;
          }
          setLoadError(true);
          return;
        }
        const data = (await res.json()) as PracikahTheme & { _default?: boolean };
        setTheme({
          physician_id: data.physician_id ?? physicianId,
          layout_variant: data.layout_variant ?? DEFAULT_THEME.layout_variant,
          accent_color: data.accent_color ?? DEFAULT_THEME.accent_color,
          font_weight: data.font_weight ?? DEFAULT_THEME.font_weight,
          favicon_url: data.favicon_url ?? null,
          office_photo_urls: data.office_photo_urls ?? [],
          updated_at: data.updated_at ?? new Date().toISOString(),
        });
      } catch {
        setLoadError(true);
      }
    })();
  }, [physicianId]);

  // ---------------------------------------------------------------------------
  // Autosave — debounced 800ms after any theme change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!dirty || !theme) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        const res = await fetch('/api/practikah/theme/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layout_variant: theme.layout_variant,
            accent_color: theme.accent_color,
            font_weight: theme.font_weight,
            favicon_url: theme.favicon_url,
            office_photo_urls: theme.office_photo_urls,
          }),
        });

        if (res.ok) {
          setSaveState('saved');
          setDirty(false);
          setPreviewKey(Date.now()); // refresh iframe
          setTimeout(() => setSaveState('idle'), 2000);
          // Fire-and-forget engagement event — tracks theme edit for upgrade CTA heuristic (D-20)
          trackEngagementEvent('theme_edit');
        } else {
          setSaveState('error');
        }
      } catch {
        setSaveState('error');
      }
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, theme]);

  // ---------------------------------------------------------------------------
  // Theme field updater
  // ---------------------------------------------------------------------------

  const updateTheme = <K extends keyof PracikahTheme>(key: K, val: PracikahTheme[K]) => {
    setTheme((prev) => prev ? { ...prev, [key]: val } : prev);
    setDirty(true);
    setSaveState('idle');
  };

  // ---------------------------------------------------------------------------
  // Preview iframe URL
  // ---------------------------------------------------------------------------

  const previewBase =
    process.env.NODE_ENV === 'development'
      ? `http://localhost:3000/sites/${slug}`
      : `https://${slug}.medikah.health`;

  const previewSrc = `${previewBase}?cachebust=${previewKey}`;

  // ---------------------------------------------------------------------------
  // Tab definitions
  // ---------------------------------------------------------------------------

  const tabs: { id: TabId; label: string }[] = [
    { id: 'layout', label: t.tabLayout },
    { id: 'colors', label: t.tabColors },
    { id: 'typography', label: t.tabTypography },
    { id: 'photos', label: t.tabPhotos },
    { id: 'brand', label: t.tabBrand },
    { id: 'content', label: t.tabContent },
  ];

  // ---------------------------------------------------------------------------
  // Save status indicator
  // ---------------------------------------------------------------------------

  const statusLabel =
    saveState === 'saving'
      ? t.savePending
      : saveState === 'saved'
      ? t.saved
      : saveState === 'error'
      ? t.saveError
      : null;

  const statusColor =
    saveState === 'saved'
      ? 'text-confirm-green'
      : saveState === 'error'
      ? 'text-alert-garnet'
      : 'text-body-slate';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadError) {
    return (
      <div className="p-6 text-center">
        <p className="font-dm-sans text-sm text-alert-garnet">
          {lang === 'es' ? 'No se pudo cargar el tema. Intenta de nuevo.' : 'Could not load theme. Please try again.'}
        </p>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-clinical-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-deep-charcoal/10">
        <h2 className="font-heading uppercase text-lg text-inst-blue tracking-wide">{t.title}</h2>
        <div className="flex items-center gap-4">
          {statusLabel && (
            <span className={`font-dm-sans text-xs ${statusColor}`}>{statusLabel}</span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="font-dm-sans text-sm text-archival-grey hover:text-deep-charcoal transition-colors"
            >
              {lang === 'es' ? 'Cerrar' : 'Close'}
            </button>
          )}
        </div>
      </div>

      {/* Body: editor left + preview right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div className="w-full max-w-md flex-shrink-0 flex flex-col border-r border-deep-charcoal/10 overflow-y-auto">
          {/* Tab nav */}
          <nav className="flex border-b border-deep-charcoal/10 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-3 font-dm-sans text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-clinical-teal text-white border-b-2 border-clinical-teal'
                    : 'text-body-slate hover:text-deep-charcoal hover:bg-deep-charcoal/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="p-6 flex-1">
            {activeTab === 'layout' && (
              <LayoutVariantPicker
                value={theme.layout_variant as LayoutVariant}
                onChange={(v) => updateTheme('layout_variant', v)}
                lang={lang}
              />
            )}

            {activeTab === 'colors' && (
              <AccentPalettePicker
                value={theme.accent_color}
                onChange={(hex) => updateTheme('accent_color', hex)}
                lang={lang}
              />
            )}

            {activeTab === 'typography' && (
              <FontWeightPicker
                value={theme.font_weight as FontWeight}
                onChange={(v) => updateTheme('font_weight', v)}
                lang={lang}
              />
            )}

            {activeTab === 'photos' && (
              <PhotoGalleryEditor
                value={theme.office_photo_urls}
                onChange={(urls) => updateTheme('office_photo_urls', urls)}
                physicianId={physicianId}
                lang={lang}
              />
            )}

            {activeTab === 'brand' && (
              <FaviconUploader
                value={theme.favicon_url}
                onChange={(url) => updateTheme('favicon_url', url)}
                physicianId={physicianId}
                lang={lang}
              />
            )}

            {activeTab === 'content' && (
              <WebsiteEditor
                physicianId={physicianId}
                lang={lang}
                accessToken={accessToken}
              />
            )}
          </div>
        </div>

        {/* Live preview pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-clinical-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-deep-charcoal/10 bg-white">
            <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey">
              {t.preview.title}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewKey(Date.now())}
                className="font-dm-sans text-xs text-body-slate hover:text-clinical-teal transition-colors"
              >
                {t.preview.refresh}
              </button>
              <a
                href={previewBase}
                target="_blank"
                rel="noopener noreferrer"
                className="font-dm-sans text-xs text-clinical-teal hover:text-clinical-teal/80 transition-colors"
              >
                {t.preview.openInNewTab} ↗
              </a>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <iframe
              key={previewKey}
              src={previewSrc}
              className="w-full h-full rounded-md border border-deep-charcoal/10 bg-white"
              title={t.preview.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
