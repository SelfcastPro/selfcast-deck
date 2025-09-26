import { describe, expect, it, beforeEach } from "vitest";
import { POST } from "./route";
import { clearBuffer, getBufferEntries } from "@/lib/ingest-buffer";
import type { NextRequest } from "next/server";

const TOKEN = "test-token";

type RequestInitOverrides = {
  token?: string;
  authorization?: string;
};

function createRequest(payload: unknown, overrides: RequestInitOverrides = {}): NextRequest {
  const headers = new Headers();
  if (overrides.authorization) {
    headers.set("authorization", overrides.authorization);
  }
  if (typeof overrides.token === "string") {
    headers.set("x-ingest-token", overrides.token);
  } else if (!headers.has("authorization")) {
    headers.set("x-ingest-token", TOKEN);
  }

  const requestInit = {
    headers,
    json: async () => payload,
  } satisfies Partial<NextRequest>;

  return requestInit as NextRequest;
}

describe("/api/ingest", () => {
  beforeEach(() => {
    process.env.INGEST_TOKEN = TOKEN;
    clearBuffer();
  });

  it("accepts payloads that are already arrays", async () => {
    const payload = [
      { id: "direct-alpha" },
      { id: "direct-beta" },
    ];

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload);
  });

  it("supports bearer tokens via the authorization header", async () => {
    const payload = {
      items: [
        { id: "bearer-alpha" },
      ],
    } satisfies Record<string, unknown>;

    const response = await POST(
      createRequest(payload, { authorization: `Bearer ${TOKEN}` }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 1, skipped: 0 });
  });

  it("accepts payloads with records arrays", async () => {
    const payload = {
      records: [
        { id: "record-alpha" },
        { id: "record-beta" },
      ],
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.records);
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
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

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
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data);
  });

  it("accepts payloads with items nested under eventData", async () => {
    const payload = {
      eventData: {
        items: [
          { id: "event-alpha" },
          { id: "event-beta" },
        ],
      },
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.eventData.items);
  });

  it("rejects requests without a matching token", async () => {
    const response = await POST(createRequest([], { token: "wrong" }));

    expect(response.status).toBe(401);
  });
});
