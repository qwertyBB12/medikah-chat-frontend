/**
 * CueActionCard tests — Phase 23 Plan 03 TDD (PRES-04 / D-04)
 *
 * Behavioral contract:
 *   - Renders title and summary text
 *   - NOT a chat bubble: no role="log", no "message-bubble" markup
 *   - Confirm/Cancel buttons are only shown when onConfirm is provided
 *   - Without onConfirm, no action buttons render
 *   - Items list renders when provided
 *   - Bilingual: locale="es" renders Spanish button labels
 *   - Confirm calls the callback; Cancel calls onCancel
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CueActionCard from './CueActionCard';

afterEach(() => cleanup());

describe('CueActionCard — PRES-04 / D-04 action card contract', () => {
  // ── 1. Content rendering ─────────────────────────────────────────────────

  it('Test 1a: renders title text', () => {
    render(
      <CueActionCard
        title="Your day — Monday"
        summary="You have 3 appointments."
        locale="en"
      />
    );
    expect(screen.getByText('Your day — Monday')).toBeTruthy();
  });

  it('Test 1b: renders summary text', () => {
    render(
      <CueActionCard
        title="Cue"
        summary="No events scheduled for today."
        locale="en"
      />
    );
    expect(screen.getByText('No events scheduled for today.')).toBeTruthy();
  });

  it('Test 1c: renders items list when provided', () => {
    render(
      <CueActionCard
        title="Today"
        summary="3 events:"
        items={['9:00 AM — Patient consult', '11:30 AM — Lab review', '3:00 PM — Team meeting']}
        locale="en"
      />
    );
    expect(screen.getByText('9:00 AM — Patient consult')).toBeTruthy();
    expect(screen.getByText('11:30 AM — Lab review')).toBeTruthy();
    expect(screen.getByText('3:00 PM — Team meeting')).toBeTruthy();
  });

  // ── 2. NOT a chat bubble ─────────────────────────────────────────────────

  it('Test 2a: no role="log" in the rendered output (not a chat transcript)', () => {
    const { container } = render(
      <CueActionCard title="Test" summary="No events." locale="en" />
    );
    expect(container.querySelector('[role="log"]')).toBeNull();
  });

  it('Test 2b: no "message-bubble" or "chat-bubble" class name in the DOM', () => {
    const { container } = render(
      <CueActionCard title="Test" summary="No events." locale="en" />
    );
    const markup = container.innerHTML;
    expect(markup).not.toContain('message-bubble');
    expect(markup).not.toContain('chat-bubble');
    expect(markup).not.toContain('msg-bubble');
  });

  // ── 3. Confirm/Cancel presence ────────────────────────────────────────────

  it('Test 3a: no Confirm or Cancel buttons when onConfirm is undefined', () => {
    render(
      <CueActionCard
        title="Cue"
        summary="Your calendar is clear."
        locale="en"
        onConfirm={undefined}
      />
    );
    expect(screen.queryByText('Confirm')).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('Test 3b: Confirm and Cancel buttons appear when onConfirm is provided (en)', () => {
    render(
      <CueActionCard
        title="Block 2–4pm Tuesday?"
        summary="This will add a blocked slot to your calendar."
        locale="en"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('Test 3c: Confirm and Cancel use Spanish labels when locale="es"', () => {
    render(
      <CueActionCard
        title="¿Bloquear martes 2–4pm?"
        summary="Se añadirá un bloqueo a tu calendario."
        locale="es"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Confirmar')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  // ── 4. Callback behavior ─────────────────────────────────────────────────

  it('Test 4a: onConfirm called when Confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <CueActionCard
        title="Confirm?"
        summary="Block 2–4pm."
        locale="en"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Test 4b: onCancel called when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <CueActionCard
        title="Confirm?"
        summary="Block 2–4pm."
        locale="en"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
