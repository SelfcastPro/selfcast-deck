const PLACEHOLDER_TOKENS = new Set(['USER', 'USERNAME', 'PASSWORD', 'HOST', 'DBNAME']);

const isPlaceholder = (value) => {
  if (typeof value !== 'string') return false;
  if (value.toUpperCase() !== value) return false;
  return PLACEHOLDER_TOKENS.has(value);
};

const isSupportedProtocol = (protocol) => protocol === 'postgres:' || protocol === 'postgresql:';

function isValidDatabaseUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  let parsed;
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

function normalizeDatabaseUrl(value) {
  if (!isValidDatabaseUrl(value)) {
    return undefined;
  }
  return value.trim();
}

module.exports = {
  isValidDatabaseUrl,
  normalizeDatabaseUrl,
};
