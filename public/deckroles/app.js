(() => {
  const STAGES = [
    { key:"option", label:"Option" },
    { key:"in review", label:"In review" },
    { key:"shortlisted", label:"Shortlisted" },
    { key:"in dialog", label:"In dialog" },
    { key:"booked", label:"Booked" },
  ];

  const state = {
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"Casting Made Easy", showWordmark:true },
    contact: { person:"", email:"", phone:"" },
    roles: [
      { title:"Mother and daughter",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/ef4e98c5-09ca-48ef-9cd2-35ff87a883e4",
        hero:"", filter:"all", talents:[] },
      { title:"Couple age 65+",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/59f7f37c-e20f-4662-b992-7e2af363a849",
        hero:"", filter:"all", talents:[] },
      { title:"Men age 20–30",
        roleUrl:"https://producer.selfcast.com/production/175e757e-470c-4367-b674-c588f44f18d8/role/20c3c9d1-65a0-4fb1-88cb-aa1fc3bcaf58",
        hero:"", filter:"all", talents:[] },
    ],
    showHow:true,
  };

  const id = s => document.getElementById(s);

  function safeBind(el, event, handler){
    if (!el) return;
    el.addEventListener(event, handler, false);
  }

  // Inputs
  safeBind(id('brandLogo'),'input', e => { state.brand.logoUrl = e.target.value; render(); });
  safeBind(id('brandWordmark'),'input', e => { state.brand.wordmark = e.target.value; render(); });
  safeBind(id('brandSubtitle'),'input', e => { state.brand.subtitle = e.target.value; render(); });
  safeBind(id('brandShow'),'change', e => { state.brand.showWordmark = e.target.value === "1"; render(); });
  safeBind(id('contactPerson'),'input', e => { state.contact.person = e.target.value; render(); });
  safeBind(id('contactEmail'),'input', e => { state.contact.email = e.target.value; render(); });
  safeBind(id('contactPhone'),'input', e => { state.contact.phone = e.target.value; render(); });

  const rolesWrap = id('rolesWrap');
  const preview = id('preview');

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
          <input data-key="title" value="${escapeHtml(role.title)}"/>
        </div>
        <div>
          <label>Role link (producer.selfcast.com/.../role/...)</label>
          <input data-key="roleUrl" value="${escapeHtml(role.roleUrl||'')}"/>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Hero image URL (optional)</label>
          <input data-key="hero" value="${escapeHtml(role.hero||'')}" placeholder="Paste the top image URL from the role page"/>
        </div>
        <div>
          <label>Stage filter</label>
          <select data-key="filter">
            <option value="all" ${role.filter==='all'?'selected':''}>All stages</option>
            ${STAGES.map(s=>`<option value="${s.key}" ${role.filter===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="divider"></div>
      <div class="row">
        <div class="stack">
          <strong>Add / edit talents</strong>
          <div class="stack" data-zone="talents"></div>
          <button class="btn secondary" data-action="add-talent">+ Add talent</button>
        </div>
        <div class="stack">
          <strong>Bulk import (CSV)</strong>
          <textarea placeholder="name, profileUrl, imageUrl, notes, stage&#10;Jane Doe, https://producer.selfcast.com/talent/xxxx, https://…/jane.jpg, Great smile, Shortlisted"></textarea>
          <div class="muted">Tip: paste rows from a spreadsheet. Stage: option | in review | shortlisted | in dialog | booked</div>
          <button class="btn secondary" data-action="import">Import CSV</button>
        </div>
      </div>
    `;

    // Bind basic fields
    wrap.querySelectorAll('input[data-key], select[data-key]').forEach(el=>{
      el.addEventListener('input', ()=>{
        const key = el.getAttribute('data-key'); role[key] = el.value; render();
      });
      el.addEventListener('change', ()=>{
        const key = el.getAttribute('data-key'); role[key] = el.value; render();
      });
    });

    // Remove role
    wrap.querySelector('[data-action="remove"]').addEventListener('click', ()=>{
      state.roles.splice(index,1); render();
    });

    // Add talent
    wrap.querySelector('[data-action="add-talent"]').addEventListener('click', ()=>{
      role.talents.push({ name:'New Talent', profileUrl:'', imageUrl:'', notes:'', stage:'option' });
      render();
    });

    // Import CSV
    wrap.querySelector('[data-action="import"]').addEventListener('click', ()=>{
      const ta = wrap.querySelector('textarea');
      const list = parseCSV(ta.value);
      role.talents.push(...list); ta.value = ''; render();
    });

    // talents list
    const zone = wrap.querySelector('[data-zone="talents"]');
    role.talents.forEach((t,i)=>{
      const row = document.createElement('div');
      row.className = 'row'; row.style.alignItems = 'center';
      row.innerHTML = `
        <input placeholder="Name" value="${escapeHtml(t.name||'')}" data-t="${i}" data-k="name"/>
        <input placeholder="Profile URL" value="${escapeHtml(t.profileUrl||'')}" data-t="${i}" data-k="profileUrl"/>
        <input placeholder="Image URL" value="${escapeHtml(t.imageUrl||'')}" data-t="${i}" data-k="imageUrl"/>
        <select data-t="${i}" data-k="stage">
          ${STAGES.map(s=>`<option value="${s.key}" ${t.stage===s.key?'selected':''}>${s.label}</option>`).join('')}
        </select>
        <input placeholder="Notes" value="${escapeHtml(t.notes||'')}" data-t="${i}" data-k="notes"/>
        <button class="btn secondary" data-action="del" data-t="${i}">Remove</button>
      `;
      row.querySelectorAll('input, select').forEach(el=>{
        el.addEventListener('input', ()=>{
          const ti = +el.getAttribute('data-t'); const k = el.getAttribute('data-k');
          role.talents[ti][k] = el.value; render();
        });
        el.addEventListener('change', ()=>{
          const ti = +el.getAttribute('data-t'); const k = el.getAttribute('data-k');
          role.talents[ti][k] = el.value; render();
        });
      });
      row.querySelector('[data-action="del"]').addEventListener('click', ()=>{
        const ti = +row.querySelector('[data-action="del"]').getAttribute('data-t');
        role.talents.splice(ti,1); render();
      });
      zone.appendChild(row);
    });
    return wrap;
  }

  function renderBuilder(){
    const rolesWrap = document.getElementById('rolesWrap');
    if (!rolesWrap) return;
    rolesWrap.innerHTML = '';
    state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
  }

  function cover(){
    const b = state.brand, c = state.contact;
    const box = document.createElement('section');
    box.className = 'sheet';
    box.innerHTML = `
      <div class="pad">
        <div class="between" style="align-items:flex-start;">
          <div class="logo" style="color:#111">
            ${b.logoUrl ? `<img src="${escapeHtml(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee"/>` : `<div class="mark" style="width:40px;height:40px;border-radius:10px;background:#e51c23;display:grid;place-items:center;font-weight:800;color:#fff">S</div>`}
            ${b.showWordmark ? `<div><div style="letter-spacing:.18em;font-weight:900">${escapeHtml(b.wordmark||'SELFCAST')}</div><div style="color:#6b7280;font-size:12px">${escapeHtml(b.subtitle||'')}</div></div>` : ``}
          </div>
          <div style="text-align:right;color:#6b7280;font-size:12px">
            <div>${new Date().toLocaleDateString()}</div>
            <div>Role Presentation</div>
          </div>
        </div>
        <div style="margin-top:40px">
          <h1 style="font-size:34px;font-weight:900;margin:0 0 8px">Selected Roles</h1>
          <div style="color:#6b7280">Auto-generated from Selfcast role links.</div>
          <div class="grid g-3" style="margin-top:24px">
            ${state.roles.map(r=>`
              <div style="border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff">
                <div style="font-weight:700">${escapeHtml(r.title)}</div>
                <div class="small" style="word-break:break-all;margin-top:6px">${escapeHtml(r.roleUrl||'')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:28px;border-top:1px solid var(--line);padding-top:10px;color:#6b7280;font-size:12px">
          Contact: ${escapeHtml(c.person||'—')}${c.email?` · ${escapeHtml(c.email)}`:''}${c.phone?` · ${escapeHtml(c.phone)}`:''}
        </div>
      </div>
    `;
    return box;
  }

  function roleSheet(role){
    const page = document.createElement('section');
    page.className = 'sheet';
    const STAGES_LOCAL = STAGES; // avoid closure surprises
    const list = (role.filter==='all') ? role.talents : role.talents.filter(t=>t.stage===role.filter);
    page.innerHTML = `
      <div class="pad">
        <div class="between">
          <div>
            <h2 style="font-size:28px;font-weight:900">${escapeHtml(role.title)}</h2>
            ${role.roleUrl?`<a class="small-link" href="${escapeHtml(role.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>`:''}
          </div>
          <div class="small" style="color:#6b7280">Showing: <strong>${role.filter==='all'?'All stages':(STAGES_LOCAL.find(s=>s.key===role.filter)||{}).label}</strong></div>
        </div>
        ${role.hero?`<img class="hero" src="${escapeHtml(role.hero)}" alt="Role hero"/>`:''}
        <div class="cards g-4" style="margin-top:18px">
          ${list.length? list.map(t=>`
            <div class="tcard">
              ${t.imageUrl?`<img class="timg" src="${escapeHtml(t.imageUrl)}" alt="${escapeHtml(t.name)}">`:`<div class="timg" style="display:grid;place-items:center;color:#9aa">No image</div>`}
              <div class="tbody">
                <div class="between">
                  <div>
                    <div class="name">${escapeHtml(t.name||'')}</div>
                    ${t.notes?`<div class="small" style="margin-top:2px">${escapeHtml(t.notes)}</div>`:''}
                  </div>
                  <span class="badge">${(STAGES_LOCAL.find(s=>s.key===t.stage)||{}).label||'Option'}</span>
                </div>
                ${t.profileUrl?`<a class="small-link" href="${escapeHtml(t.profileUrl)}" target="_blank" rel="noreferrer" style="margin-top:6px;display:inline-block">Open profile</a>`:''}
              </div>
            </div>
          `).join('') : `<div class="small" style="color:#6b7280">No talents added yet.</div>`}
        </div>
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
        <h2 style="font-size:28px;font-weight:900;margin-bottom:10px">THIS IS HOW IT WORKS!</h2>
        <div style="font-size:15px;line-height:1.6;color:#111">
          <p><strong>When you click Decline</strong><br/>The Talents receive a message that they are not selected and they disappear from your list.</p>
          <p><strong>When you click Requested videos/photos next to the Talents</strong><br/>You can view videos and images uploaded for this specific job. It could be a monologue, a new presentation or pictures showing how the Talent looks like right now...</p>
          <p><strong>When you click on the Talent's picture</strong><br/>You can see the Talent's profile and information.</p>
          <p><strong>Add to Shortlist</strong><br/>Shortlist the Talents you want to pass on in the process. You can also choose to book a Talent. We can see in our system that the talent has been passed on. If you need to present the Talents to others, you can share the URL of all the Talents or a specific talent by sharing the URL of the Talent profile.</p>
          <p><strong>Selection of talents</strong></p>
        </div>
        <div style="margin-top:18px;border-top:1px solid var(--line);padding-top:10px;color:#111">
          <div style="font-size:14px">If you need assistance:</div>
          <div class="small" style="margin-top:4px;color:#6b7280">
            Contact ${escapeHtml(c.person||'Selfcast')}${c.email?` · ${escapeHtml(c.email)}`:''}${c.phone?` · ${escapeHtml(c.phone)}`:''}
          </div>
        </div>
      </div>
    `;
    return sec;
  }

  function render(){
    renderBuilder();
    const preview = document.getElementById('preview');
    if (!preview) return;
    preview.innerHTML = '';
    preview.appendChild(cover());
    state.roles.forEach(r => preview.appendChild(roleSheet(r)));
    if(state.showHow) preview.appendChild(howItWorks());
  }

  function parseCSV(text){
    const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(Boolean);
    if(!rows.length) return [];
    const first = rows[0].toLowerCase().split(',').map(x=>x.trim());
    const hasHeader = ['name','profileurl','imageurl','notes','stage'].some(h=>first.includes(h));
    const start = hasHeader?1:0;
    const normStage = s=>{
      s = (s||'').toLowerCase().trim();
      const hit = STAGES.find(x=>x.key===s);
      return hit?hit.key:'option';
    };
    const out = [];
    for(let i=start;i<rows.length;i++){
      const parts = rows[i].split(',').map(s=>s.trim());
      const [c0,c1,c2,c3,c4] = parts;
      out.push({
        name:c0||'',
        profileUrl:c1||'',
        imageUrl:c2||'',
        notes:c3||'',
        stage:normStage(c4||'option')
      });
    }
    return out.filter(x=>x.name);
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }

  // Global buttons
  safeBind(document.getElementById('btn-add-role'),'click', ()=>{
    state.roles.push({ title:'New role', roleUrl:'', hero:'', filter:'all', talents:[] });
    render();
  });

  safeBind(document.getElementById('btn-print'),'click', ()=>{
    window.print();
  });

  // Initial render
  render();
})();
