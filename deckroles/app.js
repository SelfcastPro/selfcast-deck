(() => {
  // ======= STATE =======
  let state = {
    projectName: "",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
    contact: { person:"", email:"", phone:"" },
    roles: [
      { title:"New role", roleUrl:"", hero:"" }
    ],
    showHow:true,
  };

  // Load previous project
  try {
    const saved = localStorage.getItem("sc_deckroles_project_v1");
    if (saved) state = JSON.parse(saved);
  } catch (e) {}

  // ======= HELPERS =======
  const id = s => document.getElementById(s);
  const esc = s => (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  const save = () => localStorage.setItem("sc_deckroles_project_v1", JSON.stringify(state));
  const saveDebounced = (() => { let t; return ()=>{ clearTimeout(t); t=setTimeout(save,200);} })();

  // ======= TOP ACTIONS =======
  id('btn-save').addEventListener('click', ()=>{ save(); alert('Project saved'); });
  id('btn-print').addEventListener('click', ()=> window.print());

  // Share-link pack/unpack
  function pack(obj){ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  function currentSnapshot(){ return {
    projectName: state.projectName, brand: state.brand, contact: state.contact, roles: state.roles, showHow: state.showHow
  }; }
  function makeShareUrl(){ return `${location.origin}/view/?d=${pack(currentSnapshot())}`; }
  id('btn-share').addEventListener('click', async ()=>{
    const url = makeShareUrl();
    try{ await navigator.clipboard.writeText(url); alert('Share link copied'); }
    catch{ prompt('Copy this link:', url); }
  });
  id('btn-open-share').addEventListener('click', e=>{
    e.currentTarget.href = makeShareUrl();
  });

  // ======= BIND GLOBAL INPUTS =======
  const pn = id('projectName'); pn.value = state.projectName||"";
  pn.addEventListener('input', e=>{ state.projectName = e.target.value; saveDebounced(); });

  id('brandLogo').value = state.brand.logoUrl||"";
  id('brandWordmark').value = state.brand.wordmark||"SELFCAST";
  id('brandSubtitle').value = state.brand.subtitle||"CASTING MADE EASY";
  id('brandShow').value = state.brand.showWordmark ? "1" : "0";

  id('brandLogo').addEventListener('input', e=>{ state.brand.logoUrl = e.target.value; saveDebounced(); render(); });
  id('brandWordmark').addEventListener('input', e=>{ state.brand.wordmark = e.target.value; saveDebounced(); render(); });
  id('brandSubtitle').addEventListener('input', e=>{ state.brand.subtitle = e.target.value; saveDebounced(); render(); });
  id('brandShow').addEventListener('change', e=>{ state.brand.showWordmark = e.target.value==="1"; saveDebounced(); render(); });

  id('contactPerson').value = state.contact.person||"";
  id('contactEmail').value = state.contact.email||"";
  id('contactPhone').value = state.contact.phone||"";
  id('contactPerson').addEventListener('input', e=>{ state.contact.person=e.target.value; saveDebounced(); render(); });
  id('contactEmail').addEventListener('input', e=>{ state.contact.email=e.target.value; saveDebounced(); render(); });
  id('contactPhone').addEventListener('input', e=>{ state.contact.phone=e.target.value; saveDebounced(); render(); });

  // ======= ROLES BUILDER =======
  const rolesWrap = id('rolesWrap');

  function roleCard(role, index){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginBottom = '12px';
    wrap.innerHTML = `
      <div class="between">
        <div class="section-title">Role #${index+1}</div>
        <div style="display:flex;gap:8px">
          <button class="btn secondary" data-a="autofill">Auto-fill</button>
          <button class="btn secondary" data-a="paste">Paste meta</button>
          <button class="btn secondary" data-a="remove">Remove</button>
        </div>
      </div>
      <div class="grid g-2" style="margin-top:8px">
        <div>
          <label>Role title</label>
          <input data-k="title" value="${esc(role.title||'')}"/>
        </div>
        <div>
          <label>Role link (producer.selfcast.com/.../role/...)</label>
          <input data-k="roleUrl" value="${esc(role.roleUrl||'')}"/>
        </div>
      </div>
      <div style="margin-top:8px">
        <label>Hero image URL (optional)</label>
        <input data-k="hero" value="${esc(role.hero||'')}" placeholder="Top image URL from the role page"/>
      </div>
    `;

    // bind fields
    wrap.querySelectorAll('input[data-k]').forEach(el=>{
      el.addEventListener('input', ()=>{
        const k = el.getAttribute('data-k');
        role[k] = el.value;
        saveDebounced(); render();
      });
    });

    // actions
    wrap.querySelector('[data-a="remove"]').addEventListener('click', ()=>{
      state.roles.splice(index,1); save(); render();
    });

    wrap.querySelector('[data-a="autofill"]').addEventListener('click', async ()=>{
      if(!role.roleUrl){ alert('Please enter a Role link first'); return; }
      try{
        const res = await fetch(`/api/rolemeta.js?url=${encodeURIComponent(role.roleUrl)}`);
        if(!res.ok){ throw new Error('meta failed'); }
        const data = await res.json(); // {title, hero}
        if(data.title) role.title = data.title;
        if(data.hero)  role.hero  = data.hero;
        save(); render();
      }catch(e){
        alert('Auto-fill failed. If the page is private, use the bookmarklet and then "Paste meta".');
      }
    });

    wrap.querySelector('[data-a="paste"]').addEventListener('click', ()=>{
      const s = prompt('Paste copied meta JSON:');
      if(!s) return;
      try{
        const meta = JSON.parse(s);
        if(meta.title) role.title = meta.title;
        if(meta.url)   role.roleUrl = meta.url;
        if(meta.hero)  role.hero = meta.hero;
        save(); render();
      }catch(e){
        alert('Could not parse JSON');
      }
    });

    return wrap;
  }

  function renderRolesBuilder(){
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
  }

  id('btn-add-role').addEventListener('click', ()=>{
    state.roles.push({ title:'New role', roleUrl:'', hero:'' });
    save(); render();
  });

  // ======= PREVIEW =======
  const preview = id('preview');

  function cover(){
    const b = state.brand, c = state.contact;
    const box = document.createElement('section');
    box.className = 'sheet';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><div class="proj-title">${esc(state.projectName||'Untitled')}</div></div>
        <div style="display:flex;align-items:center;gap:12px">
          ${b.showWordmark ? `
            <div style="text-align:right">
              <div class="wordmark">${esc(b.wordmark||'SELFCAST')}</div>
              <div class="subtitle">${esc(b.subtitle||'CASTING MADE EASY')}</div>
            </div>` : ``}
          ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee">` : ``}
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
      <div class="how">
        <h2>THIS IS HOW IT WORKS!</h2>
        <p><strong>Decline</strong><br/>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
        <p><strong><span class="green">Requested videos/photos</span></strong><br/>See new videos or photos uploaded by the Talent for this job.</p>
        <p><strong>Talent picture</strong><br/>Click a Talent’s picture to open their full profile.</p>
        <p><strong>Add to Shortlist</strong><br/>Move Talents forward in the process, or book a Talent directly.</p>
        <div style="margin-top:10px;border-top:1px dashed var(--accent);padding-top:8px;color:#111">
          <div style="font-size:13px">If you need assistance:</div>
          <div style="color:#6b7280">
            Contact ${esc(c.person||'Selfcast')}${c.email?` · ${esc(c.email)}`:''}${c.phone?` · ${esc(c.phone)}`:''}
          </div>
        </div>
      </div>
    `;
    return sec;
  }

  // two-up roles grid
  function rolesGrid(){
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="rolegrid">
        ${state.roles.map(r=>`
          <div class="rolecard">
            <div class="imgwrap">
              ${r.hero ? `<img src="${esc(r.hero)}" alt="${esc(r.title)}">` : `<div style="height:240px"></div>`}
              ${r.roleUrl ? `<a class="rolecta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>` : ``}
            </div>
            <div class="cap">${esc(r.title||'')}</div>
          </div>
        `).join('')}
      </div>
    `;
    return sec;
  }

  function render(){
    renderRolesBuilder();
    preview.innerHTML = '';
    preview.appendChild(cover());
    preview.appendChild(howItWorks());
    preview.appendChild(rolesGrid());
  }

  render();
})();
