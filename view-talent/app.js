// VIEW v1.2.9 — streamlined single-grid render with density classes and coordinated print flow.

(function(){
  /* ---------- helpers ---------- */
  const qs = (sel, el=document)=>el.querySelector(sel);
  const qsa = (sel, el=document)=>Array.from(el.querySelectorAll(sel));
  const el = (tag, cls, html)=>{ const node=document.createElement(tag); if(cls) node.className=cls; if(html!=null) node.innerHTML=html; return node; };

  function applyDensityClass(density){
    document.body.classList.remove('d9','d12','d15');
    const normalized = density===12 ? 12 : density===15 ? 15 : 9;
    document.body.classList.add(`d${normalized}`);
    return normalized;
  }

  function dataFromUrl(){
    const url = new URL(location.href);
    const densityParam = parseInt(url.searchParams.get('density')||'9', 10);
    const density = applyDensityClass(densityParam);

    if (url.searchParams.get('compact') === '1') document.body.classList.add('compact');

    if (url.searchParams.get('demo')){
      const talents=[];
      for(let i=1;i<=18;i++){
        talents.push({
          name:`Talent ${i}`,
          country:['Denmark','Sweden','Norway','Finland'][i%4],
          primary_image:`https://picsum.photos/seed/t${i}/900/1200`,
          profile_url:'#',
          requested_media_url:'#'
        });
      }
      return {
        title:'Demo Project',
        owner:{ name:'Selfcast', email:'info@selfcast.com', phone:'+45 22 81 31 13' },
        talents,
        density
      };
    }

    const raw = url.searchParams.get('data');
    if (!raw) return null;
    let parsed=null;
    try {
      parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (err) {
      console.error('Failed to parse data payload', err);
    }
    if (!parsed) return null;
    parsed.density = density;
    return parsed;
  }

  /* ---------- render helpers ---------- */
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

  function cardNode(talent){
    const card = el('article','card');

    const hero = el('div','hero');
    const img  = el('img');
    img.loading = 'eager';
    img.decoding = 'sync';
    img.src = talent.primary_image || '';
    hero.appendChild(img);
    card.appendChild(hero);

    const body = el('div','body');
    body.appendChild(el('h3','', talent.name || 'Unnamed'));
    if (talent.country) body.appendChild(el('p','sub', talent.country));

    const links = el('div','links');
    if (talent.profile_url){
      const a=el('a','a','Profile');
      a.href = talent.profile_url;
      a.target = '_blank';
      links.appendChild(a);
    }
    if (talent.requested_media_url){
      const b=el('a','a','Requested');
      b.href = talent.requested_media_url;
      b.target = '_blank';
      links.appendChild(b);
    }
    body.appendChild(links);
    card.appendChild(body);

    return card;
  }

  function render(data){
    const root = qs('#root');
    if (!root) return;
    root.innerHTML = '';

    qs('#deckTitle').textContent = data.title || 'Untitled';

    const contactLine = qs('#contactLine');
    if (contactLine){
      contactLine.innerHTML = '';
      const pieces = contactItems(data.owner);
      if (!pieces.length){
        contactLine.style.display = 'none';
      } else {
        contactLine.style.display = '';
        pieces.forEach((item, idx)=>{
          if (idx>0) contactLine.appendChild(document.createTextNode(' · '));
          if (item.type==='link'){
            const a=document.createElement('a');
            a.href = item.href;
            a.textContent = item.value;
            contactLine.appendChild(a);
          } else {
            const span=document.createElement('span');
            span.textContent = item.value;
            contactLine.appendChild(span);
          }
        });
      }
    }

    (data.talents||[]).forEach(t=> root.appendChild(cardNode(t)));
  }

  /* ---------- print readiness ---------- */
  function waitForReady(){
    const images = qsa('img');
    const promises = images.map(img => img.complete ? Promise.resolve() :
      new Promise(res => {
        img.addEventListener('load', res, {once:true});
        img.addEventListener('error', res, {once:true});
      })
    );
    if (document.fonts && document.fonts.ready){
      promises.push(document.fonts.ready.catch(()=>{}));
    }
    return Promise.all(promises);
  }

  async function doPrintFlow(){
    await waitForReady();
    requestAnimationFrame(()=> setTimeout(()=>window.print(), 60));
  }

  /* ---------- init ---------- */
  const data = dataFromUrl();
  const root = qs('#root');

  if (!data || !Array.isArray(data.talents) || !data.talents.length){
    if (root) root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    render(data);
  }

  const url = new URL(location.href);
  const autoPrint = url.searchParams.get('print') === '1';

  /* ---------- event wiring ---------- */
  qs('#btnPdf')?.addEventListener('click', (ev)=>{ ev.preventDefault(); doPrintFlow(); });
  window.addEventListener('message', ev => { if (ev.data?.type === 'print') doPrintFlow(); });

  if (autoPrint) doPrintFlow();
})();
