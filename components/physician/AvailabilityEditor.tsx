/**
 * AvailabilityEditor Component
 *
 * Weekly schedule editor with day toggles, time slot management,
 * timezone selector, and bilingual support.
 */

import { useCallback, useEffect, useState } from 'react';
import { SupportedLang } from '../../lib/i18n';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  slots: TimeSlot[];
}

interface AvailabilityEditorProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const content = {
  en: {
    title: 'Availability Schedule',
    subtitle: 'Set your weekly availability for patient consultations.',
    timezone: 'Timezone',
    addSlot: 'Add slot',
    removeSlot: 'Remove',
    save: 'Save Changes',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save. Please try again.',
    loading: 'Loading schedule...',
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    } as Record<string, string>,
    start: 'Start',
    end: 'End',
    noSlots: 'No time slots',
  },
  es: {
    title: 'Horario de Disponibilidad',
    subtitle: 'Configure su disponibilidad semanal para consultas.',
    timezone: 'Zona horaria',
    addSlot: 'Agregar horario',
    removeSlot: 'Eliminar',
    save: 'Guardar Cambios',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar. Intente de nuevo.',
    loading: 'Cargando horario...',
    days: {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miercoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sabado',
      sunday: 'Domingo',
    } as Record<string, string>,
    start: 'Inicio',
    end: 'Fin',
    noSlots: 'Sin horarios',
  },
};

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'UTC',
];

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((day) => ({
  day,
  enabled: !['saturday', 'sunday'].includes(day),
  slots: !['saturday', 'sunday'].includes(day)
    ? [{ start_time: '09:00', end_time: '17:00' }]
    : [],
}));

export default function AvailabilityEditor({ physicianId, lang, accessToken }: AvailabilityEditorProps) {
  const t = content[lang];

  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone] = useState(getDefaultTimezone());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load existing availability
  useEffect(() => {
    if (!physicianId || !accessToken) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/physicians/${physicianId}/availability`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.timezone) setTimezone(data.timezone);
          if (data.schedule && data.schedule.length > 0) {
            // Merge fetched schedule with default to ensure all days are present
            const fetched = data.schedule as DaySchedule[];
            const merged = DAYS.map((day) => {
              const found = fetched.find((d) => d.day === day);
              return found || { day, enabled: false, slots: [] };
            });
            setSchedule(merged);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [physicianId, accessToken]);

  const handleToggleDay = (dayIndex: number) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dayIndex] = {
        ...next[dayIndex],
        enabled: !next[dayIndex].enabled,
        slots: !next[dayIndex].enabled && next[dayIndex].slots.length === 0
          ? [{ start_time: '09:00', end_time: '17:00' }]
          : next[dayIndex].slots,
      };
      return next;
    });
    setSaveState('idle');
  };

  const handleAddSlot = (dayIndex: number) => {
    setSchedule((prev) => {
      const next = [...prev];
      const lastSlot = next[dayIndex].slots[next[dayIndex].slots.length - 1];
      const newStart = lastSlot ? lastSlot.end_time : '09:00';
      next[dayIndex] = {
        ...next[dayIndex],
        slots: [...next[dayIndex].slots, { start_time: newStart, end_time: '17:00' }],
      };
      return next;
    });
    setSaveState('idle');
  };

  const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dayIndex] = {
        ...next[dayIndex],
        slots: next[dayIndex].slots.filter((_, i) => i !== slotIndex),
      };
      return next;
    });
    setSaveState('idle');
  };

  const handleSlotChange = (
    dayIndex: number,
    slotIndex: number,
    field: 'start_time' | 'end_time',
    value: string,
  ) => {
    setSchedule((prev) => {
      const next = [...prev];
      const slots = [...next[dayIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], [field]: value };
      next[dayIndex] = { ...next[dayIndex], slots };
      return next;
    });
    setSaveState('idle');
  };

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(
        `${API_URL}/physicians/${physicianId}/availability`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            timezone,
            schedule: schedule.map((day) => ({
              day: day.day,
              enabled: day.enabled,
              slots: day.enabled ? day.slots : [],
            })),
          }),
        },
      );
      if (res.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  }, [physicianId, timezone, schedule, accessToken]);

  if (loading) {
    return (
      <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="font-dm-sans text-sm text-body-slate">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[12px] border border-border-line shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">{t.title}</h2>
        <p className="font-dm-sans text-sm text-body-slate mt-1">{t.subtitle}</p>
      </div>

      {/* Timezone selector */}
      <div className="px-6 pb-4">
        <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
          {t.timezone}
        </label>
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaveState('idle');
          }}
          className="w-full sm:w-auto border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal bg-white"
        >
          {/* Current timezone first if not in common list */}
          {!COMMON_TIMEZONES.includes(timezone) && (
            <option value={timezone}>{timezone}</option>
          )}
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Day schedule grid */}
      <div className="px-6 pb-6 space-y-3">
        {schedule.map((day, dayIndex) => (
          <div
            key={day.day}
            className={`border rounded-[12px] p-4 transition ${
              day.enabled
                ? 'border-clinical-teal/30 bg-white'
                : 'border-border-line bg-clinical-surface/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => handleToggleDay(dayIndex)}
                  className={`relative w-10 h-6 rounded-full transition ${
                    day.enabled ? 'bg-clinical-teal' : 'bg-archival-grey/30'
                  }`}
                  aria-label={`Toggle ${day.day}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      day.enabled ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span
                  className={`font-dm-sans font-medium text-sm ${
                    day.enabled ? 'text-deep-charcoal' : 'text-archival-grey'
                  }`}
                >
                  {t.days[day.day]}
                </span>
              </div>

              {day.enabled && (
                <button
                  onClick={() => handleAddSlot(dayIndex)}
                  className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80 transition"
                >
                  + {t.addSlot}
                </button>
              )}
            </div>

            {day.enabled && (
              <div className="space-y-2 ml-[52px]">
                {day.slots.length === 0 ? (
                  <p className="font-dm-sans text-xs text-archival-grey">{t.noSlots}</p>
                ) : (
                  day.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2 flex-wrap">
                      <label className="font-dm-sans text-xs text-archival-grey w-10">
                        {t.start}
                      </label>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) =>
                          handleSlotChange(dayIndex, slotIndex, 'start_time', e.target.value)
                        }
                        className="border border-border-line rounded-lg px-2 py-1 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                      />
                      <label className="font-dm-sans text-xs text-archival-grey w-6">
                        {t.end}
                      </label>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) =>
                          handleSlotChange(dayIndex, slotIndex, 'end_time', e.target.value)
                        }
                        className="border border-border-line rounded-lg px-2 py-1 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                      />
                      {day.slots.length > 1 && (
                        <button
                          onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                          className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition ml-1"
                        >
                          {t.removeSlot}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`font-dm-sans text-sm font-semibold px-6 py-2.5 rounded-lg transition ${
            saveState === 'saved'
              ? 'bg-confirm-green text-white'
              : saveState === 'error'
              ? 'bg-alert-garnet text-white'
              : 'bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50'
          }`}
        >
          {saveState === 'saving'
            ? t.saving
            : saveState === 'saved'
            ? t.saved
            : saveState === 'error'
            ? t.error
            : t.save}
        </button>
      </div>
    </div>
  );
}
