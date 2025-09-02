// talentdeck/app.js — no-API builder med inline Edit, autosave, recent 20

(function () {
  const STORE_KEY  = 'sc_talentdeck_v1';
  const RECENT_KEY = 'sc_talentdeck_recent_v1';

  const els = {
    title:     document.getElementById('deckTitle'),
    input:     document.getElementById('talentInput'),
    load:      document.getElementById('btnLoad'),
    selectAll: document.getElementById('btnSelectAll'),
    clear:     document.getElementById('btnClear'),
    gen:       document.getElementById('btnGenerate'),
    pdf:       document.getElementById('btnExportPdf'),
    prev:      document.getElementById('btnPrev'),
    next:      document.getElementById('btnNext'),
    filter:    document.getElementById('filterInput'),
    list:      document.getElementById('talentList'),
    preview:   document.getElementById('preview'),
  };

  let talents  = [];
  let selected = new Map();

  // ---------- helpers ----------
  function parseLines() {
    return (els.input.value || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // urlOrId | name | height_cm | country | imageUrl | email | requestedMediaUrl
  function parseLine(line) {
    const parts = line.split('|').map(s => s.trim());
    const urlOrId = parts[0] || '';
    const name    = parts[1] || '';
    const height  = parts[2] || '';
    const country = parts[3] || '';
    const imgUrl  = parts[4] || '';
    const email   = parts[5] || '';
    const reqMed  = parts[6] || '';

    let profile_url = urlOrId;
    if (!/^https?:\/\//i.test(profile_url)) {
      const m = urlOrId.match(/\/talent\/([^/?#]+)/i);
      if (m) profile_url = `https://producer.selfcast.com/talent/${m[1]}`;
      else if (urlOrId) profile_url = `https://producer.selfcast.com/talent/${urlOrId}`;
    }
    let id = urlOrId || profile_url;
    const mid = String(profile_url).match(/\/talent\/([^/?#]+)/i);
    if (mid) id = mid[1];

    return {
      id,
      name: name || id,
      primary_image: imgUrl || '',
      profile_url,
      requested_media_url: reqMed || '',
      height_cm: height || '',
      country: country || '',
      email: email || ''
    };
  }

  function uniqPushRecent(urlOrId) {
    try {
      const rec = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const val = String(urlOrId || '').trim();
      if (!val) return;
      const next = [val, ...rec.filter(x => x !== val)].slice(0, 20);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function saveDeck() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        title: els.title.value || '',
        talents
      }));
    } catch (e) { console.warn('Could not save deck', e); }
  }

  function loadDeckFromStorage() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      els.title.value = data.title || '';
      talents = Array.isArray(data.talents) ? data.talents : [];
      selected = new Map(talents.map(t => [t.id, t]));
      renderList();
      openPreview();
      return true;
    } catch { return false; }
  }

  function maybePrefillRecent() {
    if (els.input.value.trim()) return;
    try {
      const rec = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (rec.length) els.input.value = rec.join('\n');
    } catch {}
  }

  function subLine(t) {
    return [t.height_cm ? `${t.height_cm} cm` : '', t.country || ''].filter(Boolean).join(' · ');
  }

  function renderList() {
    const q = (els.filter.value || '').toLowerCase().trim();
    els.list.innerHTML = '';
    talents
      .filter(t => (q ? (t.name || '').toLowerCase().includ
