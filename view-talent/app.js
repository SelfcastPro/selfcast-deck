// view-talent/app.js — VIEW v1.4.0
// - Uses <img> for hero (prints in Chrome)
// - Waits for all images (or timeout) before auto print
// - Fallback overlay if auto print is ignored
// - "Copy link" shortens via /api/bitly (fallback to long URL)
// - ?density=9|12|15  ·  ?compact=1  ·  ?print=1  ·  ?demo=1
(function(){
  function readData() {
    const u = new URL(location.href);
    const params = {
      demo: u.searchParams.get('demo'),
      compact: u.searchParams.get('compact') === '1',
      print: u.searchParams.get('print') === '1',
      density: parseInt(u.searchParams.get('density') || '9', 10)
    };
    if (params.compact) document.body.classList.add('compact');
    if ([12,15].includes(params.density)) document.body.classList.add('d'+params.density);

    if (params.demo) {
      const talents = [];
      for (let i = 1; i <= 12; i++) {
        talents.push({
          name: `Talent ${i}`,
          country: ['Denmark','Sweden','Norway','Finland'][i%4],
          primary_image: `https://picsum.photos/seed/t${i}/600/750`,
          profile_url: '#',
          requested_media_url: '#'
        });
      }
      return { data: { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents }, params };
    }

    const raw = u.searchParams.get('data');
    if (!raw) return { data: null, params };
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
      return { data, params };
    } catch (e) {
      console.error('data parse error', e);
      return { data: null, params };
    }
  }

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  const { data, params } = readData();
  const root      = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const cName  = document.getElementById('cName');
  const cEmail = document.getElementById('cEmail');
  const cPhone = document.getElementById('cPhone');

  let imageUrls = [];

  if (!data || !Array.isArray(data.talents)) {
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href = `mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    imageUrls = (data.talents || []).map(t => (t.primary_image||'').trim()).filter(Boolean);

    (data.talents || []).forEach(t => {
      const card = el('article','card');

      const hero = el('div','hero');
      const im = new Image();
      im.loading = 'eager';
      im.decoding = 'sync';
      im.src = t.primary_image || '';
      hero.appendChild(im);
      card.appendChild(hero);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url){
        const a = el('a','a','Profile'); a.href = t.profile_url; a.target='_blank'; links.appendChild(a);
      }
      if (t.requested_media_url){
        const a2 = el('a','a','Requested'); a2.href = t.requested_media_url; a2.target='_blank'; links.appendChild(a2);
      }
      body.appendChild(links);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // Toolbar
  document.getElementById('btnPdf')?.addEventListener('click', () => window.print());

  document.getElementById('btnShare')?.addEventListener('click', async () => {
    const clean = new URL(location.href);
    clean.searchParams.delete('print');
    const longUrl = clean.toString();

    let toCopy = longUrl;
    try {
      const r = await fetch('/api/bitly', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ long_url: longUrl })
      });
      if (r.ok) {
        const j = await r.json();
        if (j.link) toCopy = j.link;
      }
    } catch {}
    try { await navigator.clipboard.writeText(toCopy); alert('Link copied:\n' + toCopy); }
    catch { alert('Link:\n' + toCopy); }
  });

  // Chrome-safe print
  function preloadImages(urls, timeoutMs=5000){
    if (!urls.length) return Promise.resolve();
    const ps = urls.map(src => new Promise(res => {
      const im = new Image();
      im.onload = im.onerror = () => res();
      im.src = src;
    }));
    return Promise.race([Promise.allSettled(ps), new Promise(res=>setTimeout(res, timeoutMs))]);
  }

  function showPrintNudge(){
    const n = document.createElement('div');
    n.id = 'print-nudge';
    n.style.cssText = `
      position:fixed;inset:0;display:grid;place-items:center;z-index:9999;
      background:rgba(0,0,0,.55);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Inter,Roboto,Helvetica,Arial;`;
    n.innerHTML = `
      <div style="background:#141418;border:1px solid #2a2a2f;padding:18px 20px;border-radius:14px;max-width:520px;text-align:center">
        <h2 style="margin:0 0 6px;font-size:20px;font-weight:800">Ready to export</h2>
        <p style="margin:0 0 14px;color:#d0d0d6">If the dialog didn’t open, click below to print.</p>
        <button id="print-now" style="padding:10px 16px;background:#ff2d55;border:0;border-radius:12px;color:#fff;font-weight:800;cursor:pointer">Print PDF</button>
      </div>`;
    document.body.appendChild(n);
    document.getElementById('print-now').onclick = () => { window.print(); n.remove(); };
    window.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='p') n.remove();
    }, { once:true });
  }

  async function autoPrintWhenReady(){
    await preloadImages(imageUrls, 6000);
    let opened=false; try{ window.print(); opened=true; }catch{}
    setTimeout(()=>{ if(!opened) showPrintNudge(); }, 900);
  }

  if (params.print) {
    if (document.readyState === 'complete') autoPrintWhenReady();
    else window.addEventListener('load', autoPrintWhenReady);
  }

  // Legacy “print” message from builder
  window.addEventListener('message', ev => { if (ev.data?.type === 'print') window.print(); });
})();
