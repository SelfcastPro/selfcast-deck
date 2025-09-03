// /api/bitly.js
// Simple Bitly proxy. Requires env BITLY_TOKEN (a Generic Access Token).
export default async function handler(req, res) {
  try {
    // allow both POST { long_url } and GET ?u=
    const isPost = req.method === 'POST';
    const long_url = isPost
      ? (await req.json?.()?.long_url) || (await (async () => { try { return (await req.json()).long_url; } catch { return null; } })())
      : new URL(req.url, 'http://x').searchParams.get('u');

    if (!long_url) return res.status(400).json({ error: 'Missing long_url' });

    const token = process.env.BITLY_TOKEN;
    if (!token) {
      // No token configured — just return the original so UI still works.
      return res.status(200).json({ link: long_url, note: 'BITLY_TOKEN missing' });
    }

    const r = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ long_url })
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.link) {
      // Fall back gracefully
      return res.status(200).json({ link: long_url, note: j?.message || 'shorten-failed' });
    }

    return res.status(200).json({ link: j.link });
  } catch (e) {
    return res.status(200).json({ link: (new URL(req.url, 'http://x')).searchParams.get('u') || '', note: 'exception' });
  }
}
