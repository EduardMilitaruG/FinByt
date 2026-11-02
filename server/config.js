const DEV_FALLBACK_SECRET = 'dev-only-secret-do-not-use-in-production';

// The JWT secret signs every session token. Outside development it must come
// from the environment: a hardcoded fallback would let anyone who reads this
// repo forge a token for any user.
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return DEV_FALLBACK_SECRET;
  }
  throw new Error('JWT_SECRET must be set when NODE_ENV is not development or test');
};

export const getJwtExpiry = () => process.env.JWT_EXPIRY || '7d';
