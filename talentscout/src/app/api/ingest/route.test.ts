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
  
  it('accepts Apify-style payloads', async () => {
    const request = {
      headers: new Headers({
        'x-ingest-token': 'test-token',
      }),
      json: async () => [
        {
          username: '',
          ownerUsername: '  @apify_user  ',
          ownerFullName: '  Apify User  ',
          ownerProfilePicUrl: '  https://example.com/avatar.jpg  ',
          ownerProfileUrl: '  https://example.com/profile  ',
          ownerFollowers: ' 1,234 ',
          hashtags: ['  #Foo  ', '#Bar'],
          location: '  Denmark  ',
          bio: '  Example bio  ',
        },
      ],
    } as unknown as NextRequest;

    const upsertResult = Symbol('upsert');
    upsertMock.mockReturnValue(upsertResult);
    transactionMock.mockResolvedValue(undefined);

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 1 });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = upsertMock.mock.calls[0][0];
    expect(upsertArgs.where).toEqual({ username: 'apify_user' });
    expect(upsertArgs.update).toEqual({
      fullName: 'Apify User',
      bio: 'Example bio',
      profileUrl: 'https://example.com/profile',
      avatarUrl: 'https://example.com/avatar.jpg',
      followers: 1234,
      sourceHashtag: 'Foo',
      country: 'Denmark',
    });
    expect(upsertArgs.create).toEqual({
      username: 'apify_user',
      fullName: 'Apify User',
      bio: 'Example bio',
      profileUrl: 'https://example.com/profile',
      avatarUrl: 'https://example.com/avatar.jpg',
      followers: 1234,
      sourceHashtag: 'Foo',
      country: 'Denmark',
    });
    expect(transactionMock).toHaveBeenCalledWith([upsertResult]);
  });

  it('normalizes follower strings without digits to null', async () => {
    const request = {
      headers: new Headers({
        'x-ingest-token': 'test-token',
      }),
      json: async () => [
        {
          username: 'nodigits',
          followers: 'n/a',
        },
      ],
    } as unknown as NextRequest;

    const upsertResult = Symbol('upsert');
    upsertMock.mockReturnValue(upsertResult);
    transactionMock.mockResolvedValue(undefined);

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 1 });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = upsertMock.mock.calls[0][0];
    expect(upsertArgs.update.followers).toBeNull();
    expect(upsertArgs.create.followers).toBeNull();
    expect(transactionMock).toHaveBeenCalledWith([upsertResult]);
  });  
});
