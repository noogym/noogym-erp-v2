export function validateEnv(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!config.JWT_SECRET) {
    config.JWT_SECRET = 'noogym-dev-secret';
  }

  if (!config.JWT_EXPIRES_IN) {
    config.JWT_EXPIRES_IN = '1d';
  }

  return config;
}
