// @vitest-environment node

/**
 * Phase 17 — Wave-0 avatar import test (AUTH-05)
 *
 * Covers the sharp 256×256 JPEG re-encode pipeline used during workspace
 * activation to write a SOGo-compatible avatar from the physician's
 * onboarding photo (SC3 spec: 256×256 cover-fit JPEG at quality 85).
 *
 * No staging credentials required — generates a synthetic source buffer
 * using sharp at test setup.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';

// Synthetic source: a 512×512 solid-colour JPEG generated in-process.
let sourceBuffer: Buffer;

beforeAll(async () => {
  // Create a 512×512 green square as the "onboarding photo" source.
  sourceBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: { r: 44, g: 122, b: 140 }, // clinical-teal
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
});

describe('sharp avatar re-encode (256×256 cover-fit JPEG)', () => {
  it('produces a Buffer from a 512×512 source', async () => {
    const result = await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('output dimensions are exactly 256×256', async () => {
    const result = await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
  });

  it('output format is JPEG', async () => {
    const result = await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const meta = await sharp(result).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('output is smaller than or equal to the 512×512 source (sanity check)', async () => {
    const result = await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // 256×256 output should generally be smaller than 512×512 source.
    expect(result.length).toBeLessThanOrEqual(sourceBuffer.length);
  });

  it('is idempotent: re-encoding a 256×256 source preserves dimensions', async () => {
    // First pass
    const pass1 = await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Second pass (simulating calling the re-encode on an already-256×256 image)
    const pass2 = await sharp(pass1)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const meta = await sharp(pass2).metadata();
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
    expect(meta.format).toBe('jpeg');
  });
});
