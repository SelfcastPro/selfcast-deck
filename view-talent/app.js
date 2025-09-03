// VIEW v1.2.0 — no share/download UI inside preview; prints on builder request
(function(){
  function dataFromUrl(){
    const u = new URL(location.href);
    if (u.searchParams.get('compact') === '1') document.body.classList.add('compact');
    if (u.searchParams.get('demo')){
      const talents=[]; for(let i=1;i<=12;i++) talents.push({
        name:`Talent ${i}`, country:['Denmark','Sweden','Norway','Finland'][i%4],
        primary_image:`https://picsum.photos/seed/t${i}/600/750`,
        profile_url:'#', requested_media_url:'#'
      });
      return { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents };
    }
    const raw = u.searchParams.get('data'); if (!raw) return null;
    try{ return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
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
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href=`mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    (data.talents||[]).forEach(t=>{
      const card = el('article','card');

      const img = el('div','hero');
      img.style.backgroundImage = `url('${t.primary_image||''}')`;
      card.appendChild(img);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url){ const a=el('a','a','Profile'); a.href=t.profile_url; a.target="_blank"; links.appendChild(a); }
      if (t.requested_media_url){ const a2=el('a','a','Requested'); a2.href=t.requested_media_url; a2.target="_blank"; links.appendChild(a2); }
      body.appendChild(links);

      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // Print triggered from builder
  window.addEventListener('message', ev => { if (ev?.data?.type === 'print') window.print(); });
})();
