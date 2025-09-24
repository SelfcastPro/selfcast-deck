#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const { normalizeDatabaseUrl } = require('./database-url');

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
