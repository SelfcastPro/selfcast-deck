import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { upsertMock, transactionMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: {
      upsert: upsertMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST } from './route';

describe('POST /api/ingest', () => {
  beforeEach(() => {
    upsertMock.mockReset();
    transactionMock.mockReset();
    process.env.INGEST_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.INGEST_TOKEN;
  });

  it('rejects payloads with missing usernames', async () => {
    const request = {
      headers: new Headers({
        'x-ingest-token': 'test-token',
      }),
      json: async () => [
        {
          username: '   ',
        },
      ],
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Username is required' });
    expect(upsertMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
