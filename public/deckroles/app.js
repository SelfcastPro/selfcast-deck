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
  const rolesWrap = id('rolesWrap');
  const preview = id('preview');

  function safeBind(el, event, handler){ if (el) el.addEventListener(event, handler, false); }

  // Inputs
  safeBind(id('brandLogo'),'input', e => { state.brand.logoUrl = e.target.value; render(); });
  safeBind(id('brandWordmark'),'input', e => { state.brand.wordmark = e.target.value; render(); });
  safeBind(id('brandSubtitle'),'input', e => { state.brand.subtitle = e.target.value; render(); });
  safeBind(id('brandShow'),'change', e => { state.brand.showWordmark = e.target.value === "1"; render(); });
  safeBind(id('contactPerson'),'input', e => { state.contact.person = e.target.value; render(); });
  safeBind(id('contactEmail'),'input', e => { state.contact.email = e.target.value; render(); });
  safeBind(id('contactPhone'),'input', e => { state.contact.phone = e.target.value; render(); });

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
          <textarea placeholder="name, profileUrl, imageUrl, notes, stage&#10;Jane Doe, https://producer.selfcast.com/ta
