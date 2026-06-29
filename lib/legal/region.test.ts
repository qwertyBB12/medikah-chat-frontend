import { describe, expect, it } from 'vitest';
import { detectRegion } from './region';

function ctx(headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  return { req: { headers }, query } as unknown as Parameters<typeof detectRegion>[0];
}

function nfGeo(code: string): string {
  return Buffer.from(JSON.stringify({ country: { code } }), 'utf8').toString('base64');
}

describe('detectRegion', () => {
  it('reads US from the Netlify x-nf-geo header', () => {
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('US') }))).toBe('US');
  });

  it('reads MX from x-nf-geo', () => {
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('MX') }))).toBe('MX');
  });

  it('maps any other detected country to MX (LatAm-first default)', () => {
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('CA') }))).toBe('MX');
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('CO') }))).toBe('MX');
  });

  it('honors the ?region override above geo (travelers / VPN / QA)', () => {
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('US') }, { region: 'mx' }))).toBe('MX');
    expect(detectRegion(ctx({ 'x-nf-geo': nfGeo('MX') }, { region: 'US' }))).toBe('US');
  });

  it('falls back to x-country (US/MX only)', () => {
    expect(detectRegion(ctx({ 'x-country': 'US' }))).toBe('US');
    expect(detectRegion(ctx({ 'x-country': 'MX' }))).toBe('MX');
    // a non-US/MX x-country is not trusted -> default MX
    expect(detectRegion(ctx({ 'x-country': 'DE' }))).toBe('MX');
  });

  it('uses the en-US Accept-Language hint when no geo header is present', () => {
    expect(detectRegion(ctx({ 'accept-language': 'en-US,en;q=0.9' }))).toBe('US');
    expect(detectRegion(ctx({ 'accept-language': 'es-MX,es;q=0.9' }))).toBe('MX');
  });

  it('defaults to MX with no signal', () => {
    expect(detectRegion(ctx())).toBe('MX');
  });

  it('ignores a malformed x-nf-geo and continues the chain', () => {
    expect(detectRegion(ctx({ 'x-nf-geo': 'not-base64-json' }))).toBe('MX');
    expect(detectRegion(ctx({ 'x-nf-geo': 'not-base64', 'x-country': 'US' }))).toBe('US');
  });
});
