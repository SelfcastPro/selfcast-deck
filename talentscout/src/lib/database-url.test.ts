const PLACEHOLDER_TOKENS = new Set(['USER', 'USERNAME', 'PASSWORD', 'HOST', 'DBNAME']);

const isPlaceholder = (value: string | null | undefined) => {
  if (!value) return false;
  if (value.toUpperCase() !== value) {
    return false;
  }
  return PLACEHOLDER_TOKENS.has(value);
};

const isSupportedProtocol = (protocol: string) => protocol === 'postgres:' || protocol === 'postgresql:';

export function isValidDatabaseUrl(value: string | undefined | null): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    return false;
  }

  if (!isSupportedProtocol(parsed.protocol)) {
    return false;
  }

  const databaseName = parsed.pathname.replace(/^\//, '');
  if (!databaseName) {
    return false;
  }

  if (parsed.port && !/^\d+$/.test(parsed.port)) {
    return false;
  }

  if (isPlaceholder(parsed.username) || isPlaceholder(parsed.password)) {
    return false;
  }

  if (isPlaceholder(parsed.hostname) || isPlaceholder(databaseName)) {
    return false;
  }

  return true;
}

export function normalizeDatabaseUrl(value: string | undefined | null): string | undefined {
  return isValidDatabaseUrl(value) ? value!.trim() : undefined;
}
