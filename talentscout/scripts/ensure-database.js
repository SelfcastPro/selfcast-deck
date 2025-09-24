#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const url = process.env.DATABASE_URL;
if (!url || url.trim().length === 0) {
  console.log('Skipping `prisma migrate deploy`: DATABASE_URL is not set.');
  process.exit(0);
}

const binary = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(binary, ['migrate', 'deploy'], { stdio: 'inherit' });

if (result.error) {
  console.error('Failed to run `prisma migrate deploy`:', result.error);
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}
