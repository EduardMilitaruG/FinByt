export const ASSET_TYPES = ['crypto', 'stock', 'etf'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// JSON numbers only: SQLite would happily store "abc" in a REAL column,
// and the CHECK (quantity > 0) passes because text sorts above numbers.
export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const isValidEmail = (email) => typeof email === 'string' && EMAIL_RE.test(email.trim());

/**
 * Validates an asset body. With partial = true (PUT), missing fields are allowed
 * but any field that is present must still be valid. Returns an error or null.
 */
export const validateAsset = (body, { partial = false } = {}) => {
  const { assetName, symbol, assetType, quantity, buyPrice, currentPrice, notes } = body ?? {};
  const present = (v) => v !== undefined;

  if (!partial) {
    const missing = ['assetName', 'symbol', 'assetType', 'quantity', 'buyPrice'].filter((k) => !present(body?.[k]));
    if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  }

  if (present(assetName) && !isNonEmptyString(assetName)) return 'assetName must be a non-empty string';
  if (present(symbol) && !isNonEmptyString(symbol)) return 'symbol must be a non-empty string';
  if (present(assetType) && !ASSET_TYPES.includes(assetType)) return 'assetType must be crypto, stock, or etf';
  if (present(quantity) && !(isFiniteNumber(quantity) && quantity > 0)) return 'quantity must be a number greater than 0';
  if (present(buyPrice) && !(isFiniteNumber(buyPrice) && buyPrice >= 0)) return 'buyPrice must be a number >= 0';
  if (present(currentPrice) && currentPrice !== null && !(isFiniteNumber(currentPrice) && currentPrice >= 0)) {
    return 'currentPrice must be a number >= 0';
  }
  if (present(notes) && notes !== null && typeof notes !== 'string') return 'notes must be a string';
  return null;
};
