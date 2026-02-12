type EnvShape = Record<string, string | undefined>;

const REQUIRED_ENV_VARS = ['PORT', 'DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv(config: EnvShape) {
  const missing = REQUIRED_ENV_VARS.filter((key) => !config[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const port = Number(config.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value "${config.PORT}". Expected 1-65535.`);
  }

  const logLevel = config.LOG_LEVEL?.toLowerCase() ?? 'info';
  const allowedLogLevels = ['error', 'warn', 'log', 'debug', 'verbose'];
  if (!allowedLogLevels.includes(logLevel)) {
    throw new Error(
      `Invalid LOG_LEVEL "${config.LOG_LEVEL}". Expected one of: ${allowedLogLevels.join(', ')}`,
    );
  }

  return {
    ...config,
    PORT: String(port),
    LOG_LEVEL: logLevel,
  };
}
