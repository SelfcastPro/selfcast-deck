import { NextRequest, NextResponse } from "next/server";
import { apifyUrl } from "@/lib/apify";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get("datasetId") || process.env.APIFY_DATASET_ID;
    if (!datasetId) {
      return NextResponse.json({ error: "No datasetId provided" }, { status: 400 });
    }
    const url = apifyUrl(`/datasets/${datasetId}/items`, { clean: 1 });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Apify error" }, { status: 502 });
    const items = await res.json();
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
