import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadCueMode,
  saveCueMode,
  controllerFlowMode,
  DEFAULT_CUE_MODE,
  CUE_MODE_STORAGE_KEY,
} from './mode'

describe('cue mode persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing is chosen yet (→ show picker)', () => {
    expect(loadCueMode()).toBeNull()
  })

  it('round-trips a saved mode', () => {
    saveCueMode('ptt')
    expect(loadCueMode()).toBe('ptt')
    saveCueMode('text')
    expect(loadCueMode()).toBe('text')
  })

  it('treats an unknown/legacy stored value as not-chosen', () => {
    window.localStorage.setItem(CUE_MODE_STORAGE_KEY, 'walkie-talkie')
    expect(loadCueMode()).toBeNull()
  })

  it('ignores an invalid mode on save', () => {
    // @ts-expect-error — deliberately invalid
    saveCueMode('nope')
    expect(loadCueMode()).toBeNull()
  })

  it('default mode is voice (recommended, no regression from today)', () => {
    expect(DEFAULT_CUE_MODE).toBe('voice')
  })

  it('maps doctor-facing mode to the controller flow mode', () => {
    expect(controllerFlowMode('voice')).toBe('continuous')
    expect(controllerFlowMode('ptt')).toBe('ptt')
    expect(controllerFlowMode('text')).toBeNull()
  })
})
