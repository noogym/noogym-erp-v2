export function validateEnv(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const databaseUrl = String(config.DATABASE_URL);
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
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

  const jwtRefreshSecret = String(config.JWT_REFRESH_SECRET ?? jwtSecret);
  if (
    nodeEnv === 'production' &&
    (weakJwtSecrets.has(jwtRefreshSecret) || jwtRefreshSecret.length < 32)
  ) {
    throw new Error(
      'JWT_REFRESH_SECRET must be a strong secret with at least 32 characters in production',
    );
  }

  if (!config.JWT_REFRESH_EXPIRES_IN) {
    config.JWT_REFRESH_EXPIRES_IN = '7d';
  }

  if (!config.PASSWORD_RESET_BASE_URL) {
    config.PASSWORD_RESET_BASE_URL = 'http://localhost:3000';
  }

  if (!config.PASSWORD_RESET_TTL_MINUTES) {
    config.PASSWORD_RESET_TTL_MINUTES = '30';
  }

  const emailProvider = String(config.EMAIL_PROVIDER ?? 'auto').toLowerCase();
  if (!['auto', 'resend', 'smtp'].includes(emailProvider)) {
    throw new Error('EMAIL_PROVIDER must be auto, resend, or smtp');
  }
  config.EMAIL_PROVIDER = emailProvider;

  const emailQueueEnabled = String(
    config.EMAIL_QUEUE_ENABLED ?? 'false',
  ).toLowerCase();
  if (!['true', 'false'].includes(emailQueueEnabled)) {
    throw new Error('EMAIL_QUEUE_ENABLED must be true or false');
  }
  config.EMAIL_QUEUE_ENABLED = emailQueueEnabled;

  const emailQueueRequired = String(
    config.EMAIL_QUEUE_REQUIRED ?? 'false',
  ).toLowerCase();
  if (!['true', 'false'].includes(emailQueueRequired)) {
    throw new Error('EMAIL_QUEUE_REQUIRED must be true or false');
  }
  config.EMAIL_QUEUE_REQUIRED = emailQueueRequired;

  const emailWorkerEnabled = String(
    config.EMAIL_WORKER_ENABLED ?? 'true',
  ).toLowerCase();
  if (!['true', 'false'].includes(emailWorkerEnabled)) {
    throw new Error('EMAIL_WORKER_ENABLED must be true or false');
  }
  config.EMAIL_WORKER_ENABLED = emailWorkerEnabled;

  if (emailQueueEnabled === 'true' && !config.REDIS_URL) {
    config.REDIS_URL = 'redis://localhost:6379';
  }

  if (!config.EMAIL_MAX_ATTEMPTS) {
    config.EMAIL_MAX_ATTEMPTS = '5';
  }

  if (!config.EMAIL_RETRY_DELAY_MS) {
    config.EMAIL_RETRY_DELAY_MS = '60000';
  }

  if (!config.EMAIL_WORKER_CONCURRENCY) {
    config.EMAIL_WORKER_CONCURRENCY = '5';
  }

  if (!config.EMAIL_RECOVERY_INTERVAL_MS) {
    config.EMAIL_RECOVERY_INTERVAL_MS = '60000';
  }

  if (!config.EMAIL_RECOVERY_BATCH_SIZE) {
    config.EMAIL_RECOVERY_BATCH_SIZE = '100';
  }

  const backgroundJobsEnabled = String(
    config.BACKGROUND_JOBS_ENABLED ?? 'true',
  ).toLowerCase();
  if (!['true', 'false'].includes(backgroundJobsEnabled)) {
    throw new Error('BACKGROUND_JOBS_ENABLED must be true or false');
  }
  config.BACKGROUND_JOBS_ENABLED = backgroundJobsEnabled;

  const backgroundWorkerEnabled = String(
    config.BACKGROUND_WORKER_ENABLED ?? 'true',
  ).toLowerCase();
  if (!['true', 'false'].includes(backgroundWorkerEnabled)) {
    throw new Error('BACKGROUND_WORKER_ENABLED must be true or false');
  }
  config.BACKGROUND_WORKER_ENABLED = backgroundWorkerEnabled;

  const backgroundJobsRequired = String(
    config.BACKGROUND_JOBS_REQUIRED ?? 'false',
  ).toLowerCase();
  if (!['true', 'false'].includes(backgroundJobsRequired)) {
    throw new Error('BACKGROUND_JOBS_REQUIRED must be true or false');
  }
  config.BACKGROUND_JOBS_REQUIRED = backgroundJobsRequired;

  const backgroundRecurringEnabled = String(
    config.BACKGROUND_RECURRING_ENABLED ?? 'true',
  ).toLowerCase();
  if (!['true', 'false'].includes(backgroundRecurringEnabled)) {
    throw new Error('BACKGROUND_RECURRING_ENABLED must be true or false');
  }
  config.BACKGROUND_RECURRING_ENABLED = backgroundRecurringEnabled;

  if (backgroundJobsEnabled === 'true' && !config.REDIS_URL) {
    config.REDIS_URL = 'redis://localhost:6379';
  }

  if (!config.BACKGROUND_WORKER_CONCURRENCY) {
    config.BACKGROUND_WORKER_CONCURRENCY = '5';
  }

  if (!config.BACKGROUND_MAX_ATTEMPTS) {
    config.BACKGROUND_MAX_ATTEMPTS = '5';
  }

  if (!config.BACKGROUND_RETRY_DELAY_MS) {
    config.BACKGROUND_RETRY_DELAY_MS = '60000';
  }

  if (!config.BACKGROUND_RECOVERY_INTERVAL_MS) {
    config.BACKGROUND_RECOVERY_INTERVAL_MS = '60000';
  }

  if (!config.BACKGROUND_RECOVERY_BATCH_SIZE) {
    config.BACKGROUND_RECOVERY_BATCH_SIZE = '200';
  }

  if (!config.BACKGROUND_SCHEDULER_INTERVAL_MS) {
    config.BACKGROUND_SCHEDULER_INTERVAL_MS = '900000';
  }

  const authProvider = String(config.AUTH_PROVIDER ?? 'local').toLowerCase();
  if (!['local', 'wso2'].includes(authProvider)) {
    throw new Error('AUTH_PROVIDER must be either local or wso2');
  }
  config.AUTH_PROVIDER = authProvider;

  if (!config.THROTTLE_TTL_MS) {
    config.THROTTLE_TTL_MS = '60000';
  }

  if (!config.THROTTLE_LIMIT) {
    config.THROTTLE_LIMIT = '120';
  }

  return config;
}
