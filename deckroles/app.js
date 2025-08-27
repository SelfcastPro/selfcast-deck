(() => {
  // ------- constants & storage key -------
  const LS_KEY = "sc_deckroles_project_v1";

  // ------- state -------
  const state = load() || {
    projectName: "",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
    contact: { person:"", email:"", phone:"" },
    roles: [
      { title:"New role", roleUrl:"", hero:"" },
    ],
    showHow:true,
  };

  // ------- helpers -------
  const id = s => document.getElementById(s);
  const setStatus = msg => { console.log(msg); };
  const esc = s => (s||"").replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));

  function save(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    setStatus("Saved");
  }
  function load(){
    try{ const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw):null; }
    catch{ return null; }
  }

  // ---- Share-link helpers (compact, UTF-8 safe) ----
  function pack(obj){ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  function makeShareUrl(){
    const data = pack({
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    });
    return `${location.origin}/view/?d=${data}`;
  }

  // ------- wire top buttons -------
  id('btn-save').addEventListener('click', save);
  id('btn-pdf').addEventListener('click', ()=> window.print());
  id('btn-share').addEventListener('click', async ()=>{
    const url = makeShareUrl();
    try{ await navigator.clipboard.writeText(url); setStatus("Share link copied"); }
    catch{ prompt("Copy this link:", url); }
  });
  id('btn-open-share').addEventListener('click', (e)=>{
    e.currentTarget.href = makeShareUrl();
  });

  // ------- bind inputs -------
  function bindInputs(){
    id('projectName').value = state.projectName;
    id('brandLogo').value = state.brand.logoUrl;
    id('brandWordmark').value = state.brand.wordmark;
    id('brandSubtitle').value = state.brand.subtitle;
    id('brandShow').value = state.brand.showWordmark? "1":"0";
    id('contactPerson').value = state.contact.person||"";
    id('contactEmail').value = state.contact.email||"";
    id('contactPhone').value = state.contact.phone||"";

    id('projectName').oninput = e => { state.projectName = e.target.value; render(); };
    id('brandLogo').oninput = e => { state.brand.logoUrl = e.target.value; render(); };
    id('brandWordmark').oninput = e => { state.brand.wordmark = e.target.value; render(); };
    id('brandSubtitle').oninput = e => { state.brand.subtitle = e.target.value; render(); };
    id('brandShow').onchange = e => { state.brand.showWordmark = (e.target.value==="1"); render(); };
    id('contactPerson').oninput = e => { state.contact.person = e.target.value; render(); };
    id('contactEmail').oninput = e => { state.contact.email = e.target.value; render(); };
    id('contactPhone').oninput = e => { state.contact.phone = e.target.value; render(); };
  }

  // ------- roles UI -------
  const rolesWrap = id('rolesWrap');

  function roleCard(role, index){
    const el = document.createElement('div');
    el.className = 'rolecard';
    el.innerHTML = `
      <div class="between" style="margin-bottom:8px">
        <strong>Role #${index+1}</strong>
        <div class="between" style="gap:6px">
          <button class="btn small ghost" data-act="paste">Paste meta</button>
          <button class="btn small ghost" data-act="autofill">Auto-fill</button>
          <button class="btn small ghost" data-act="remove">Remove</button>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Role title</label>
          <input data-k="title" value="${esc(role.title)}"/>
        </div>
        <div>
          <label>Role link (producer.selfcast.com/.../role/...)</label>
          <input data-k="roleUrl" value="${esc(role.roleUrl||'')}"/>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <div>
          <label>Hero image URL (optional)</label>
          <input data-k="hero" placeholder="Top image URL from role" value="${esc(role.hero||'')}"/>
        </div>
        <div></div>
      </div>
    `;

    // basic field bindings
    el.querySelectorAll('input[data-k]').forEach(inp=>{
      const k = inp.getAttribute('data-k');
      inp.oninput = ()=>{ role[k] = inp.value; render(); };
    });

    // actions
    el.querySelector('[data-act="remove"]').onclick = ()=>{
      state.roles.splice(index,1); render();
    };
    el.querySelector('[data-act="paste"]').onclick = ()=>{
      navigator.clipboard.readText().then(txt=>{
        try{
          const meta = JSON.parse(txt);
          if(meta.title) role.title = meta.title;
          if(meta.hero)  role.hero  = meta.hero;
          render();
        }catch{
          alert("Paste meta: clipboard didn't contain valid JSON.");
        }
      });
    };
    el.querySelector('[data-act="autofill"]').onclick = ()=>{
      // try to fetch open page (CORS-safe only if public)
      // we leave a minimal helper; main private flow is the bookmarklet.
      if(!role.roleUrl){ alert("Add the Role link first."); return; }
      alert("If the role page is private, use the bookmarklet above (Copy role meta) and then ‘Paste meta’. For public pages we try the hero image automatically.");
    };

    return el;
  }

  function renderBuilder(){
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
  }

  // ------- presentation (cover + how + 2-up roles grid) -------
  function cover(){
    const b = state.brand, c = state.contact;
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <!-- left: logo -->
        <div style="display:flex;align-items:center;gap:10px">
          ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:44px;border-radius:10px;border:1px solid #eee">` : ``}
          <div>
            <div style="font-size:30px;font-weight:900">${esc(state.projectName||'')}</div>
          </div>
        </div>
        <!-- right: wordmark -->
        <div style="text-align:right">
          ${b.showWordmark ? `<div style="letter-spacing:.18em;font-weight:900">${esc(b.wordmark||'SELFCAST')}</div>
          <div style="color:#6b7280;font-size:12px;font-weight:700;letter-spacing:.06em">${esc(b.subtitle||'CASTING MADE EASY')}</div>`:''}
        </div>
      </div>

      ${state.showHow ? `
      <div class="how" style="margin-top:14px">
        <h3>THIS IS HOW IT WORKS!</h3>
        <p><strong>Decline</strong><br/>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
        <p><strong><span class="green">Requested videos/photos</span></strong><br/>See new videos or photos uploaded by the Talent for this job.</p>
        <p><strong>Talent picture</strong><br/>Click a Talent’s picture to open their full profile.</p>
        <p><strong>Add to Shortlist</strong><br/>Move Talents forward in the process, or book a Talent directly.</p>
        <div style="margin-top:10px;border-top:1px dashed var(--accent);padding-top:8px;color:#111">
          <div style="font-size:13px">If you need assistance:</div>
          <div style="color:#6b7280">${esc(c.person||"")}${c.email?` · ${esc(c.email)}`:""}${c.phone?` · ${esc(c.phone)}`:""}</div>
        </div>
      </div>`:``}
    `;
    return sec;
  }

  function rolesGrid(){
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="rolegrid">
        ${state.roles.map(r=>`
          <div class="card">
            <div class="imgwrap">
              ${r.hero ? `<img class="hero" src="${esc(r.hero)}" alt="${esc(r.title)}"/>`
                       : `<div class="hero" style="background:#f4f4f5"></div>`}
              ${r.roleUrl? `<a class="open" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>`:''}
            </div>
            <div class="cap"><strong>${esc(r.title||'')}</strong></div>
          </div>
        `).join('')}
      </div>
    `;
    return sec;
  }

  function render(){
    renderBuilder();
    const p = document.getElementById('preview');
    p.innerHTML = '';
    p.appendChild(cover());
    p.appendChild(rolesGrid());
  }

  // ------- add role -------
  id('btn-add-role').addEventListener('click', ()=>{
    state.roles.push({ title:"New role", roleUrl:"", hero:"" });
    render();
  });

  // init
  bindInputs();
  render();
})();
