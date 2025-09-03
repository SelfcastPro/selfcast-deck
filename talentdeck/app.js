// talentdeck/app.js — Talent Builder v4.3.0
// - White-on-black card text (handled in VIEW css)
// - Project logo upload (data URL) -> shown in VIEW header
// - Generate shared link (Bitly if configured)
// - Export PDF (Chrome/Safari safe)
// - Autosave + local projects

(function () {
  const STORE_KEY     = 'sc_talentdeck_autosave_v430';
  const PROJECTS_KEY  = 'sc_talentdeck_projects_v1';

  const $ = (id) => document.getElementById(id);
  const els = {
    title: $('deckTitle'),
    ownerName: $('ownerName'),
    ownerEmail: $('ownerEmail'),
    ownerPhone: $('ownerPhone'),

    logoInput: $('projectLogo'),
    logoPreview: $('projectLogoPreview'),

    input: $('talentInput'),
    load: $('btnLoad'),
    selectAll: $('btnSelectAll'),
    clear: $('btnClear'),
    pdf: $('btnExportPdf'),
    share: $('btnCopyShare'),
    filter: $('filterInput'),
    list: $('talentList'),
    preview: $('preview'),
    toggleClicks: $('togglePreviewClicks'),

    saveProject: $('btnSaveProject'),
    openProject: $('btnOpenProject'),
    deleteProject: $('btnDeleteProject'),
    selProject: $('selProject')
  };

  let talents  = [];
  let selected = new Map();
  let projectLogo = ''; // data URL

  // ---------- helpers ----------
  const isHttp = s => /^https?:\/\//i.test(s || '');
  const isImageUrl = s => /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(s || '') || /picsum\.photos/i.test(s || '');

  const esc = (s)=>String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const subLine = (t)=>[t.height_cm ? `${t.height_cm} cm` : '', t.country || ''].filter(Boolean).join(' · ');

  const parseLines = () => (els.input.value || '').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  function toProfileUrl(urlOrId){
    if (!urlOrId) return '';
    if (isHttp(urlOrId)) return urlOrId;
    const m = urlOrId.match(/\/talent\/([^/?#]+)/i);
    if (m) return `https://producer.selfcast.com/talent/${m[1]}`;
    return `https://producer.selfcast.com/talent/${urlOrId}`;
  }
  const idFromProfileUrl = (u)=> (String(u).match(/\/talent\/([^/?#]+)/i)?.[1] || String(u));
  function fromPipe(line){
    const p = line.split('|').map(s=>s.trim());
    const profile_url = toProfileUrl(p[0] || '');
    return {
      id: idFromProfileUrl(profile_url),
      name: p[1] || '',
      height_cm: p[2] || '',
      country: p[3] || '',
      primary_image: p[4] || '',
      requested_media_url: p[5] || '',
      profile_url
    };
  }

  // ---------- autosave ----------
  function autosave(){
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        title: els.title?.value || '',
        owner: { name: els.ownerName?.value || '', email: els.ownerEmail?.value || '', phone: els.ownerPhone?.value || '' },
        project_logo: projectLogo,
        talents
      }));
    } catch {}
  }
  function autoload(){
    try {
      const raw = localStorage.getItem(STORE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      els.title.value      = d.title || '';
      els.ownerName.value  = d.owner?.name  || '';
      els.ownerEmail.value = d.owner?.email || '';
      els.ownerPhone.value = d.owner?.phone || '';
      projectLogo          = d.project_logo || '';
      drawLogoPreview();
      talents  = Array.isArray(d.talents) ? d.talents : [];
      selected = new Map(talents.map(t => [t.id, t]));
      renderList(); openPreview();
      return true;
    } catch { return false; }
  }

  // ---------- projects ----------
  const readProjects  = ()=>{ try{ return JSON.parse(localStorage.getItem(PROJECTS_KEY)||'{}'); }catch{return{}} };
  const writeProjects = (o)=>{ try{ localStorage.setItem(PROJECTS_KEY, JSON.stringify(o||{})); }catch{} };
  function refreshProjectSelect(){
    if (!els.selProject) return;
    const names = Object.keys(readProjects()).sort((a,b)=>a.localeCompare(b));
    els.selProject.innerHTML = '<option value="">— Select saved project —</option>' + names.map(n=>`<option>${esc(n)}</option>`).join('');
  }
  function saveProject(){
    const name = (els.title?.value || '').trim(); if (!name) return alert('Give the project a name first.');
    const all = readProjects(); all[name] = currentDeckData(); writeProjects(all);
    refreshProjectSelect(); els.selProject.value = name; alert('Project saved.');
  }
  function openProject(){
    const name = els.selProject?.value; if (!name) return alert('Select a saved project first.');
    const deck = readProjects()[name]; if (!deck) return alert('Not found.');
    els.title.value      = deck.title || '';
    els.ownerName.value  = deck.owner?.name  || '';
    els.ownerEmail.value = deck.owner?.email || '';
    els.ownerPhone.value = deck.owner?.phone || '';
    projectLogo          = deck.project_logo || '';
    drawLogoPreview();
    talents  = Array.isArray(deck.talents) ? deck.talents.slice() : [];
    selected = new Map(talents.map(t => [t.id, t]));
    renderList(); autosave(); openPreview();
  }
  function deleteProject(){
    const name = els.selProject?.value; if (!name) return alert('Select a saved project.');
    if (!confirm(`Delete project "${name}"?`)) return;
    const all = readProjects(); delete all[name]; writeProjects(all);
    refreshProjectSelect(); els.selProject.value=''; alert('Deleted.');
  }

  // ---------- list render ----------
  function renderList(){
    const q = (els.filter?.value || '').toLowerCase().trim();
    els.list.innerHTML = '';
    talents.filter(t => (q ? (t.name || '').toLowerCase().includes(q) : true))
      .forEach(t=>{
        const li = document.createElement('li');
        li.className='list-item'; li.dataset.id=t.id;
        li.innerHTML = `
          <label class="chk">
            <input type="checkbox" data-id="${t.id}" ${selected.has(t.id)?'checked':''}/>
            <span class="avatar" style="background-image:url('${t.primary_image||''}')"></span>
            <span class="meta">
              <strong>${esc(t.name||'Unnamed')}</strong>
              <small>${esc(subLine(t) || t.id)}</small>
            </span>
          </label>
          <div class="btnrow">
            <button class="btn small edit-btn" data-id="${t.id}">Edit</button>
            <button class="btn small danger remove-btn" data-id="${t.id}">Remove</button>
          </div>
          <form class="edit-panel" data-id="${t.id}">
            <div class="edit-grid">
              <label class="field">Name <input name="name" value="${esc(t.name||'')}"/></label>
              <label class="field">Height (cm) <input name="height_cm" type="number" inputmode="numeric" value="${esc(t.height_cm||'')}"/></label>
              <label class="field">Country <input name="country" value="${esc(t.country||'')}"/></label>
              <label class="field">Profile URL <input name="profile_url" value="${esc(t.profile_url||'')}" placeholder="https://producer.selfcast.com/talent/..."/></label>
              <label class="field">Requested media URL <input name="requested_media_url" value="${esc(t.requested_media_url||'')}" placeholder="https://…"/></label>
              <label class="field">Image URL <input name="primary_image" value="${esc(t.primary_image||'')}" placeholder="https://…/photo.jpg"/></label>
            </div>
            <div class="row">
              <button class="btn small primary save-edit" type="submit">Save</button>
              <button class="btn small cancel-edit" type="button">Cancel</button>
            </div>
          </form>`;
        els.list.appendChild(li);
      });
  }

  // ---------- payload + preview ----------
  function currentDeckData(){
    const arr = talents.filter(t => selected.has(t.id));
    return {
      kind: 'talent-deck',
      title: els.title?.value || 'Untitled',
      created_at: new Date().toISOString(),
      project_logo: projectLogo || '',
      owner: {
        name : els.ownerName?.value || 'Selfcast',
        email: els.ownerEmail?.value || 'info@selfcast.com',
        phone: els.ownerPhone?.value || '+45 22 81 31 13'
      },
      talents: arr.map(t=>({
        id:t.id, name:t.name, primary_image:t.primary_image||'',
        profile_url:t.profile_url||'', requested_media_url:t.requested_media_url||'',
        height_cm:t.height_cm||'', country:t.country||''
      }))
    };
  }
  function openPreview(){
    const deck = currentDeckData();
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(deck))));
    const url  = deck.talents?.length ? `/view-talent/?density=12&data=${data}` : '/view-talent/?demo=1';
    els.preview.src = url;
  }

  // ---------- textarea loader (new items at TOP) ----------
  const isImageUrlLine = (s)=>isImageUrl(s);
  function upsertTop(t){
    const idx = talents.findIndex(x => String(x.id) === String(t.id));
    if (idx >= 0){ talents[idx] = { ...talents[idx], ...t }; selected.set(t.id, talents[idx]); }
    else { talents.unshift(t); selected.set(t.id, t); }
  }
  function loadFromTextarea(){
    const lines = parseLines(); if (!lines.length) return alert('Paste at least one talent link or ID');

    for (let i = lines.length - 1; i >= 0; i--){
      const raw = lines[i];

      if (isImageUrlLine(raw) && i > 0 && !lines[i-1].includes('|')){
        const profile_url = toProfileUrl(lines[i-1]);
        upsertTop({ id:idFromProfileUrl(profile_url), name:'', height_cm:'', country:'', primary_image:raw, requested_media_url:'', profile_url });
        i -= 1; continue;
      }

      if (raw.includes('|')) { upsertTop(fromPipe(raw)); continue; }

      const profile_url = toProfileUrl(raw);
      upsertTop({ id:idFromProfileUrl(profile_url), name:'', height_cm:'', country:'', primary_image:'', requested_media_url:'', profile_url });
    }

    els.input.value = '';
    renderList(); autosave(); openPreview();
  }

  // ---------- share (Bitly if configured) ----------
  async function shorten(longUrl){
    try {
      const res = await fetch('/api/bitly', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ long_url: longUrl })
      });
      if (!res.ok) return longUrl;
      const j = await res.json();
      return j.link || longUrl;
    } catch { return longUrl; }
  }
  async function copyShare(){
    const deck = currentDeckData();
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(deck))));
    const longUrl = `${location.origin}/view-talent/?density=12&data=${data}`;
    const shortUrl = await shorten(longUrl);
    try {
      await navigator.clipboard.writeText(shortUrl);
      alert('Share link copied:\n' + shortUrl);
    } catch {
      prompt('Copy link:', shortUrl);
    }
  }

  // ---------- logo input ----------
  function drawLogoPreview(){
    if (!els.logoPreview) return;
    if (projectLogo){
      els.logoPreview.innerHTML = `<img src="${projectLogo}" alt="Project logo" />`;
      els.logoPreview.style.display = 'block';
    } else {
      els.logoPreview.innerHTML = '';
      els.logoPreview.style.display = 'none';
    }
  }
  els.logoInput?.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if (!f) { projectLogo=''; drawLogoPreview(); autosave(); openPreview(); return; }
    const r = new FileReader();
    r.onload = () => { projectLogo = String(r.result||''); drawLogoPreview(); autosave(); openPreview(); };
    r.readAsDataURL(f);
  });

  // ---------- events ----------
  els.load?.addEventListener('click', loadFromTextarea);
  els.selectAll?.addEventListener('click', ()=>{ talents.forEach(t=>selected.set(t.id,t)); renderList(); autosave(); openPreview(); });
  els.clear?.addEventListener('click', ()=>{ talents=[]; selected.clear(); els.list.innerHTML=''; autosave(); openPreview(); });

  [els.title, els.ownerName, els.ownerEmail, els.ownerPhone].forEach(inp=>{
    inp?.addEventListener('input', ()=>{ autosave(); openPreview(); });
  });
  els.filter?.addEventListener('input', renderList);

  els.list?.addEventListener('click', (e)=>{
    const editBtn = e.target.closest('.edit-btn');
    const removeBtn = e.target.closest('.remove-btn');
    const cancelBtn = e.target.closest('.cancel-edit');

    if (editBtn){
      const id = editBtn.dataset.id;
      const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
      li?.classList.toggle('open');
    }
    if (removeBtn){
      const id = removeBtn.dataset.id;
      talents = talents.filter(t=>String(t.id)!==String(id));
      selected.delete(id);
      renderList(); autosave(); openPreview();
    }
    if (cancelBtn){
      cancelBtn.closest('li.list-item')?.classList.remove('open');
    }
  });

  els.list?.addEventListener('change', (e)=>{
    const cb = e.target;
    if (cb?.dataset?.id){
      const t = talents.find(x=>String(x.id)===String(cb.dataset.id));
      if (cb.checked) selected.set(t.id, t); else selected.delete(t.id);
      autosave(); openPreview();
    }
  });

  els.list?.addEventListener('submit', (e)=>{
    const form = e.target.closest('form.edit-panel'); if (!form) return;
    e.preventDefault();
    const id  = form.dataset.id;
    const idx = talents.findIndex(x=>String(x.id)===String(id)); if (idx<0) return;
    const fd  = new FormData(form);
    const t   = talents[idx];
    t.name                = (fd.get('name')||'').toString().trim();
    t.height_cm           = (fd.get('height_cm')||'').toString().trim();
    t.country             = (fd.get('country')||'').toString().trim();
    t.profile_url         = (fd.get('profile_url')||'').toString().trim();
    t.requested_media_url = (fd.get('requested_media_url')||'').toString().trim();
    t.primary_image       = (fd.get('primary_image')||'').toString().trim();
    talents[idx] = t; selected.set(t.id,t);
    renderList(); autosave(); openPreview();
    const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`); li?.classList.add('open');
  });

  // Buttons
  els.pdf?.addEventListener('click', ()=>{ els.preview.contentWindow?.postMessage({ type:'print' }, '*'); });
  els.share?.addEventListener('click', copyShare);

  // Preview click toggle (default ON)
  function applyPreviewClicks(){
    const on = els.toggleClicks ? els.toggleClicks.checked : true;
    els.preview.style.pointerEvents = on ? 'auto' : 'none';
  }
  els.toggleClicks?.addEventListener('change', applyPreviewClicks);
  applyPreviewClicks();

  // Project buttons
  els.saveProject?.addEventListener('click', saveProject);
  els.openProject?.addEventListener('click', openProject);
  els.deleteProject?.addEventListener('click', deleteProject);
  refreshProjectSelect();

  // Init
  const restored = autoload();
  if (!restored) els.preview.src = '/view-talent/?demo=1';
  console.log('[talentdeck v4.3.0] ready');
})();
