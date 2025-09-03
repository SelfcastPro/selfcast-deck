// view-talent/app.js — VIEW v1.2.1
// - ?density=9|12|15 controls how many cards per A4 on print
// - ?print=1 auto window.print() after render
// - ?compact=1 keeps tighter screen look (independent of print density)
// - ?demo=1 for sample data
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

  if (!data || !Array.isArray(data.talents)) {
    root.innerHTML = '<p style="padding:18px">No data provided. Try <code>?demo=1</code>.</p>';
  } else {
    deckTitle.textContent = data.title || 'Untitled';
    if (data.owner?.name)  cName.textContent  = data.owner.name;
    if (data.owner?.email){cEmail.textContent = data.owner.email; cEmail.href = `mailto:${data.owner.email}`;}
    if (data.owner?.phone) cPhone.textContent = data.owner.phone;

    (data.talents || []).forEach(t => {
      const card = el('article','card');

      const img = el('div','hero');
      img.style.backgroundImage = `url('${t.primary_image || ''}')`;
      card.appendChild(img);

      const body = el('div','body');
      body.appendChild(el('h3','', t.name || 'Unnamed'));
      if (t.country) body.appendChild(el('p','sub', t.country));

      const links = el('div','links');
      if (t.profile_url){
        const a = el('a','a','Profile');
        a.href = t.profile_url; a.target = '_blank'; links.appendChild(a);
      }
      if (t.requested_media_url){
        const a2 = el('a','a','Requested');
        a2.href = t.requested_media_url; a2.target = '_blank'; links.appendChild(a2);
      }
      body.appendChild(links);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  // Toolbar (view page)
  document.getElementById('btnPdf')?.addEventListener('click', () => window.print());
  document.getElementById('btnShare')?.addEventListener('click', async () => {
    const toCopy = location.href.replace(/(&|\?)print=1\b/,'$1').replace(/\?&/,'?'); // strip print=1 if present
    try { await navigator.clipboard.writeText(toCopy); alert('Link copied:\n' + toCopy); }
    catch { alert('Link:\n' + toCopy); }
  });

  // Auto-print when ?print=1
  if (params.print) {
    const go = () => setTimeout(() => window.print(), 200);
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }

  // Legacy: accept message from builder
  window.addEventListener('message', ev => { if (ev.data?.type === 'print') window.print(); });
})();
