import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const childProcess = require('node:child_process');
const spawnSyncMock = vi.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ status: 0 }));

class ExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`exit:${code}`);
    this.code = code;
  }
}

const originalArgv = process.argv.slice();
const originalExit = process.exit;
const originalEnv = process.env.DATABASE_URL;

beforeEach(() => {
  spawnSyncMock.mockClear();
});

afterEach(() => {
  process.argv = originalArgv.slice();
  if (originalEnv === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalEnv;
  }
  process.exit = originalExit;
  vi.resetModules();
});

async function runWrapper(args: string[], databaseUrl?: string) {
  process.argv = ['node', 'prisma', ...args];
  if (databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = databaseUrl;
  }

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new ExitError(typeof code === 'number' ? code : 0);
  });
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    await import('./prisma-wrapper.js');
  } catch (error) {
    if (error instanceof ExitError) {
      const summary = {
        exitCode: error.code,
        logs: logSpy.mock.calls.map((call) => call.join(' ')),
      };
      exitSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
      return summary;
    }
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    throw error;
  }

  const summary = { exitCode: 0, logs: logSpy.mock.calls.map((call) => call.join(' ')) };
  exitSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
  return summary;
}

describe('prisma wrapper', () => {
  test('skips migrate deploy when DATABASE_URL is placeholder', async () => {
    const result = await runWrapper(
      ['migrate', 'deploy'],
      'postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require',
    );
    expect(result.exitCode).toBe(0);
    expect(spawnSyncMock).not.toHaveBeenCalled();
    expect(result.logs).toContain(
      'Skipping `prisma migrate deploy`: DATABASE_URL is missing, empty, or still uses placeholder values.',
    );
  });

  test('trims DATABASE_URL before delegating to Prisma', async () => {
    const result = await runWrapper(
      ['migrate', 'deploy'],
      '  postgres://user:pass@host:5432/db?sslmode=require  ',
    );
    expect(result.exitCode).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
    const call = spawnSyncMock.mock.calls[0];
    const env = call[2]?.env as NodeJS.ProcessEnv | undefined;
    expect(env?.DATABASE_URL).toBe('postgres://user:pass@host:5432/db?sslmode=require');
  });

  test('delegates to Prisma when command does not require a database', async () => {
    const result = await runWrapper(['generate']);
    expect(result.exitCode).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
  });
});
