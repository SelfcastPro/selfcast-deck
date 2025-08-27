// api/role.js
// Vercel serverless endpoint to fetch a role & its talents from Selfcast Producer API
// Secure: reads API base + token from environment variables (not exposed to the browser)

export default async function handler(req, res) {
  try {
    // Parse roleId from ?roleId= or ?roleUrl=
    const { roleId: qRoleId = "", roleUrl = "" } = req.query || {};
    const roleId = extractRoleId(qRoleId || roleUrl);
    if (!roleId) return res.status(400).json({ error: "Missing roleId or roleUrl" });

    const { SELFCAST_API_BASE, SELFCAST_API_KEY } = process.env;

    // If env vars are missing, return a small MOCK so UI still works
    if (!SELFCAST_API_BASE || !SELFCAST_API_KEY) {
      return res.json(mockRole(roleId));
    }

    // ---- Call your real API (adjust endpoints to your backend) ----
    // These are examples — swap to your actual Producer endpoints.
    // 1) Fetch role meta
    const roleResp = await fetchJson(`${SELFCAST_API_BASE}/roles/${roleId}`, SELFCAST_API_KEY);

    // 2) Fetch talents (handle pagination if your API uses it)
    // Try a couple of common patterns; adjust to fit your API:
    const talents = await collectPaginated(
      async (page, pageSize) =>
        fetchJson(
          `${SELFCAST_API_BASE}/roles/${roleId}/talents?page=${page}&pageSize=${pageSize}`,
          SELFCAST_API_KEY
        ),
      { pageSize: 100, maxPages: 10 } // up to 1000 items if needed
    );

    // 3) Map to the shape the deck expects
    const mapped = (talents || []).map(mapTalent);
    return res.json({
      roleId,
      title: roleResp?.title || roleResp?.name || `Role ${roleId}`,
      talents: mapped,
    });
  } catch (err) {
    console.error("role endpoint error:", err);
    return res.status(500).json({ error: "Internal error", detail: String(err?.message || err) });
  }
}

/* ------------ helpers ------------ */

function extractRoleId(input = "") {
  const s = String(input).trim();
  const m = s.match(/role\/([a-f0-9-]{36})/i);
  return m ? m[1] : s; // if user pasted the raw uuid
}

async function fetchJson(url, token) {
  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // If your API needs cookies/session instead of Bearer:
    // credentials: "include",
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Fetch failed ${r.status} ${r.statusText}: ${txt}`);
  }
  return r.json();
}

async function collectPaginated(fetchPageFn, { pageSize = 100, maxPages = 10 } = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchPageFn(page, pageSize);
    const items =
      data?.items || data?.results || data?.talents || Array.isArray(data) ? data : [];
    all.push(...items);
    const hasMore =
      data?.hasMore ?? data?.has_next ?? (items.length >= pageSize && data?.total
        ? all.length < data.total
        : items.length === pageSize);
    if (!hasMore) break;
  }
  return all;
}

// Map Producer talent payload -> deck talent shape
function mapTalent(t) {
  // Guess common field names; adjust to your API fields.
  const name =
    t?.name ||
    [t?.first_name, t?.last_name].filter(Boolean).join(" ") ||
    t?.display_name ||
    "Unnamed";

  const country = t?.country || t?.location?.country || t?.nationality || "";
  const city = t?.city || t?.location?.city || "";

  const status =
    (t?.status || t?.application_status || "").toString().toUpperCase();

  const profile_url =
    t?.profile_url ||
    t?.links?.profile ||
    (t?.id ? `https://producer.selfcast.com/talent/${t.id}` : "");

  // Build best image + gallery from various possible fields
  const media = [].concat(
    t?.best_image ? [{ url: t.best_image, tag: "best" }] : [],
    Array.isArray(t?.gallery) ? t.gallery.map((u) => ({ url: u })) : [],
    Array.isArray(t?.images)
      ? t.images.map((x) => ({ url: x?.url || x }))
      : []
  )
  .map((x) => x?.url || x)
  .filter(Boolean);

  const best_image = media[0] || "";
  const gallery = media.slice(1, 8); // keep it lean

  const requested_uploads = (t?.requested_uploads || t?.requested || []).map((r) => ({
    label: r?.label || r?.name || r?.type || "Requested",
    type: r?.type || "file",
    url: r?.url || r?.href || "",
  }));

  return {
    id: t?.id || t?.talent_id || String(Math.random()),
    name,
    status,
    country,
    city,
    profile_url,
    best_image,
    gallery,
    requested_uploads,
  };
}

/* --------- fallback mock (if env not set) --------- */
function mockRole(roleId) {
  const names = [
    "Hugo P",
    "Hjalte IG",
    "Ken S",
    "Valerie O",
    "Maya L",
    "Jon P",
    "Iben T",
    "Sara M",
  ];
  const statuses = ["IN_REVIEW", "SHORTLISTED", "OPTION", "IN_DIALOG", "BOOKED"];
  const talents = Array.from({ length: 14 }).map((_, i) => ({
    id: `demo-${i}`,
    name: names[i % names.length],
    status: statuses[i % statuses.length],
    country: ["Denmark", "Sweden", "Germany"][i % 3],
    city: ["Copenhagen", "Stockholm", "Berlin"][i % 3],
    profile_url: "https://producer.selfcast.com/talent/demo-" + i,
    best_image: `https://picsum.photos/seed/best${i}/900/1200`,
    gallery: [
      `https://picsum.photos/seed/${i}a/600/800`,
      `https://picsum.photos/seed/${i}b/600/800`,
      `https://picsum.photos/seed/${i}c/600/800`,
    ],
    requested_uploads: [],
  }));
  return { roleId, title: `Role ${roleId} (Mock)`, talents };
}
