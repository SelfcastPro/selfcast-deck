// VIEW v1.0.4 — 3-per-row talent grid, Bitly copy, + builder print listener
(function(){
  const VERSION = 'v1.0.4';

  function readData(){
    const u = new URL(location.href);
    const raw = u.searchParams.get('data');
    const demo = u.searchParams.get('demo');
    if (demo) return demoDeck();
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch(e){ console.error('data parse error', e); return null; }
  }

  function demoDeck(){
    const talents = [];
    for (let i=1;i<=12;i++){
      talents.push({
        name:`Talent ${i}`,
        country:['Denmark','Sweden','Norway','Finland'][i%4],
        primary_image:`https://picsum.photos/seed/t${i}/600/750`,
        profile_url:'https://producer.selfcast.com/talent/demo',
        requested_media_url:'https://producer.selfcast.com/talent/demo/requested'
      });
    }
    return {
      title: 'Demo Project',
      owner: { name:'Selfcast', email:'info@selfcast.com', phone:'+45 22 81 31 13' },
      talents
    };
  }

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  const data = readData();
  const root = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const ownerName = document.getElementById('ownerName');
  const ownerEmail = document.getElementById('ownerEmail');
  const ownerPhone = document.getElementById('ownerPhone');

  if (!data){
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  ownerName.textContent  = data.owner.name;
    if (data.owner?.email){ownerEmail.textContent = data.owner.email; ownerEmail.href = `mailto:${data.owner.email}`;}
    if (data.owner?.phone) ownerPhone.textContent = data.owner.phone;

    (data.talents || []).forEach(t => {
      const card = el('article', 'card');

      const img = el('div','hero');
      img.style.backgroundImage = `url('${t.primary_image || ''}')`;
      card.appendChild(img);

      const body = el('div','body');
      body.appendChild(el('h3','', (t.name || 'Unnamed')));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url) {
        const a = el('a','a','Profile'); a.target='_blank'; a.href=t.profile_url; links.appendChild(a);
      }
      if (t.requested_media_url) {
        const a2 = el('a','a','Requested photos/videos'); a2.target='_blank'; a2.href=t.requested_media_url; links.appendChild(a2);
      }
      body.appendChild(links);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // Buttons in the view
  document.getElementById('btnPdf').addEventListener('click', () => window.print());

  document.getElementById('btnShare').addEventListener('click', async () => {
    const longUrl = location.href;
    try {
      const r = await fetch('/api/bitly', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ long_url: longUrl })
      });
      const j = await r.json();
      const short = r.ok && j.link ? j.link : longUrl;
      await navigator.clipboard.writeText(short);
      alert('Link copied:\n' + short);
    } catch {
      try { await navigator.clipboard.writeText(longUrl); alert('Link copied:\n' + longUrl); }
      catch { alert('Here is the link:\n' + longUrl); }
    }
  });

  // 🔧 IMPORTANT: listen for the builder's Export PDF
  window.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'print') window.print();
  });

  console.log('VIEW loaded', VERSION);
})();
