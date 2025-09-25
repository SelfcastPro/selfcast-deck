import { NextRequest, NextResponse } from "next/server";
import { clearBuffer, getBufferEntries } from "@/lib/ingest-buffer";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.toLowerCase().trim();

  let entries = getBufferEntries();
  if (query) {
    entries = entries.filter(entry => {
      try {
        return JSON.stringify(entry.item).toLowerCase().includes(query);
      } catch (error) {
        return false;
      }
    });
  }

  const latest = entries.length ? entries[entries.length - 1].receivedAt : null;

  return NextResponse.json({
    items: entries.map(entry => entry.item),
    count: entries.length,
    latestIngestedAt: latest,
  });
}

export async function DELETE() {
  clearBuffer();
  return NextResponse.json({ cleared: true });
}
