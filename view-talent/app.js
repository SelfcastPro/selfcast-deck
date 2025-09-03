// VIEW v1.1.0 — elegant print layout, robust copy, listens to builder print
(function(){
  function decodeDataParam() {
    const u = new URL(location.href);
    if (u.searchParams.get('demo')) return demoDeck();
    const raw = u.searchParams.get('data');
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch (e) { console.error('data parse error', e); return null; }
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
    return { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents };
  }

  function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className=cls; if(html!==undefined) n.innerHTML=html; return n; }

  const data = decodeDataParam();
  const root = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const cName   = document.getElementById('cName');
  const cEmail  = document.getElementById('cEmail');
  const cPhone  = document.getElementById('cPhone');

  if (!data){
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href=`mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    for (const t of (data.talents || [])){
      const card = el('article','card');

      const img = el('div','hero');
      img.style.backgroundImage = `url('${t.primary_image || ''}')`;
      card.appendChild(img);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url){
        const a = el('a','a','Profile'); a.href=t.profile_url; a.target='_blank'; links.appendChild(a);
      }
      if (t.requested_media_url){
        const a2 = el('a','a','Requested photos/videos'); a2.href=t.requested_media_url; a2.target='_blank'; links.appendChild(a2);
      }
      body.appendChild(links);
      card.appendChild(body);
      root.appendChild(card);
    }
  }

  // Screen actions
  document.getElementById('btnPdf').addEventListener('click', () => window.print());

  document.getElementById('btnShare').addEventListener('click', async () => {
    const longUrl = location.href;
    let toCopy = longUrl;

    // Try Bitly (if /api/bitly + env configured)
    try {
      const r = await fetch('/api/bitly', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ long_url: longUrl })
      });
      if (r.ok){
        const j = await r.json();
        if (j.link) toCopy = j.link;
      }
    } catch {}

    // Robust clipboard copy (with fallback)
    try {
      await navigator.clipboard.writeText(toCopy);
      alert('Link copied:\n' + toCopy);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = toCopy; document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); alert('Link copied:\n' + toCopy); }
      catch { alert('Here is the link:\n' + toCopy); }
      document.body.removeChild(ta);
    }
  });

  // Receive "print" from builder (Export PDF)
  window.addEventListener('message', ev => {
    if (ev?.data?.type === 'print') window.print();
  });
})();
