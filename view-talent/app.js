// view-talent/app.js — v1.2.3
// - Robust print i Chrome/Safari (venter på billeder + fonde)
// - Understøtter ?density=9|12|15 + ?compact=1 + ?print=1
// - Viser kort med <img> (print-sikkert) + sort/hvid via CSS
// - Lytter på postMessage({type:'print'}) fra builder

(function(){
  // ---------- utils ----------
  const qs = new URLSearchParams(location.search);
  const get = (k, def=null) => qs.has(k) ? qs.get(k) : def;

  function decodeDataParam(){
    const raw = get('data', null);
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (e){
      console.error('data parse error', e);
      return null;
    }
  }

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function a(href, text){
    const x = document.createElement('a');
    x.className = 'a';
    x.href = href || '#';
    x.target = '_blank';
    x.rel = 'noopener';
    x.textContent = text;
    return x;
  }

  // ---------- DOM roots ----------
  // Hvis din index.html allerede har .bar + #root, bruger vi dem,
  // ellers opretter vi dem.
  let bar = document.querySelector('.bar');
  if (!bar){
    bar = el('header','bar');
    bar.innerHTML = `
      <div class="bar-left"><h1 id="deckTitle">Untitled</h1></div>
      <div class="bar-right">
        <div class="brandline"><div class="wordmark">SELFCAST</div><div class="tagline">CASTING MADE EASY</div></div>
        <div class="contactline"><span id="cName">Selfcast</span> · <a id="cEmail" href="mailto:info@selfcast.com">info@selfcast.com</a> · <span id="cPhone">+45 22 81 31 13</span></div>
      </div>`;
    document.body.prepend(bar);
  }
  const deckTitle = bar.querySelector('#deckTitle');
  const cName  = bar.querySelector('#cName');
  const cEmail = bar.querySelector('#cEmail');
  const cPhone = bar.querySelector('#cPhone');

  let root = document.getElementById('root');
  if (!root){
    root = el('section','grid');
    root.id = 'root';
    document.body.appendChild(root);
  }

  // ---------- density/compact ----------
  const density = get('density', '9'); // "9", "12", "15"
  if (density === '12') document.body.classList.add('d12');
  else if (density === '15') document.body.classList.add('d15');
  // ellers default 9 pr. side (ingen klasse)
  if (get('compact') === '1') document.body.classList.add('compact');

  // ---------- data ----------
  const data = (() => {
    if (get('demo')) {
      const talents = [];
      for (let i=1;i<=12;i++){
        talents.push({
          id:`demo-${i}`,
          name:`Talent ${i}`,
          country:['Denmark','Sweden','Norway','Finland'][i%4],
          primary_image:`https://picsum.photos/seed/t${i}/600/800`,
          profile_url:'#',
          requested_media_url:'#'
        });
      }
      return {
        title:'Demo Project',
        owner:{ name:'Selfcast', email:'info@selfcast.com', phone:'+45 22 81 31 13' },
        talents
      };
    }
    return decodeDataParam();
  })();

  // ---------- render ----------
  function render(){
    if (!data){
      deckTitle.textContent = 'Untitled';
      root.innerHTML = '<p style="padding:18px;opacity:.7">No data provided.</p>';
      return;
    }
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name) cName.textContent = data.owner.name;
    if (data.owner?.email){ cEmail.textContent = data.owner.email; cEmail.href = `mailto:${data.owner.email}`; }
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    root.innerHTML = '';
    (data.talents || []).forEach(t => {
      const card = el('article','card');

      // PRINT-SAFE HERO: brug <img> i stedet for CSS baggrund
      const hero = el('div','hero');
      const img  = document.createElement('img');
      img.alt = t.name || 'Talent';
      img.loading = 'eager';
      img.decoding = 'sync';
      img.src = t.primary_image || '';
      hero.appendChild(img);
      card.appendChild(hero);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url)   links.appendChild(a(t.profile_url,'Profile'));
      if (t.requested_media_url) links.appendChild(a(t.requested_media_url,'Requested'));
      body.appendChild(links);

      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // ---------- print helpers ----------
  function waitForImages(){
    const imgs = Array.from(document.images || []);
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(res => {
        img.addEventListener('load', res, {once:true});
        img.addEventListener('error', res, {once:true});
      });
    }));
  }

  async function doPrintFlow(){
    try { await document.fonts?.ready; } catch {}
    await waitForImages();
    // Chrome kan stadig race; giv et ekstra frame + lille delay
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 120)));
    window.print();
  }

  // ---------- init ----------
  render();

  // Auto-print hvis ?print=1
  if (get('print') === '1') { doPrintFlow(); }

  // Print on message fra builder
  window.addEventListener('message', ev => {
    if (ev?.data?.type === 'print') doPrintFlow();
  });
})();
