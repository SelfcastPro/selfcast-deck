export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { long_url } = await req.json?.() || await new Promise(r => {
      let body=''; req.on('data', c => body += c);
      req.on('end', () => r(JSON.parse(body||'{}')));
    });

    const token = process.env.BITLY_TOKEN;
    if (!token) return res.status(200).json({ link: long_url });

    const resp = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url })
    });
    const j = await resp.json();
    if (!resp.ok) return res.status(200).json({ link: long_url });
    return res.status(200).json({ link: j.link || long_url });
  } catch (e) {
    return res.status(200).json({ link: long_url });
  }
}
