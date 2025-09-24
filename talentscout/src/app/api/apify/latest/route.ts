import { NextRequest, NextResponse } from "next/server";
import { apifyUrl } from "@/lib/apify";

export async function GET(req: NextRequest) {
  const actorId = process.env.APIFY_ACTOR_ID;
  if (!actorId) return NextResponse.json({ error: "No APIFY_ACTOR_ID set" }, { status: 400 });

  // 1) find latest successful run
  const runsUrl = apifyUrl(`/acts/${actorId}/runs`, { limit: 1, desc: 1, status: "SUCCEEDED" });
  const runsRes = await fetch(runsUrl, { cache: "no-store" });
  if (!runsRes.ok) return NextResponse.json({ error: "Apify runs error" }, { status: 502 });
  const runsJson = await runsRes.json();
  const run = runsJson?.data?.items?.[0];
  const datasetId = run?.defaultDatasetId || run?.datasetId;
  if (!datasetId) return NextResponse.json({ error: "No dataset found on latest run" }, { status: 404 });

  // 2) return items
  const itemsUrl = apifyUrl(`/datasets/${datasetId}/items`, { clean: 1 });
  const itemsRes = await fetch(itemsUrl, { cache: "no-store" });
  if (!itemsRes.ok) return NextResponse.json({ error: "Apify items error" }, { status: 502 });
  const items = await itemsRes.json();
  return NextResponse.json({ datasetId, items });
}
