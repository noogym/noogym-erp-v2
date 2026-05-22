export function validateEnv(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const nodeEnv = String(config.NODE_ENV ?? 'development');
  const jwtSecret = String(config.JWT_SECRET ?? '');
  const weakJwtSecrets = new Set(['change-me', 'noogym-dev-secret']);

  if (!jwtSecret) {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }

    config.JWT_SECRET = 'noogym-dev-secret';
  }

  if (
    nodeEnv === 'production' &&
    (weakJwtSecrets.has(jwtSecret) || jwtSecret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET must be a strong secret with at least 32 characters in production',
    );
  }

  if (!config.JWT_EXPIRES_IN) {
    config.JWT_EXPIRES_IN = '1d';
  }

  if (!config.THROTTLE_TTL_MS) {
    config.THROTTLE_TTL_MS = '60000';
  }

  if (!config.THROTTLE_LIMIT) {
    config.THROTTLE_LIMIT = '120';
  }

  return config;
}
