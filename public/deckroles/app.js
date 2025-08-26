(() => {
  // ---------- Storage helpers ----------
  const STORE_KEY = "scDeckProjects";
  const loadAll = () => JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  const saveAll = (obj) => localStorage.setItem(STORE_KEY, JSON.stringify(obj));

  // ---------- State ----------
  const state = {
    projectName: "Untitled",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
    contact: { person:"Maria Christina Jarltoft", email:"maria@jarltoft.dk", phone:"+4522813113" },
    roles: [
      // Start empty – user adds roles
    ],
    showHow:true,
  };

  // ---------- Elements ----------
  const id = (s) => document.getElementById(s);
  const rolesWrap  = id('rolesWrap');
  const preview    = id('preview');
  const selProject = id('projectSelect');
  const inpPName   = id('projectName');
  const saveStatus = id('saveStatus');

  // ---------- Bind brand/contact ----------
  bindInput('brandLogo',     v => { state.brand.logoUrl  = v; render(); autosaveTick(); });
  bindInput('brandWordmark', v => { state.brand.wordmark = v; render(); autosaveTick(); });
  bindInput('brandSubtitle', v => { state.brand.subtitle = v; render(); autosaveTick(); });
  bindSelect('brandShow',    v => { state.brand.showWordmark = (v==="1"); render(); autosaveTick(); });

  bindInput('contactPerson', v => { state.contact.person = v; render(); autosaveTick(); });
  bindInput('contactEmail',  v => { state.contact.email  = v; render(); autosaveTick(); });
  bindInput('contactPhone',  v => { state.contact.phone  = v; render(); autosaveTick(); });

  function bindInput(elId, setter){
    const el = id(elId); if(!el) return;
    el.addEventListener('input', e => setter(e.target.value));
  }
  function bindSelect(elId, setter){
    const el = id(elId); if(!el) return;
    el.addEventListener('change', e => setter(e.target.value));
  }

  // ---------- Roles editor ----------
  function roleCard(role, index){
    const wrap = document.createElement('div');
    wrap.className = 'card stack';
    wrap.innerHTML = `
      <div class="between">
        <h3>Role #${index+1}</h3>
        <div class="stack" style="flex-direction:row;gap:8px">
          <button class="btn secondary" data-action="autofill">Auto-fill</button>
          <button class="btn secondary" data-action="paste">Paste meta</button>
          <button class="btn secondary" data-action="remove">Remove</button>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Role title</label>
          <input data-key="title" value="${esc(role.title)}"/>
        </div>
        <div>
          <label>Role link (producer.selfcast.com/.../role/...)</label>
          <input data-key="roleUrl" value="${esc(role.roleUrl||'')}"/>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Hero image URL (optional)</label>
          <input data-key="hero" value="${esc(role.hero||'')}" placeholder="Top image URL from the role page"/>
        </div>
      </div>
      <div class="muted">
        If Auto-fill can’t read a private page, use <strong>Paste meta</strong> with the bookmarklet below.
      </div>
    `;

    // Field bindings
    wrap.querySelectorAll('input[data-key]').forEach(el=>{
      el.addEventListener('input', ()=>{
        role[el.getAttribute('data-key')] = el.value; render(); autosaveTick();
      });
    });

    // Remove role
    wrap.querySelector('[data-action="remove"]').addEventListener('click', ()=>{
      state.roles.splice(index,1); render(); autosaveTick();
    });

    // Auto-fill via API route (optional)
    wrap.querySelector('[data-action="autofill"]').addEventListener('click', async ()=>{
      const url = (role.roleUrl || "").trim();
      if(!url){ alert("Add a role URL first."); return; }
      try{
        const r = await fetch("/api/rolemeta?url=" + encodeURIComponent(url));
        const j = await r.json();
        if(j?.ok){
          let changed = false;
          if(j.title && !role.title){ role.title = j.title; changed = true; }
          if(j.image && !role.hero){ role.hero = j.image; changed = true; }
          if(!changed) alert("Fetched, but no new data. Try “Paste meta”.");
          render(); autosaveTick();
        }else{
          alert("Auto-fill couldn’t read this page. Use “Paste meta”.");
        }
      }catch(e){
        alert("Auto-fill failed. Use “Paste meta” instead.");
      }
    });

    // Manual paste of meta (from bookmarklet)
    wrap.querySelector('[data-action="paste"]').addEventListener('click', async ()=>{
      const input = prompt('Paste JSON like {"title":"…","image":"…"} or "Title | https://image"');
      if(!input) return;
      let title = "", image = "";
      try { const j = JSON.parse(input); title = j.title||""; image = j.image||j.ogImage||""; }
      catch { const m = input.split("|"); if(m.length>=2){ title=m[0].trim(); image=m[1].trim(); } else { title=input.trim(); } }
      if(title) role.title = title;
      if(image) role.hero  = image;
      render(); autosaveTick();
    });

    return wrap;
  }

  function renderRolesEditor(){
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
    // Bookmarklet helper (shown once)
    if(!document.getElementById('bm-help')){
      const bm = document.createElement('div');
      bm.id = 'bm-help';
      bm.className = 'card stack no-print';
      bm.innerHTML = `
        <h3>Bookmarklet (for private role pages)</h3>
        <div class="muted">
          1) Drag this link to your bookmarks bar:
          <a id="bm-link" href="#">Selfcast → Copy role meta</a><br/>
          2) Open the role page (logged in), click the bookmark → meta copied to clipboard.<br/>
          3) Click “Paste meta” here and paste.
        </div>
      `;
      rolesWrap.after(bm);
      const code = `javascript:(()=>{try{const h1=document.querySelector('h1,.role-title')?.innerText||document.title;const img=(Array.from(document.images).map(i=>i.src).find(Boolean))||'';const j=JSON.stringify({title:h1,image:img});if(navigator.clipboard){navigator.clipboard.writeText(j).then(()=>alert('Copied:\\n'+j)).catch(()=>prompt('Copy this JSON:',j));}else{prompt('Copy this JSON:',j);} }catch(e){alert('Bookmarklet failed.');}})();`;
      const a = bm.querySelector('#bm-link');
      a.href = code; a.style.color = '#9ac1ff'; a.style.textDecoration = 'underline';
    }
  }

  // ---------- Preview (cover + how + roles) ----------
  function cover(){
    const b = state.brand;
    const box = document.createElement('section');
    box.className = 'sheet';
    box.innerHTML = `
      <div class="pad">
        <div class="between" style="align-items:flex-start;">
          <div><div class="proj-title">${esc(state.projectName || 'Role Presentation')}</div></div>
          <div style="display:flex;align-items:center;gap:12px;color:#111">
            ${b.showWordmark ? `<div style="text-align:right">
              <div class="wordmark">${esc(b.wordmark||'SELFCAST')}</div>
              <div class="subtitle">${esc(b.subtitle||'')}</div>
            </div>` : ``}
            ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee"/>` : ``}
          </div>
        </div>
      </div>
    `;
    return box;
  }

  function howItWorks(){
    const c = state.contact;
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="pad">
        <div class="how">
          <h2>THIS IS HOW IT WORKS!</h2>
          <p><strong>Decline</strong><br/>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
          <p><strong><span class="green">Requested videos/photos</span></strong><br/>See new videos or photos uploaded by the Talent for this job.</p>
          <p><strong>Talent picture</strong><br/>Click a Talent’s picture to open their full profile.</p>
          <p><strong>Add to Shortlist</strong><br/>Move Talents forward in the process, or book a Talent directly.</p>
          <div style="margin-top:10px;border-top:1px dashed var(--accent);padding-top:8px;color:#111">
            <div style="font-size:13px">If you need assistance:</div>
            <div class="muted" style="margin-top:4px;color:#6b7280">
              Contact ${esc(c.person||'Selfcast')}${c.email?` · ${esc(c.email)}`:''}${c.phone?` · ${esc(c.phone)}`:''}
            </div>
          </div>
        </div>
      </div>
    `;
    return sec;
  }

  function rolesSection(){
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="pad">
        <div class="rolegrid">
          ${state.roles.map(r=>`
            <div class="rolecard">
              <div class="imgwrap">
                ${r.hero ? `<img src="${esc(r.hero)}" alt="${esc(r.title)}"/>` : `<div style="height:220px;background:#f4f4f5"></div>`}
                ${r.roleUrl ? `<a class="rolecta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>` : ``}
              </div>
              <div class="cap">
                <div style="font-weight:800">${esc(r.title)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return sec;
  }

  function render(){
    renderRolesEditor();
    preview.innerHTML = '';
    preview.appendChild(cover());
    if(state.showHow) preview.appendChild(howItWorks());
    preview.appendChild(rolesSection());
    syncProjectBar();
  }

  // ---------- Project bar ----------
  function syncProjectBar(){
    const all = loadAll();
    const names = Object.keys(all).sort();
    selProject.innerHTML = names.length
      ? names.map(n=>`<option value="${esc(n)}"${n===state.projectName?' selected':''}>${esc(n)}</option>`).join('')
      : `<option value="">(no projects)</option>`;
    inpPName.value = state.projectName || '';
  }

  function snapshot(){
    return JSON.parse(JSON.stringify({
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    }));
  }

  // Buttons (builder)
  id('btn-add-role').addEventListener('click', ()=>{
    state.roles.push({ title:'New role', roleUrl:'', hero:'' });
    render(); autosaveTick();
  });
  id('btn-print').addEventListener('click', ()=> window.print());

  id('btn-new').addEventListener('click', ()=>{
    state.projectName = 'Untitled';
    state.brand = { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true };
    state.roles = [];
    render(); autosaveTick();
  });

  id('btn-save').addEventListener('click', doSave);
  id('btn-delete').addEventListener('click', ()=>{
    const name = selProject.value;
    if(!name) return;
    if(!confirm(`Delete project “${name}”?`)) return;
    const all = loadAll();
    delete all[name];
    saveAll(all);
    if(state.projectName === name){ state.projectName = 'Untitled'; }
    render();
    setStatus("Deleted.");
  });

  selProject.addEventListener('change', ()=>{
    const name = selProject.value;
    const all = loadAll();
    if(all[name]){
      const p = all[name];
      state.projectName = name;
      state.brand   = p.brand || state.brand;
      state.contact = p.contact || state.contact;
      state.roles   = p.roles || [];
      state.showHow = p.showHow ?? true;
      render();
      setStatus(`Loaded “${name}”.`);
    }
  });

  inpPName.addEventListener('input', ()=>{
    state.projectName = inpPName.value;
  });

  function doSave(){
    const name = (inpPName.value || state.projectName || 'Untitled').trim();
    state.projectName = name || 'Untitled';
    const all = loadAll();
    all[state.projectName] = snapshot();
    saveAll(all);
    render();
    setStatus("Saved.");
  }

  let saveTimer = null;
  function autosaveTick(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=> { doSave(); }, 700);
  }
  function setStatus(msg){
    if(!saveStatus) return;
    saveStatus.textContent = msg;
    setTimeout(()=>{ saveStatus.textContent = ""; }, 1500);
  }

  // ---------- Utils ----------
  function esc(s){ return (s||'').replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }

  // ---------- Share link helpers (URL-packed snapshot) ----------
  function pack(obj){
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json))); // UTF-8-safe base64
  }
  function currentSnapshot(){
    return {
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    };
  }
  function makeShareUrl(){
    const data = pack(currentSnapshot());
    return `${location.origin}/view/?d=${data}`;
  }

  // Buttons (share) – graceful if elements missing
  const btnShare = document.getElementById('btn-share');
  const btnOpen  = document.getElementById('btn-open-share');

  if (btnOpen) {
    btnOpen.href = makeShareUrl(); // initial href for right-click copy
    btnOpen.addEventListener('click', () => {
      btnOpen.href = makeShareUrl(); // refresh before opening
    });
  }

  if (btnShare) {
    btnShare.addEventListener('click', async ()=>{
      const url = makeShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Share link copied");
      } catch {
        prompt("Copy this link:", url);
      }
    });
  }

  // ---------- Init ----------
  syncProjectBar();
  render();
})();
