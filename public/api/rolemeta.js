// /api/rolemeta.js
// Henter titel + billede fra producer.selfcast.com role-side via serverless (undgår CORS)

export default async function handler(req, res) {
  try {
    const url = (req.query.url || "").trim();

    // Sikkerhed: tillad kun producer.selfcast.com + /role/ i stien
    try {
      const u = new URL(url);
      if (u.hostname !== "producer.selfcast.com" || !u.pathname.includes("/role/")) {
        return res.status(400).json({ error: "Only producer.selfcast.com role URLs are allowed." });
      }
    } catch {
      return res.status(400).json({ error: "Invalid URL." });
    }

    const r = await fetch(url, { headers: { "user-agent": "SelfcastDeck/1.0" } });
    const html = await r.text();

    // Naiv udtræk: prøv Open Graph først, ellers <title> og første <img>
    const pick = (re) => (html.match(re)?.[1] || "").trim();

    const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const titleTag = pick(/<title[^>]*>([^<]+)<\/title>/i);

    // simple fallback for hero image (første img i main)
    const firstImg = pick(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);

    return res.status(200).json({
      ok: true,
      title: ogTitle || titleTag || "",
      image: ogImage || firstImg || "",
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch role metadata." });
  }
}
