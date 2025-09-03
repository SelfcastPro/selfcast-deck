// /view-talent/app.js — print-safe (Chrome & Safari)
(function(){
  function dataFromUrl(){
    const u = new URL(location.href);
    const raw = u.searchParams.get('data');
    if (u.searchParams.get('compact') === '1') document.body.classList.add('compact');
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
    catch(e){ console.error('data parse error', e); return null; }
  }
  function el(t,c,h){const n=document.createElement(t); if(c) n.className=c; if(h!==undefined) n.innerHTML=h; return n;}

  const data = dataFromUrl();
  const root = document.getElementById('root');
  const deckTitle = document.getElementById('deckTitle');
  const cName = document.getElementById('cName');
  const cEmail= document.getElementById('cEmail');
  const cPhone= document.getElementById('cPhone');

  if (!data){
    root.innerHTML = '<p style="padding:18px">No data provided.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href=`mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    (data.talents||[]).forEach(t=>{
      const card = el('article','card');
      const img = el('div','hero'); img.style.backgroundImage = `url('${t.primary_image||''}')`; card.appendChild(img);
      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));
      const links = el('div','links');
      if (t.profile_url){ const a=el('a','a','<span class="ico">🔗</span> Profile'); a.href=t.profile_url; a.target="_blank"; links.appendChild(a); }
      if (t.requested_media_url){ const a2=el('a','a','<span class="ico">🔗</span> Requested'); a2.href=t.requested_media_url; a2.target="_blank"; links.appendChild(a2); }
      body.appendChild(links); card.appendChild(body); root.appendChild(card);
    });
  }

  // Auto-print when &print=1
  const params = new URLSearchParams(location.search);
  if (params.get('print') === '1') {
    // wait a tick for layout
    setTimeout(()=>window.print(), 600);
  }

  // Allow the builder to trigger print via postMessage (kept for backwards compat)
  window.addEventListener('message', ev => {
    if (ev.data?.type === 'print') window.print();
  });
})();
