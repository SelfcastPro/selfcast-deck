import { NextRequest, NextResponse } from "next/server";
import { addItemsToBuffer, getBufferEntries } from "@/lib/ingest-buffer";

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const maybeRecord = payload as Record<string, unknown>;
    const directItems = maybeRecord.items;
    if (Array.isArray(directItems)) {
      return directItems;
    }
    const data = maybeRecord.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object") {
      const nestedDataItems = (data as Record<string, unknown>).items;
      if (Array.isArray(nestedDataItems)) {
        return nestedDataItems;
      }
    }
    const eventData = maybeRecord.eventData;
    if (eventData && typeof eventData === "object") {
      const nestedItems = (eventData as Record<string, unknown>).items;
      if (Array.isArray(nestedItems)) {
        return nestedItems;
      }
    }
    const records = maybeRecord.records;
    if (Array.isArray(records)) {
      return records;
    }
  }
  return [];
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.INGEST_TOKEN;
  if (!expectedToken) {
    return new NextResponse("INGEST_TOKEN is not configured", { status: 500 });
  }

  const providedToken = getProvidedToken(request);
  if (!providedToken || providedToken !== expectedToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const items = extractItems(payload);
  if (!items.length) {
    return NextResponse.json({ error: "Payload must contain an array of items" }, { status: 400 });
  }

  const { inserted, skipped } = addItemsToBuffer(items);
  const buffered = getBufferEntries().length;
  return NextResponse.json({ inserted, skipped, buffered });
}

function getProvidedToken(request: NextRequest): string | null {
  const directHeader = request.headers.get("x-ingest-token");
  if (directHeader) {
    return directHeader;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1].trim();
  }

  return authHeader.trim() || null;
}
