import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJwtSecret } from '../config.js';
import { isValidEmail, normalizeEmail, validateAsset } from '../validation.js';

describe('getJwtSecret', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses JWT_SECRET when set', () => {
    vi.stubEnv('JWT_SECRET', 'abc');
    expect(getJwtSecret()).toBe('abc');
  });

  // Regression: production silently fell back to a secret published in the repo.
  it('refuses to run in production without JWT_SECRET', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET must be set/);
  });

  it('allows a fallback in development', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getJwtSecret()).toBeTruthy();
  });
});

describe('email helpers', () => {
  it.each([
    ['ana@test.dev', true],
    [' ana@test.dev ', true],
    ['ana@test', false],
    ['ana test@test.dev', false],
    ['', false],
    [42, false],
  ])('isValidEmail(%j) -> %s', (email, ok) => {
    expect(isValidEmail(email)).toBe(ok);
  });

  it('normalizes case and whitespace', () => {
    expect(normalizeEmail('  Ana@Test.DEV ')).toBe('ana@test.dev');
  });
});

describe('validateAsset', () => {
  const valid = { assetName: 'Bitcoin', symbol: 'BTC', assetType: 'crypto', quantity: 1, buyPrice: 0 };

  it('accepts a complete asset with buyPrice 0', () => {
    expect(validateAsset(valid)).toBeNull();
  });

  it('accepts an empty partial update', () => {
    expect(validateAsset({}, { partial: true })).toBeNull();
  });

  it('accepts null notes and currentPrice', () => {
    expect(validateAsset({ ...valid, notes: null, currentPrice: null })).toBeNull();
  });

  it.each([
    [{ quantity: Infinity }, /quantity/],
    [{ quantity: NaN }, /quantity/],
    [{ quantity: 1e-9 }, null],
    [{ buyPrice: -0.01 }, /buyPrice/],
    [{ assetType: 'CRYPTO' }, /assetType/],
  ])('%j -> %s', (override, expected) => {
    const result = validateAsset({ ...valid, ...override });
    if (expected === null) expect(result).toBeNull();
    else expect(result).toMatch(expected);
  });
});
