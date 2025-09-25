const DEFAULT_CAPACITY = 500;

const KEY_FIELDS = ["id", "objectID", "uid", "url", "profileUrl", "handle", "username"];

export interface IngestBufferEntry {
  key: string;
  item: unknown;
  receivedAt: string;
}

interface IngestBufferState {
  entries: IngestBufferEntry[];
  seen: Set<string>;
  capacity: number;
}

type GlobalWithBuffer = typeof globalThis & {
  __talentScoutIngestBuffer__?: IngestBufferState;
};

function ensureBuffer(): IngestBufferState {
  const globalWithBuffer = globalThis as GlobalWithBuffer;
  if (!globalWithBuffer.__talentScoutIngestBuffer__) {
    globalWithBuffer.__talentScoutIngestBuffer__ = {
      entries: [],
      seen: new Set<string>(),
      capacity: DEFAULT_CAPACITY,
    };
  }
  return globalWithBuffer.__talentScoutIngestBuffer__!;
}

function dedupeKey(item: unknown): string {
  if (item && typeof item === "object") {
    for (const field of KEY_FIELDS) {
      const value = (item as Record<string, unknown>)[field];
      if (typeof value === "string" || typeof value === "number") {
        return `${field}:${String(value)}`;
      }
    }
  }
  return JSON.stringify(item);
}

export function addItemsToBuffer(items: unknown[]): { inserted: number; skipped: number } {
  const buffer = ensureBuffer();
  let inserted = 0;
  let skipped = 0;
  for (const item of items) {
    const key = dedupeKey(item);
    if (buffer.seen.has(key)) {
      skipped += 1;
      continue;
    }
    const entry = {
      key,
      item,
      receivedAt: new Date().toISOString(),
    } satisfies IngestBufferEntry;
    buffer.entries.push(entry);
    buffer.seen.add(key);
    inserted += 1;
    if (buffer.entries.length > buffer.capacity) {
      const removed = buffer.entries.shift();
      if (removed) {
        buffer.seen.delete(removed.key);
      }
    }
  }
  return { inserted, skipped };
}

export function getBufferEntries(): IngestBufferEntry[] {
  const buffer = ensureBuffer();
  return [...buffer.entries];
}

export function clearBuffer() {
  const buffer = ensureBuffer();
  buffer.entries = [];
  buffer.seen.clear();
}
