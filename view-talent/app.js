// VIEW v1.3.0 — stable Chrome/Safari print with white pages, repeated header per page,
// fixed-per-page counts (default 9), top-cropped grayscale images, and country displayed.

(function(){
  /* ---------- helpers ---------- */
  const qs = (sel, el=document)=>el.querySelector(sel);
  const qsa = (sel, el=document)=>Array.from(el.querySelectorAll(sel));
  const el = (t, cls, html)=>{ const n=document.createElement(t); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; };

  function dataFromUrl(){
    const u = new URL(location.href);
    // optional compact on screen
    if (u.searchParams.get('compact') === '1') document.body.classList.add('compact');
    // optional densities (9 default)
    const density = parseInt(u.searchParams.get('density')||'9',10);
    document.body.classList.toggle('d12', density===12);
    document.body.classList.toggle('d15', density===15);
    // demo?
    if (u.searchParams.get('demo')){
      const talents=[]; for(let i=1;i<=18;i++) talents.push({
        name:`Talent ${i}`, country:['Denmark','Sweden','Norway','Finland'][i%4],
        primary_image:`https://picsum.photos/seed/t${i}/900/1200`,
        profile_url:'#', requested_media_url:'#'
      });
      return { title:'Demo Project', owner:{name:'Selfcast',email:'info@selfcast.com',phone:'+45 22 81 31 13'}, talents, density };
    }
     const raw = u.searchParams.get('data'); if (!raw) return null;
    let parsed=null; try{ parsed = JSON.parse(decodeURIComponent(escape(atob(raw)))); }catch(e){ console.error('data parse error', e); }
    if (!parsed) return null;
    parsed.density = density;
    return parsed;
  }

  /* ---------- render cards (shared) ---------- */
  function cardNode(t){
    const card = el('article','card');
    const hero = el('div','hero');
    const img  = el('img'); img.loading = 'eager'; img.decoding='sync';
    img.src = t.primary_image || '';
    hero.appendChild(img); card.appendChild(hero);

    const body = el('div','body');
    body.appendChild(el('h3','', t.name || 'Unnamed'));
    if (t.country) body.appendChild(el('p','sub', t.country));
    const links = el('div','links');
    if (t.profile_url){ const a=el('a','a','Profile'); a.href=t.profile_url; a.target='_blank'; links.appendChild(a); }
    if (t.requested_media_url){ const b=el('a','a','Requested'); b.href=t.requested_media_url; b.target='_blank'; links.appendChild(b); }
    body.appendChild(links); card.appendChild(body);
    return card;
  }

  function contactItems(owner){
    if (!owner) return [];
    const items = [];
    const normalize = (value)=>{
      if (typeof value === 'string'){
        const trimmed = value.trim();
        return trimmed ? trimmed : '';
      }
      return value;
    };
    const name = normalize(owner.name);
    if (name) items.push({type:'text', value:name});
    const email = normalize(owner.email);
    if (email) items.push({type:'link', value:email, href:`mailto:${email}`});
    const phone = normalize(owner.phone);
    if (phone) items.push({type:'text', value:phone});
    return items;
  }

  /* ---------- screen render ---------- */
  function renderScreen(data){
    const root = qs('#root'); root.innerHTML = '';
    qs('#deckTitle').textContent = data.title || 'Untitled';
    const contactLine = qs('#contactLine');
    if (contactLine){
      contactLine.innerHTML='';
      const items = contactItems(data.owner);
      if (!items.length){
        contactLine.style.display='none';
      } else {
        contactLine.style.display='';
        items.forEach((item, idx)=>{
          if (idx>0) contactLine.appendChild(document.createTextNode(' · '));
          if (item.type==='link'){
            const a=document.createElement('a');
            a.href=item.href;
            a.textContent=item.value;
            contactLine.appendChild(a);
          } else {
            const span=document.createElement('span');
            span.textContent=item.value;
            contactLine.appendChild(span);
          }
        });
      }
    }

    (data.talents||[]).forEach(t=> root.appendChild(cardNode(t)));
  }

  /* ---------- print render: chunk into pages with header each page ---------- */
  function chunk(arr, size){
    const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i, i+size)); return out;
  }

  function renderPrint(data){
    const perPage = (data.density===12||data.density===15) ? data.density : 9;
    const pages = chunk(data.talents||[], perPage);
    const pr = qs('#printRoot'); pr.innerHTML='';

    pages.forEach((items, idx)=>{
      const page = el('section','print-page');

      const header = el('div','print-header');
      const left = el('div','ph-left', `<h1>${data.title || 'Untitled'}</h1>`);
      const contactPieces = contactItems(data.owner).map(item =>
        item.type==='link' ? `<a href="${item.href}">${item.value}</a>` : `<span>${item.value}</span>`      );
      const contactHtml = contactPieces.length ? `<div class="ph-contact">${contactPieces.join(' · ')}</div>` : '';
      const right = el('div','ph-right',
        `<div class="ph-brand"><div class="ph-word">SELFCAST</div><div class="ph-tag">CASTING MADE EASY</div></div>
         ${contactHtml}`);
      header.append(left, right);
      page.appendChild(header);

      const grid = el('div','print-grid');
      items.forEach(t=> grid.appendChild(cardNode(t)));
      page.appendChild(grid);

      pr.appendChild(page);
    });
  }

  /* ---------- image+font ready before print ---------- */
  function waitForReady(){
    const imgs = qsa('img');
    const ps = imgs.map(img => img.complete ? Promise.resolve() :
      new Promise(res => { img.addEventListener('load', ()=>res(), {once:true}); img.addEventListener('error', ()=>res(), {once:true}); })
    );
    ps.push(document.fonts ? document.fonts.ready.catch(()=>{}) : Promise.resolve());
    return Promise.all(ps);
  }

  async function doPrintFlow(){
    await waitForReady();
    // small delay so Chrome paginates reliably
    requestAnimationFrame(()=> setTimeout(()=>window.print(), 60));
  }

  /* ---------- buttons & postMessage ---------- */
  qs('#btnPdf')?.addEventListener('click', (e)=>{ e.preventDefault(); doPrintFlow(); });
  window.addEventListener('message', ev => { if (ev.data?.type === 'print') doPrintFlow(); });

  /* ---------- boot ---------- */
  const data = dataFromUrl();
  const root = qs('#root');

  if (!data || !Array.isArray(data.talents) || !data.talents.length){
    // screen fallback
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    renderScreen(data);
    renderPrint(data);
  }
})();
