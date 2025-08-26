(() => {
  const STORAGE_KEY = "sc_deckroles_project_v1";

  // ----------------- State -----------------
  const defaultState = {
    projectName: "Untitled",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
    contact: { person:"", email:"", phone:"" },
    roles: [{ title:"", roleUrl:"", hero:"" }],
    showHow: true,
  };
  let state = load() || defaultState;

  // --------------- Utilities ----------------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  const setStatus = (msg) => { const el=$('save-status'); if(el){ el.textContent = msg; } };

  function snapshot(){
    return {
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    };
  }
  function save(manual=false){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
      setStatus(manual ? "Saved ✓" : "Autosaved");
    }catch(e){ setStatus("Save failed"); }
  }
  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch{ return null; }
  }

  function pack(obj){
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json)));
  }
  function makeShareUrl(){
    const data = pack(snapshot());
    return `${location.origin}/view/?d=${data}`;
  }

  // --------------- Wire inputs ---------------
  $('brandLogo').value = state.brand.logoUrl;
  $('brandWordmark').value = state.brand.wordmark;
  $('brandSubtitle').value = state.brand.subtitle;
  $('brandShow').value = state.brand.showWordmark ? "1" : "0";
  $('contactPerson').value = state.contact.person;
  $('contactEmail').value = state.contact.email;
  $('contactPhone').value = state.contact.phone;

  $('brandLogo').addEventListener('input', e => { state.brand.logoUrl = e.target.value; render(); });
  $('brandWordmark').addEventListener('input', e => { state.brand.wordmark = e.target.value; render(); });
  $('brandSubtitle').addEventListener('input', e => { state.brand.subtitle = e.target.value; render(); });
  $('brandShow').addEventListener('change', e => { state.brand.showWordmark = e.target.value === "1"; render(); });

  $('contactPerson').addEventListener('input', e => { state.contact.person = e.target.value; render(); });
  $('contactEmail').addEventListener('input', e => { state.contact.email = e.target.value; render(); });
  $('contactPhone').addEventListener('input', e => { state.contact.phone = e.target.value; render(); });

  // --------------- Roles Builder ----------------
  const rolesWrap = $('rolesWrap');

  function roleEditor(role, index){
    const wrap = document.createElement('div');
    wrap.className = 'card stack';
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3>Role #${index+1}</h3>
        <div class="right">
          <button class="btn ghost" data-action="autofill">Auto-fill</button>
          <button class="btn ghost" data-action="paste">Paste meta</button>
          <button class="btn ghost" data-action="remove">Remove</button>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Role title</label>
          <input data-k="title" value="${esc(role.title)}" placeholder="New role"/>
        </div>
        <div>
          <label>Role link (producer.selfcast.com/…/role/…)</label>
          <input data-k="roleUrl" value="${esc(role.roleUrl)}" placeholder="https://producer.selfcast.com/…"/>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Hero image URL (optional)</label>
          <input data-k="hero" value="${esc(role.hero)}" placeholder="Top image URL from the role page"/>
        </div>
        <div>
          <label>Project name (shown on cover)</label>
          <input id="projName" value="${esc(state.projectName)}" placeholder="Project name"/>
        </div>
      </div>
      <div class="muted">If Auto-fill can’t read a private page, use the Bookmarklet and “Paste meta”.</div>
    `;

    wrap.querySelectorAll('input[data-k]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        role[inp.getAttribute('data-k')] = inp.value;
        render();
      });
    });
    wrap.querySelector('#projName').addEventListener('input', e=>{
      state.projectName = e.target.value; render();
    });

    // actions
    wrap.querySelector('[data-action="remove"]').addEventListener('click', ()=>{
      state.roles.splice(index,1); if(!state.roles.length) state.roles.push({title:"",roleUrl:"",hero:""}); render();
    });

    wrap.querySelector('[data-action="paste"]').addEventListener('click', async ()=>{
      try{
        const text = await navigator.clipboard.readText();
        const meta = JSON.parse(text);
        if(meta.title) role.title = meta.title;
        if(meta.roleUrl) role.roleUrl = meta.roleUrl;
        if(meta.hero) role.hero = meta.hero;
        render();
      }catch(err){ alert('Could not read pasted meta. Copy again and retry.'); }
    });

    wrap.querySelector('[data-action="autofill"]').addEventListener('click', async ()=>{
      const url = role.roleUrl;
      if(!url){ alert('Add the role link first.'); return; }
      try{
        const res = await fetch(`/api/rolemeta?url=${encodeURIComponent(url)}`);
        if(!res.ok) throw new Error(await res.text());
        const meta = await res.json(); // {title, hero}
        role.title = meta.title || role.title;
        role.hero = meta.hero || role.hero;
        render();
      }catch(e){
        alert('Auto-fill failed. If the role is private, use the Bookmarklet and “Paste meta”.');
      }
    });

    return wrap;
  }

  $('btn-add-role').addEventListener('click', ()=>{
    state.roles.push({title:"New role", roleUrl:"", hero:""});
    render();
  });

  // --------------- Top bar buttons ----------------
  $('btn-print').addEventListener('click', ()=> window.print());
  $('btn-share').addEventListener('click', async ()=>{
    const url = makeShareUrl();
    try{ await navigator.clipboard.writeText(url); setStatus('Share link copied'); }
    catch{ prompt('Copy this link:', url); }
  });
  $('btn-open-share').addEventListener('click', (e)=>{
    e.currentTarget.href = makeShareUrl();
  });
  $('btn-save').addEventListener('click', ()=>{
    save(true);
  });

  // --------------- Presentation builders ----------------
  function cover(){
    const b = state.brand, c = state.contact;
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="pad">
        <div class="coverTop">
          <div><div class="proj">${esc(state.projectName||'')}</div></div>
          <div class="brand">
            <div style="text-align:right">
              ${b.showWordmark ? `<div class="wordmark">${esc(b.wordmark||'SELFCAST')}</div>
              <div class="subtitle">${esc(b.subtitle||'CASTING MADE EASY')}</div>`:''}
            </div>
            ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee">` : ``}
          </div>
        </div>
      </div>
    `;
    const wmSmall = document.getElementById('wm-small');
    if (wmSmall) wmSmall.textContent = b.showWordmark ? (b.wordmark || 'SELFCAST') : '';
    return sec;
  }

  function howItWorks(){
    const c = state.contact;
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="pad">
        <div class="how">
          <h2>THIS IS HOW IT WORKS!</h2>
          <p><strong>Decline</strong><br>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
          <p><strong><span class="green">Requested videos/photos</span></strong><br>See new videos or photos uploaded by the Talent for this job.</p>
          <p><strong>Talent picture</strong><br>Click a Talent’s picture to open their full profile.</p>
          <p><strong>Add to Shortlist</strong><br>Move Talents forward in the process, or book a Talent directly.</p>
          <div style="margin-top:10px;border-top:1px dashed var(--accent);padding-top:8px;color:#111">
            <div style="font-size:13px">If you need assistance:</div>
            <div style="color:#6b7280">
              ${esc(c.person||"Selfcast")}${c.email?` · ${esc(c.email)}`:''}${c.phone?` · ${esc(c.phone)}`:''}
            </div>
          </div>
        </div>
      </div>
    `;
    return sec;
  }

  function rolesGrid(){
    const sec = document.createElement('section');
    sec.className = 'sheet';
    const cards = state.roles.map(r=>`
      <div class="rolecard">
        <div class="imgwrap">
          ${r.hero ? `<img src="${esc(r.hero)}" alt="${esc(r.title)}">` : `<div style="height:220px;background:#f4f4f5"></div>`}
          ${r.roleUrl ? `<a class="rolecta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>` : ``}
        </div>
        <div class="cap">${esc(r.title||"")}</div>
      </div>
    `).join('');
    sec.innerHTML = `<div class="pad"><div class="rolegrid">${cards}</div></div>`;
    return sec;
  }

  function render(){
    // editor
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleEditor(r,i)));

    // preview
    const preview = document.getElementById('preview');
    preview.innerHTML = '';
    preview.appendChild(cover());
    if (state.showHow) preview.appendChild(howItWorks());
    preview.appendChild(rolesGrid());

    // autosave on every render
    save(false);
  }

  // Initial paint
  render();
})();
