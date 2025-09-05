// VIEW v1.2.6 — Chrome-safe printing + density support (9/12/15 per page)
(function(){
  // ---------- helpers ----------
  function readData(){
    const u = new URL(location.href);
    const d = u.searchParams.get('density');
    if (d === '12') document.body.classList.add('d12');
    else if (d === '15') document.body.classList.add('d15');

    if (u.searchParams.get('demo') === '1'){
      const talents=[]; for(let i=1;i<=12;i++) talents.push({
        name:`Talent ${i}`, country:['Denmark','Sweden','Norway','Finland'][i%4],
        primary_image:`https://picsum.photos/seed/t${i}/600/750`,
        profile_url:'#', requested_media_url:'#'
      });
      return { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents };
    }
    const raw = u.searchParams.get('data');
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch(e){ console.error('data parse error', e); return null; }
  }
  const el = (t,c,h)=>{ const n=document.createElement(t); if(c) n.className=c; if(h!==undefined) n.innerHTML=h; return n; };

  // ---------- render ----------
  const data = readData();
  const root = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const cName = document.getElementById('cName');
  const cEmail= document.getElementById('cEmail');
  const cPhone= document.getElementById('cPhone');

  if (!data){
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href=`mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    (data.talents||[]).forEach(t=>{
      const card = el('article','card');

      const hero = el('div','hero');
      const img  = new Image();
      img.decoding = 'sync';
      img.loading  = 'eager';
      img.src = t.primary_image || '';
      hero.appendChild(img);
      card.appendChild(hero);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));   // <- Country visible
      const links = el('div','links');
      if (t.profile_url){ const a=el('a','a','Profile'); a.href=t.profile_url; a.target="_blank"; links.appendChild(a); }
      if (t.requested_media_url){ const a2=el('a','a','Requested'); a2.href=t.requested_media_url; a2.target="_blank"; links.appendChild(a2); }
      body.appendChild(links);

      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // ---------- print flow (Chrome-safe) ----------
  async function doPrintFlow(){
    try{
      // 1) wait fonts
      await (document.fonts?.ready || Promise.resolve());

      // 2) wait images
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map(im => im.complete ? Promise.resolve()
        : new Promise((res,rej)=>{ im.addEventListener('load',res,{once:true}); im.addEventListener('error',res,{once:true}); })));

      // 3) give layout one more frame
      await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));

      window.print();
    }catch(e){
      console.error('print error', e);
      window.print(); // last resort
    }
  }

  document.getElementById('btnPdf')?.addEventListener('click', (e)=>{ e.preventDefault(); doPrintFlow(); });
  // Allow builder iframe to trigger print
  window.addEventListener('message', ev => { if (ev.data?.type === 'print') doPrintFlow(); });

  // Optional auto-print if URL has &print=1
  if (new URL(location.href).searchParams.get('print') === '1'){
    setTimeout(doPrintFlow, 150);
  }
})();
