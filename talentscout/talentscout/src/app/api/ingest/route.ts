import { NextRequest, NextResponse } from "next/server";
import { addItemsToBuffer, getBufferEntries } from "@/lib/ingest-buffer";

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const maybeRecord = payload as Record<string, unknown>;

    if (Array.isArray(maybeRecord.items)) {
      return maybeRecord.items;
    }

    const nestedData = maybeRecord.data;
    if (Array.isArray(nestedData)) {
      return nestedData;
    }

    if (nestedData && typeof nestedData === "object") {
      const nestedItems = (nestedData as Record<string, unknown>).items;
      if (Array.isArray(nestedItems)) {
        return nestedItems;
      }
    }
  }

  return [];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.INGEST_TOKEN;
  if (!expectedToken) {
    return new NextResponse("INGEST_TOKEN is not configured", { status: 500 });
  }

  const providedToken = request.headers.get("x-ingest-token");
  if (!providedToken || providedToken !== expectedToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const payload = await request.json();
    const items = extractItems(payload);
    const { inserted, skipped } = addItemsToBuffer(items);
    const buffered = getBufferEntries().length;

    return NextResponse.json({ inserted, skipped, buffered });
  } catch (error) {
    return NextResponse.json({ error: "Failed to parse payload" }, { status: 400 });
  }
}
