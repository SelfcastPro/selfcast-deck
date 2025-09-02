// Parse ?data= (base64 JSON) and render grid (3 per row, 12 per page).
(function(){
  function readData(){
    const raw = new URL(location.href).searchParams.get('data');
    if(!raw) return null;
    try{ return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch(e){ console.error('data parse error', e); return null; }
  }
  function el(tag, cls, html){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(html !== undefined) n.innerHTML = html;
    return n;
  }

  const data = readData();
  const root = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const ownerName = document.getElementById('ownerName');
  const ownerEmail = document.getElementById('ownerEmail');
  const ownerPhone = document.getElementById('ownerPhone');

  if(!data){
    root.innerHTML = '<p style="padding:18px">No data provided.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name) ownerName.textContent = data.owner.name;
    if (data.owner?.email){ ownerEmail.textContent = data.owner.email; ownerEmail.href = `mailto:${data.owner.email}`; }
    if (data.owner?.phone) ownerPhone.textContent = data.owner.phone;

    (data.talents || []).forEach(t => {
      const card = el('article', 'card');

      const img = el('div','hero');
      img.style.backgroundImage = `url('${t.primary_image || ''}')`;
      card.appendChild(img);

      const body = el('div','body');
      const country = t.country ? ` · ${t.country}` : '';
      body.appendChild(el('h3','', (t.name || 'Unnamed')));
      body.appendChild(el('p','sub', (t.country ? t.country : '').toString()));

      const links = el('div','links');
      if (t.profile_url) {
        const a = el('a','a'); a.textContent = 'Profile'; a.target = '_blank'; a.href = t.profile_url; links.appendChild(a);
      }
      if (t.requested_media_url) {
        const a2 = el('a','a'); a2.textContent = 'Requested photos/videos'; a2.target = '_blank'; a2.href = t.requested_media_url; links.appendChild(a2);
      }
      body.appendChild(links);
      card.appendChild(body);

      root.appendChild(card);
    });
  }

  // Buttons
  document.getElementById('btnPdf').addEventListener('click', () => window.print());

  document.getElementById('btnShare').addEventListener('click', async () => {
    const longUrl = location.href;
    try {
      const r = await fetch('/api/bitly', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ long_url: longUrl })
      });
      if (!r.ok) throw new Error('bitly failed');
      const j = await r.json();
      const short = j.link || longUrl;
      await navigator.clipboard.writeText(short);
      alert('Short link copied:\n' + short);
    } catch {
      try {
        await navigator.clipboard.writeText(longUrl);
        alert('Copied link:\n' + longUrl);
      } catch {
        alert('Here is the link:\n' + longUrl);
      }
    }
  });
})();
