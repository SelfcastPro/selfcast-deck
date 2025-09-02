// talentdeck/app.js — simple, no-API, autosave + recent 20

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

  // Basic sanity (IDs must exist)
  for (const [k, v] of Object.entries(els)) {
    if (!v) { console.error('[talentdeck] Missing element:', k); }
  }

  let talents  = [];          // full list (array of objects)
  let selected = new Map();   // id -> object

  // ---------- helpers ----------
  function parseLines() {
    return (els.input.value || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Accept "urlOrId | name | height_cm | country | imageUrl | email | requestedMediaUrl"
  // or just a URL / ID (we’ll derive reasonable defaults)
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
      primary_image: imgUrl || '', // sort/hvid sker i view
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
      // keep unique, most-recent-first, max 20
      const next = [val, ...rec.filter(x => x !== val)].slice(0, 20);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function renderList() {
    const q = (els.filter.value || '').toLowerCase().trim();
    els.list.innerHTML = '';
    talents
      .filter(t => (q ? (t.name || '').toLowerCase().includes(q) : true))
      .forEach(t => {
        const li = document.createElement('li');
        li.className = 'list-item';
        const sub = [t.height_cm ? `${t.height_cm} cm` : '', t.country || ''].filter(Boolean).join(' · ');
        li.innerHTML = `
          <label class="chk">
            <input type="checkbox" data-id="${t.id}" ${selected.has(t.id) ? 'checked' : ''}/>
            <span class="avatar" style="background-image:url('${t.primary_image || ''}')"></span>
            <span class="meta">
              <strong>${t.name || 'Unnamed'}</strong>
              <small>${sub || t.id}</small>
            </span>
          </label>
        `;
        els.list.appendChild(li);
      });
  }

  function currentDeckData() {
    const arr = Array.from(selected.values());
    return {
      kind: 'talent-deck',
      title: els.title.value || 'Untitled',
      created_at: new Date().toISOString(),
      owner: { name: 'Selfcast', email: 'info@selfcast.com', phone: '+45 22 81 31 13' },
      talents: arr.map(t => ({
        id: t.id,
        name: t.name,
        primary_image: t.primary_image || '',
        profile_url: t.profile_url,
        requested_media_url: t.requested_media_url || '',
        height_cm: t.height_cm || '',
        country: t.country || '',
        email: t.email || ''
      }))
    };
  }

  function saveDeck() {
    try {
      const data = {
        title: els.title.value || '',
        talents
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save deck', e);
    }
  }

  function loadDeckFromStorage() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      els.title.value = data.title || '';
      talents = Array.isArray(data.talents) ? data.talents : [];
      selected = new Map(talents.map(t => [t.id, t])); // select all by default
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

  function openPreview() {
    const json = JSON.stringify(currentDeckData());
    const data = btoa(unescape(encodeURIComponent(json)));
    els.preview.src = `/view-talent/?data=${data}`;
  }

  async function shorten(url) {
    try {
      const res = await fetch('/api/bitly', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ long_url: url })
      });
      if (!res.ok) return url;
      const j = await res.json();
      return j.link || url;
    } catch { return url; }
  }

  // ---------- events ----------
  els.load.addEventListener('click', () => {
    const lines = parseLines();
    if (!lines.length) {
      alert('Indsæt mindst ét talent. Format: urlOrId | name | height_cm | country | imageUrl | email | requestedMediaUrl (felter valgfrie)');
      return;
    }

    for (const line of lines) {
      const t = parseLine(line);
      // avoid duplicates by id
      const exists = talents.findIndex(x => String(x.id) === String(t.id));
      if (exists >= 0) {
        talents[exists] = t;            // overwrite existing
      } else {
        talents.push(t);                 // append
      }
      selected.set(t.id, t);
      // remember recent (first field only)
      const firstField = line.split('|')[0].trim();
      uniqPushRecent(firstField);
    }

    renderList();
    saveDeck();
    openPreview();
    els.input.value = ''; // klar til at tilføje næste talent
  });

  els.selectAll.addEventListener('click', () => {
    talents.forEach(t => selected.set(t.id, t));
    renderList();
    saveDeck();
    openPreview();
  });

  els.clear.addEventListener('click', () => {
    talents = [];
    selected.clear();
    els.list.innerHTML = '';
    saveDeck();
    openPreview();
  });

  els.list.addEventListener('change', (e) => {
    const cb = e.target;
    if (cb?.dataset?.id) {
      const t = talents.find(x => String(x.id) === String(cb.dataset.id));
      if (!t) return;
      if (cb.checked) selected.set(t.id, t);
      else selected.delete(t.id);
      saveDeck();
      openPreview();
    }
  });

  els.filter.addEventListener('input', renderList);
  els.title.addEventListener('input', () => { saveDeck(); openPreview(); });

  els.gen.addEventListener('click', async () => {
    const json = JSON.stringify(currentDeckData());
    const data = btoa(unescape(encodeURIComponent(json)));
    const shareUrl = `${location.origin}/view-talent/?data=${data}`;
    els.preview.src = shareUrl;

    let urlToCopy = shareUrl;
    try { urlToCopy = await shorten(shareUrl); } catch {}
    try {
      await navigator.clipboard.writeText(urlToCopy);
      alert(`Share link copied:\n${urlToCopy}`);
    } catch {
      alert(`Share link:\n${urlToCopy}`);
    }
  });

  els.pdf.addEventListener('click', () => {
    els.preview.contentWindow?.postMessage({ type: 'print' }, '*');
  });

  els.prev.addEventListener('click', () => history.back());
  els.next.addEventListener('click', () => (location.href = '/view-talent/'));

  // ---------- init ----------
  // Make sure iframe can't steal clicks
  const preview = document.querySelector('.preview');
  if (preview) {
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '0';
  }

  // Restore previous deck (if any). If none, prefill textarea with the recent list.
  const restored = loadDeckFromStorage();
  if (!restored) maybePrefillRecent();
})();
