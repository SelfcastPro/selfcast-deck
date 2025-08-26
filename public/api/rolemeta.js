// /api/rolemeta.js
// Fetch title + hero image from a Selfcast role page (best-effort).
// NOTE: If the page requires login, we likely get a login HTML and return ok:false.

export default async function handler(req, res) {
  try {
    const url = (req.query.url || "").trim();
    let u;
    try {
      u = new URL(url);
      if (u.hostname !== "producer.selfcast.com" || !u.pathname.includes("/role/")) {
        return res.status(400).json({ ok: false, error: "Only producer.selfcast.com role URLs are allowed." });
      }
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid URL." });
    }

    const r = await fetch(url, { headers: { "user-agent": "SelfcastDeck/1.1 (+vercel)" } });
    const html = await r.text();

    const pick = (re) => (html.match(re)?.[1] || "").trim();
    const abs = (src) => {
      try { return new URL(src, u.origin).href; } catch { return src; }
    };

    // Try Open Graph first
    let title =
      pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      pick(/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i) ||
      pick(/<title[^>]*>([^<]+)<\/title>/i);

    let image =
      pick(/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i) ||
      pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

    if (image) image = abs(image);

    // Fallback: first prominent image
    if (!image) {
      const firstImg = pick(/<main[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/i) ||
                       pick(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (firstImg) image = abs(firstImg);
    }

    // Heuristic: if page looks like a login wall, fail clearly
    const looksLikeLogin = /login|sign\s*in|password/i.test(html) && !title && !image;
    const ok = (!!title || !!image) && !looksLikeLogin;

    return res.status(200).json({
      ok,
      title: title || "",
      image: image || "",
      reason: ok ? undefined : "Page likely requires login or has no public meta.",
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Failed to fetch role metadata." });
  }
}
