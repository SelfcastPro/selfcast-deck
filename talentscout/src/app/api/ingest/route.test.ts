import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import type { ProfileUpsertInput } from '@/lib/profile-store';

const { saveProfilesMock } = vi.hoisted(() => ({
  saveProfilesMock: vi.fn<(...args: [ProfileUpsertInput[]]) => Promise<number>>(),
}));

vi.mock('@/lib/profile-store', () => ({
  saveProfiles: saveProfilesMock,
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      return new Response(JSON.stringify(data), {
        ...init,
        headers,
      });
    },
  },
}));

import { POST } from './route';

describe('POST /api/ingest', () => {
  beforeEach(() => {
    saveProfilesMock.mockReset();
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
    expect(saveProfilesMock).not.toHaveBeenCalled();
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

    saveProfilesMock.mockResolvedValue(1);

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 1 });

    expect(saveProfilesMock).toHaveBeenCalledTimes(1);
    const saved = saveProfilesMock.mock.calls[0][0];
    expect(saved).toEqual([
      {
        username: 'apify_user',
        fullName: 'Apify User',
        bio: 'Example bio',
        profileUrl: 'https://example.com/profile',
        avatarUrl: 'https://example.com/avatar.jpg',
        followers: 1234,
        sourceHashtag: 'Foo',
        country: 'Denmark',
      },
    ]);
  });

  it.each([
    ['12k', 12000],
    ['1.2M', 1_200_000],
    ['987', 987],
  ])('normalizes follower shorthand %s to %d', async (input, expected) => {
    const request = {
      headers: new Headers({
        'x-ingest-token': 'test-token',
      }),
      json: async () => [
        {
          username: 'shorthand',
          followers: input,
        },
      ],
    } as unknown as NextRequest;

    saveProfilesMock.mockResolvedValue(1);
    
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 1 });

    expect(saveProfilesMock).toHaveBeenCalledTimes(1);
    const saved = saveProfilesMock.mock.calls[0][0][0];
    expect(saved.followers).toBe(expected);
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

    saveProfilesMock.mockResolvedValue(1);
    
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 1 });

    expect(saveProfilesMock).toHaveBeenCalledTimes(1);
    const saved = saveProfilesMock.mock.calls[0][0][0];
    expect(saved.followers).toBeNull();
  });
});
