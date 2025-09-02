// api/scrape.js — best-effort HTML scrape without private API

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();

  try {
    const u = new URL(req.url, 'http://local');
    const url = u.searchParams.get('url');
    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
      return res.end(JSON.stringify({ error: 'Missing url' }));
    }

    const resp = await fetch(url, { headers: { 'User-Agent': 'SelfcastScraper/1.0' } });
    const html = await resp.text();

    const out = { name: '', image: '', height_cm: '', country: '', requested_media_url: '' };

    // og:title
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitle) out.name = ogTitle[1];

    // og:image
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImage) out.image = ogImage[1];

    // JSON-LD blocks
    const jsonlds = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of jsonlds) {
      try {
        const j = JSON.parse(m[1]);
        const items = Array.isArray(j) ? j : [j];
        for (const it of items) {
          if (!out.name && (it.name || it.alternateName)) out.name = it.name || it.alternateName;
          if (!out.country) {
            const c = it.address?.addressCountry || it.nationality || it.country;
            if (typeof c === 'string') out.country = c;
            else if (typeof c === 'object' && c.name) out.country = c.name;
          }
          if (!out.height_cm) {
            const h = it.height || it.bodyHeight || it['schema:height'];
            if (typeof h === 'string') {
              const mH = h.match(/(\d+(?:\.\d+)?)\s*cm/i);
              if (mH) out.height_cm = mH[1];
            } else if (typeof h === 'number') {
              out.height_cm = String(h);
            }
          }
        }
      } catch {}
    }

    // Try very simple data- attributes (if you control template)
    const dataName = html.match(/data-talent-name=["']([^"']+)["']/i);
    if (dataName && !out.name) out.name = dataName[1];

    const dataCountry = html.match(/data-talent-country=["']([^"']+)["']/i);
    if (dataCountry && !out.country) out.country = dataCountry[1];

    const dataHeight = html.match(/data-talent-height=["']([^"']+)["']/i);
    if (dataHeight && !out.height_cm) out.height_cm = dataHeight[1];

    // requested media link if present as a known anchor
    const reqMedia = html.match(/href=["']([^"']+)["'][^>]*>(?:Requested|Request|Upload)[^<]*<\/a>/i);
    if (reqMedia) out.requested_media_url = new URL(reqMedia[1], url).toString();

    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(out));
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ name: '', image: '', height_cm: '', country: '' }));
  }
}
