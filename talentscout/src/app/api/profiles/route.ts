import { NextRequest, NextResponse } from "next/server";
import { clearBuffer, getBufferEntries, type IngestBufferEntry } from "@/lib/ingest-buffer";

const TIMESTAMP_FIELDS = [
  "bufferedAt",
  "ingestedAt",
  "createdAt",
  "created_at",
  "timestamp",
  "postedAt",
  "updatedAt",
];

export async function GET(request: NextRequest) {
  const datasetId = process.env.APIFY_DATASET_ID;
  if (!datasetId) {
    return NextResponse.json({ error: "APIFY_DATASET_ID is not configured" }, { status: 500 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_TOKEN is not configured" }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.toLowerCase().trim();

  const { items: datasetItems, error: datasetError } = await fetchDatasetItems(datasetId, token);
  const bufferEntries = getBufferEntries();
  const bufferItems = bufferEntries.map(entry => entry.item);
  const items = mergeItems(datasetItems, bufferItems);

  const filtered = query ? filterByQuery(items, query) : items;
  const latestIngestedAt = computeLatestTimestamp(datasetItems, bufferEntries);

  if (datasetError && datasetItems.length === 0 && bufferItems.length === 0) {
    return NextResponse.json(
      { error: "Unable to load profiles from Apify", details: datasetError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    items: filtered,
    count: filtered.length,
    latestIngestedAt,
  });
}

export async function DELETE() {
  clearBuffer();
  return NextResponse.json({ cleared: true });
}

async function fetchDatasetItems(
  datasetId: string,
  token: string
): Promise<{ items: unknown[]; error: Error | null }> {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return { items: normalizeItems(payload), error: null };
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
    console.error("Failed to fetch Apify dataset", normalizedError);
    return { items: [], error: normalizedError };
  }
}

function normalizeItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.records)) return record.records;
  }
  return [];
}

function mergeItems(datasetItems: unknown[], bufferItems: unknown[]): unknown[] {
  const merged: unknown[] = [];
  const seen = new Set<string>();

  for (const item of datasetItems) {
    const key = safeDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  for (const item of bufferItems) {
    const key = safeDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function filterByQuery(items: unknown[], query: string): unknown[] {
  return items.filter(item => {
    try {
      return JSON.stringify(item).toLowerCase().includes(query);
    } catch (error) {
      return false;
    }
  });
}

function computeLatestTimestamp(datasetItems: unknown[], bufferEntries: IngestBufferEntry[]): string | null {
  let latest = Number.NEGATIVE_INFINITY;

  for (const item of datasetItems) {
    const timestamp = extractTimestamp(item);
    if (timestamp !== null) {
      latest = Math.max(latest, timestamp);
    }
  }

  for (const entry of bufferEntries) {
    const parsed = Date.parse(entry.receivedAt);
    if (Number.isFinite(parsed)) {
      latest = Math.max(latest, parsed);
    }
  }

  if (!Number.isFinite(latest)) {
    return null;
  }

  return new Date(latest).toISOString();
}

function extractTimestamp(item: unknown): number | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  for (const field of TIMESTAMP_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function safeDedupeKey(item: unknown): string {
  try {
    return typeof item === "string" ? item : JSON.stringify(item);
  } catch (error) {
    return String(item);
  }
}
