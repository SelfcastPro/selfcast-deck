#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const normalizeDatabaseUrl = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    return undefined;
  }

  const protocol = parsed.protocol;
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    return undefined;
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) {
    return undefined;
  }

  const placeholderTokens = new Set(['USER', 'USERNAME', 'PASSWORD', 'HOST', 'DBNAME']);
  const hasPlaceholder = [parsed.username, parsed.password, parsed.hostname, dbName]
    .filter(Boolean)
    .some((segment) => {
      return typeof segment === 'string' && segment.toUpperCase() === segment && placeholderTokens.has(segment);
    });
  if (hasPlaceholder) {
    return undefined;
  }

  return trimmed;
};

const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.log(
    'Skipping `prisma migrate deploy`: DATABASE_URL is missing, empty, or still uses placeholder values.',
  );
  process.exit(0);
}

process.env.DATABASE_URL = url;

const binary = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(binary, ['migrate', 'deploy'], { stdio: 'inherit' });

if (result.error) {
  console.error('Failed to run `prisma migrate deploy`:', result.error);
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}
