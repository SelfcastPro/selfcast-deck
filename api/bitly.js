export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
    const { long_url } = req.body || {};
    if (!long_url) return res.status(400).json({error:'Missing long_url'});

    const token = process.env.BITLY_TOKEN;
    if (!token) return res.status(500).json({error:'Missing BITLY_TOKEN env'});

    const resp = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method:'POST',
      headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ long_url })
    });
    const json = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(json);
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({error:'Bitly proxy error', detail:String(e)});
  }
}
