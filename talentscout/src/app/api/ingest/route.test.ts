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
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data.items);
  });
});
