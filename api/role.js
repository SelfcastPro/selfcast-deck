// api/role.js

function extractRoleId(input = "") {
  const s = String(input || "").trim();
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
      data?.items ||
      data?.results ||
      data?.talents ||
      (Array.isArray(data) ? data : []);   // ← rettet parentes
    all.push(...items);

    const hasMore =
      data?.hasMore ??
      data?.has_next ??
      (items.length >= pageSize && data?.total
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

  const status = (t?.status || t?.application_status || "").toString().toUpperCase();

  return {
    id: t?.id || t?.uuid || t?._id || "",
    name,
    country,
    city,
    status,
    age: t?.age || t?.profile_age || null,
    gender: t?.gender || "",
    photo: t?.photo_url || t?.avatar || "",
    skills: t?.skills || [],
    raw: t,
  };
}

export { extractRoleId, fetchJson, collectPaginated, mapTalent };
