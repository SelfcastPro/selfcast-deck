export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x'); // dummy base for parsing
    const id = url.searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const API_BASE = process.env.SELFCAST_API_BASE;
    const API_KEY  = process.env.SELFCAST_API_KEY;
    if (!API_BASE || !API_KEY) {
      return res.status(500).json({ error: 'Server missing API config' });
    }

    // Kald dit interne API (tilpas stien hvis nødvendig)
    const resp = await fetch(`${API_BASE}/talents/${id}`, {
      headers: { 'x-api-key': API_KEY }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'Upstream error', detail: text });
    }

    const t = await resp.json();

    // Normaliser til det format vores view forventer
    const normalized = {
      id: t.id || id,
      name: t.name || t.full_name || 'Unnamed',
      primary_image: (t.best_image && t.best_image.url) || t.picture || '',
      // vi holder os til ét billede lige nu
      gallery: [],
      profile_url: t.profile_url || t.link || `https://producer.selfcast.com/talent/${id}`,
      requested_media_url: t.requested_media_url || ''
    };

    res.status(200).json(normalized);
  } catch (e) {
    console.error('api/talent error', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
