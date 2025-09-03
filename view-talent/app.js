// view-talent/app.js — v1.2.5 (STABLE, Chrome/Safari print-safe)

(function(){
  const qs = new URLSearchParams(location.search);
  const get = (k, def=null) => qs.has(k) ? qs.get(k) : def;

  function decodeDataParam(){
    const raw = get('data', null);
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch(e){ console.error('data parse error', e); return null; }
  }

  function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className=cls; if(html!==undefined) n.innerHTML=html; return n; }
  function a(href, text){ const x=document.createElement('a'); x.className='a'; x.href=href||'#'; x.target='_blank'; x.rel='noopener'; x.textContent=text; return x; }

  // Header
  let bar = document.querySelector('.bar');
  const deckTitle = bar.querySelector('#deckTitle');
  const cName  = bar.querySelector('#cName');
  const cEmail = bar.querySelector('#cEmail');
  const cPhone = bar.querySelector('#cPhone');

  let root = document.getElementById('root');
  if (!root){ root = el('section','grid'); root.id='root'; document.body.appendChild(root); }

  // Layout flags
  const density = get('density', '12'); // default 12 (3×4)
  if (density === '12') document.body.classList.add('d12');
  else if (density === '15') document.body.classList.add('d15');
  if (get('cols') === '4') document.body.classList.add('cols4');
  if (get('compact') === '1') document.body.classList.add('compact');

  // Data
  const data = (() => {
    if (get('demo')){
      const talents=[]; for(let i=1;i<=12;i++) talents.push({
        id:`demo-${i}`, name:`Talent ${i}`, country:['Denmark','Sweden','Norway','Finland'][i%4],
        primary_image:`https://picsum.photos/seed/t${i}/600/800`, profile_url:'#', requested_media_url:'#'
      });
      return { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents };
    }
    return decodeDataParam();
  })();

  function render(){
    if (!data){ root.innerHTML = '<p style="padding:18px;opacity:.7">No data provided.</p>'; return; }
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href=`mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    root.innerHTML = '';
    (data.talents || []).forEach(t=>{
      const card = el('article','card');
      const hero = el('div','hero');
      const img  = document.createElement('img');
      img.alt = t.name || 'Talent'; img.loading='eager'; img.decoding='sync';
      img.src = t.primary_image || '';
      hero.appendChild(img); card.appendChild(hero);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));
      const links = el('div','links');
      if (t.profile_url) links.appendChild(a(t.profile_url, 'Profile'));
      if (t.requested_media_url) links.appendChild(a(t.requested_media_url, 'Requested'));
      body.appendChild(links); card.appendChild(body);
      root.appendChild(card);
    });
  }

  function waitForImages(){
    const imgs = Array.from(document.images || []);
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res=>{
      img.addEventListener('load', res, {once:true});
      img.addEventListener('error', res, {once:true});
    })));
  }
  async function doPrintFlow(){
    try { await document.fonts?.ready; } catch {}
    await waitForImages();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r,120)));
    window.print();
  }

  render();

  if (get('print') === '1') doPrintFlow();
  window.addEventListener('message', ev => { if (ev?.data?.type === 'print') doPrintFlow(); });

  // Local "Download PDF" button on the view page (optional)
  document.getElementById('btnPdf')?.addEventListener('click', (e)=>{ e.preventDefault(); doPrintFlow(); });
})();
