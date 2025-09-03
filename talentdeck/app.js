// talentdeck/app.js — Talent Builder v4.2.2
// - Only "Export PDF" in header
// - New items are added at TOP
// - Autosave + local projects
// - Preview updates live; no "Generate" step

(function () {
  const STORE_KEY     = 'sc_talentdeck_autosave_v420';
  const RECENT_KEY    = 'sc_talentdeck_recent_v1';
  const PROJECTS_KEY  = 'sc_talentdeck_projects_v1';

  const $ = (id) => document.getElementById(id);
  const els = {
    title: $('deckTitle'),
    ownerName: $('ownerName'),
    ownerEmail: $('ownerEmail'),
    ownerPhone: $('ownerPhone'),

    input: $('talentInput'),
    load: $('btnLoad'),
    selectAll: $('btnSelectAll'),
    clear: $('btnClear'),
    pdf: $('btnExportPdf'),
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

  function autosave(){
    try { localStorage.setItem(STORE_KEY, JSON.stringify({
      title: els.title?.value || '',
      owner: { name: els.ownerName?.value || '', email: els.ownerEmail?.value || '', phone: els.ownerPhone?.value || '' },
      talents
    })); } catch {}
  }
  function autoload(){
    try {
      const raw = localStorage.getItem(STORE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      els.title.value      = d.title || '';
      els.ownerName.value  = d.owner?.name  || '';
      els.ownerEmail.value = d.owner?.email || '';
      els.ownerPhone.value = d.owner?.phone || '';
      talents  = Array.isArray(d.talents) ? d.talents : [];
      selected = new Map(talents.map(t => [t.id, t]));
      renderList(); openPreview();
      return true;
    } catch { return false; }
  }

  // Projects
  const readProjects  = ()=>{ try{ return JSON.parse(localStorage.getItem('sc_talentdeck_projects_v1')||'{}'); }catch{return{}} };
  const writeProjects = (o)=>{ try{ localStorage.setItem('sc_talentdeck_projects_v1', JSON.stringify(o||{})); }catch{} };
  function refreshProjectSelect(){
    if (!els.selProject) return;
    const names = Object.keys(readProjects()).sort((a,b)=>a.localeCompare(b));
    els.selProject.innerHTML = '<option value="">— Select saved project —</option>' + names.map(n=>`<option>${esc(n)}</option>`).join('');
  }
  function saveProject()
