import { describe, expect, it, beforeEach } from "vitest";
import { POST } from "./route";
import { clearBuffer, getBufferEntries } from "@/lib/ingest-buffer";
import type { NextRequest } from "next/server";

const TOKEN = "test-token";

type RequestInitOverrides = {
  token?: string;
};

function createRequest(payload: unknown, overrides: RequestInitOverrides = {}): NextRequest {
  const requestInit = {
    headers: new Headers({
      "x-ingest-token": overrides.token ?? TOKEN,
    }),
    json: async () => payload,
  } satisfies Partial<NextRequest>;

  return requestInit as NextRequest;
}

describe("/api/ingest", () => {
  beforeEach(() => {
    process.env.INGEST_TOKEN = TOKEN;
    clearBuffer();
  });

  it("accepts payloads with items nested under data", async () => {
    const payload = {
      data: {
        items: [
          { id: "alpha" },
          { id: "beta" },
        ],
      },
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0, buffered: 2 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data.items);
  });
  
  it("accepts payloads with data arrays", async () => {
    const payload = {
      data: [
        { id: "gamma" },
        { id: "delta" },
      ],
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0, buffered: 2 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data);
  });

  it("accepts payloads that are direct arrays", async () => {
    const payload = [
      { id: "epsilon" },
      { id: "zeta" },
    ];

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0, buffered: 2 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload);
  });

  it("treats empty batches as a successful no-op", async () => {
    const payload = { items: [] };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 0, skipped: 0, buffered: 0 });

    expect(getBufferEntries()).toHaveLength(0);
  });
});
