(() => {
  // ---------- Storage helpers (projects) ----------
  const STORE_KEY = "scDeckProjects";
  const loadAll = () => JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  const saveAll = (obj) => localStorage.setItem(STORE_KEY, JSON.stringify(obj));

  // ---------- State ----------
  const state = {
    projectName: "Untitled",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"Casting Made Easy", showWordmark:true },
    contact: { person:"Maria Christina Jarltoft", email:"maria@jarltoft.dk", phone:"+4522813113" },
    roles: [
      { title:"Mother and daughter",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/ef4e98c5-09ca-48ef-9cd2-35ff87a883e4",
        hero:"" },
      { title:"Couple age 65+",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/59f7f37c-e20f-4662-b992-7e2af363a849",
        hero:"" },
      { title:"Men age 20–30",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/20c3c9d1-65a0-4fb1-88cb-aa1fc3bcaf58",
        hero:"" },
    ],
    showHow:true,
  };

  // ---------- Elements ----------
  const id = (s) => document.getElementById(s);
  const rolesWrap  = id('rolesWrap');
  const preview    = id('preview');
  const selProject = id('projectSelect');
  const inpPName   = id('projectName');

  // ---------- Bind brand/contact ----------
  bindInput('brandLogo',     (v)=> state.brand.logoUrl  = v);
  bindInput('brandWordmark', (v)=> state.brand.wordmark = v);
  bindInput('brandSubtitle', (v)=> state.brand.subtitle = v);
  bindSelect('brandShow',    (v)=> state.brand.showWordmark = v==="1");
  bindInput('contactPerson', (v)=> state.contact.person = v);
  bindInput('contactEmail',  (v)=> state.contact.email  = v);
  bindInput('contactPhone',  (v)=> state.contact.phone  = v);

  function bindInput(elId, setter){
    const el = id(elId); if(!el) return;
    el.addEventListener('input', e => { setter(e.target.value); render(); });
  }
  function bindSelect(elId, setter){
    const el = id(elId); if(!el) return;
    el.addEventListener('change', e => { setter(e.target.value); render(); });
  }

  // ---------- Roles UI (simple) ----------
  function roleCard(role, index){
    const wrap = document.createElement('div');
    wrap.className = 'card stack';
    wrap.innerHTML = `
      <div class="between">
        <h3>Role #${index+1}</h3>
        <button class="btn secondary" data-action="remove">Remove</button>
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
    `;
    // events
    wrap.querySelectorAll('input[data-key]').forEach(el=>{
      el.addEventListener('input', ()=>{
        role[el.getAttribute('data-key')] = el.value; render();
      });
    });
    wrap.querySelector('[data-action="remove"]').addEventListener('click', ()=>{
      state.roles.splice(index,1); render();
    });
    return wrap;
  }

  function renderRolesEditor(){
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
  }

  // ---------- Presentation ----------
  function cover(){
    const b = state.brand, c = state.contact;
    const box = document.createElement('section');
    box.className = 'sheet';
    box.innerHTML = `
      <div class="pad">
        <div class="between" style="align-items:flex-start;">
          <div>
            <div style="font-size:26px;font-weight:900;margin:0 0 6px">${esc(state.projectName || 'Role Presentation')}</div>
            <div class="muted" style="color:#6b7280">${new Date().toLocaleDateString()}</div>
            <div class="rolebar">Roles: <strong>${state.roles.map(r=>esc(r.title)).join(' · ')}</strong></div>
          </div>
          <div class="logo" style="display:flex;align-items:center;gap:12px;color:#111">
            ${b.showWordmark ? `<div style="text-align:right">
              <div style="letter-spacing:.18em;font-weight:900">${esc(b.wordmark||'SELFCAST')}</div>
              <div style="color:#6b7280;font-size:12px">${esc(b.subtitle||'')}</div>
            </div>` : ``}
            ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee"/>` : ``}
          </div>
        </div>
        <div style="margin-top:28px;border-top:1px solid var(--line);padding-top:10px;color:#6b7280;font-size:12px">
          Contact: ${esc(c.person||'—')}${c.email?` · ${esc(c.email)}`:''}${c.phone?` · ${esc(c.phone)}`:''}
        </div>
      </div>
    `;
    return box;
  }

  function roleSheet(role){
    const page = document.createElement('section');
    page.className = 'sheet';
    page.innerHTML = `
      <div class="pad">
        <div class="between">
          <h2 style="font-size:28px;font-weight:900">${esc(role.title)}</h2>
          <a class="cta" href="${esc(role.roleUrl||'#')}" target="_blank" rel="noreferrer">Open role</a>
        </div>
        ${role.hero?`<img class="hero" src="${esc(role.hero)}" alt="Role hero"/>`:''}
      </div>
    `;
    return page;
  }

  function howItWorks(){
    const c = state.contact;
    const sec = document.createElement('section');
    sec.className = 'sheet';
    sec.innerHTML = `
      <div class="pad">
        <h2 style="font-size:28px;font-weight:900;margin-bottom:12px">THIS IS HOW IT WORKS!</h2>
        <div style="font-size:15px;line-height:1.6;color:#111">
          <p><strong>Decline</strong><br/>Clicking <em>Decline</em> tells the Talent they’re not selected and removes them from your list.</p>
          <p><strong><span class="green">Requested videos/photos</span></strong><br/>Use this to see any new videos or photos the Talent has uploaded for this job.</p>
          <p><strong>Talent picture</strong><br/>Click a Talent’s picture to open their profile with full info.</p>
          <p><strong>Add to Shortlist</strong><br/>Add Talents you want to move forward. You can also choose to book a Talent directly.</p>
        </div>
        <div style="margin-top:18px;border-top:1px solid var(--line);padding-top:10px;color:#111">
          <div style="font-size:14px">If you need assistance:</div>
          <div class="muted" style="margin-top:4px;color:#6b7280">
            Contact ${esc(c.person||'Selfcast')}${c.email?` · ${esc(c.email)}`:''}${c.phone?` · ${esc(c.phone)}`:''}
          </div>
        </div>
      </div>
    `;
    return sec;
  }

  function render(){
    renderRolesEditor();
    preview.innerHTML = '';
    preview.appendChild(cover());
    state.roles.forEach(r => preview.appendChild(roleSheet(r)));
    if(state.showHow) preview.appendChild(howItWorks());
    syncProjectBar();
  }

  // ---------- Project bar (save/open/delete) ----------
  function syncProjectBar(){
    // fill dropdown
    const all = loadAll();
    const names = Object.keys(all).sort();
    selProject.innerHTML = names.map(n=>`<option value="${esc(n)}"${n===state.projectName?' selected':''}>${esc(n)}</option>`).join('') +
      (state.projectName && !names.includes(state.projectName) ? `<option selected>${esc(state.projectName)}</option>` : names.length?``:`<option value="">(no projects)</option>`);
    inpPName.value = state.projectName || '';
  }

  function snapshot(){
    // deep clone without functions
    return JSON.parse(JSON.stringify({
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    }));
  }

  // Buttons & inputs
  id('btn-add-role').addEventListener('click', ()=>{
    state.roles.push({ title:'New role', roleUrl:'', hero:'' });
    render();
  });
  id('btn-print').addEventListener('click', ()=> window.print());

  id('btn-new').addEventListener('click', ()=>{
    state.projectName = 'Untitled';
    state.brand = { logoUrl:"", wordmark:"SELFCAST", subtitle:"Casting Made Easy", showWordmark:true };
    // keep contact defaults from current
    state.roles = [];
    render();
  });

  id('btn-save').addEventListener('click', ()=>{
    const name = inpPName.value.trim() || 'Untitled';
    state.projectName = name;
    const all = loadAll();
    all[name] = snapshot();
    saveAll(all);
    render();
  });

  id('btn-delete').addEventListener('click', ()=>{
    const name = selProject.value;
    if(!name) return;
    const all = loadAll();
    delete all[name];
    saveAll(all);
    if(state.projectName === name){ state.projectName = 'Untitled'; }
    render();
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
    }
  });

  inpPName.addEventListener('input', ()=>{
    state.projectName = inpPName.value;
  });

  // ---------- Utils ----------
  function esc(s){ return (s||'').replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }

  // Init: seed dropdown and render
  syncProjectBar();
  render();
})();
