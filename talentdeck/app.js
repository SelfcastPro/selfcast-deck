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
      .filter(t => (q ? (t.name || '').toLowerCase().includes(q) : true))
      .forEach(t => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.dataset.id = t.id;

        li.innerHTML = `
          <label class="chk">
            <input type="checkbox" data-id="${t.id}" ${selected.has(t.id) ? 'checked' : ''}/>
            <span class="avatar" style="background-image:url('${t.primary_image || ''}')"></span>
            <span class="meta">
              <strong>${t.name || 'Unnamed'}</strong>
              <small>${subLine(t) || t.id}</small>
            </span>
          </label>

          <div class="btnrow">
            <button class="btn small edit-btn" data-id="${t.id}">Edit</button>
            <button class="btn small danger remove-btn" data-id="${t.id}">Remove</button>
          </div>

          <form class="edit-panel" data-id="${t.id}">
            <div class="edit-grid">
              <label class="field">Name
                <input name="name" value="${escapeHtml(t.name || '')}" />
              </label>
              <label class="field">Height (cm)
                <input name="height_cm" type="number" inputmode="numeric" value="${escapeAttr(t.height_cm || '')}" />
              </label>
              <label class="field">Country
                <input name="country" value="${escapeHtml(t.country || '')}" />
              </label>
              <label class="field">Email
                <input name="email" type="email" value="${escapeHtml(t.email || '')}" />
              </label>
              <label class="field">Profile URL
                <input name="profile_url" value="${escapeAttr(t.profile_url || '')}" />
              </label>
              <label class="field">Requested media URL
                <input name="requested_media_url" value="${escapeAttr(t.requested_media_url || '')}" />
              </label>
              <label class="field">Image URL
                <input name="primary_image" value="${escapeAttr(t.primary_image || '')}" placeholder="https://…" />
              </label>
            </div>
            <div class="row">
              <button class="btn small primary save-edit" type="submit">Save</button>
              <button class="btn small cancel-edit" type="button">Cancel</button>
            </div>
          </form>
        `;
        els.list.appendChild(li);
      });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escapeAttr(s){ return escapeHtml(s); }

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
      alert('Indsæt mindst ét talent. Format: urlOrId | name | height_cm | country | imageUrl | email | requestedMediaUrl');
      return;
    }
    for (const line of lines) {
      const t = parseLine(line);
      const idx = talents.findIndex(x => String(x.id) === String(t.id));
      if (idx >= 0) talents[idx] = t; else talents.push(t);
      selected.set(t.id, t);
      const first = line.split('|')[0].trim(); uniqPushRecent(first);
    }
    renderList(); saveDeck(); openPreview();
    els.input.value = ''; // klar til næste
  });

  els.selectAll.addEventListener('click', () => {
    talents.forEach(t => selected.set(t.id, t));
    renderList(); saveDeck(); openPreview();
  });

  els.clear.addEventListener('click', () => {
    talents = []; selected.clear(); els.list.innerHTML = '';
    saveDeck(); openPreview();
  });

  els.filter.addEventListener('input', renderList);
  els.title.addEventListener('input', () => { saveDeck(); openPreview(); });

  // Delegation for Edit/Remove + Save/Cancel
  els.list.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const removeBtn = e.target.closest('.remove-btn');
    const cancelBtn = e.target.closest('.cancel-edit');

    if (editBtn) {
      const id = editBtn.dataset.id;
      const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
      if (li) li.classList.toggle('open');
    }

    if (removeBtn) {
      const id = removeBtn.dataset.id;
      talents = talents.filter(t => String(t.id) !== String(id));
      selected.delete(id);
      renderList(); saveDeck(); openPreview();
    }

    if (cancelBtn) {
      const li = cancelBtn.closest('li.list-item');
      if (li) li.classList.remove('open');
    }
  });

  // Handle checkbox select/deselect
  els.list.addEventListener('change', (e) => {
    const cb = e.target;
    if (cb?.dataset?.id) {
      const t = talents.find(x => String(x.id) === String(cb.dataset.id));
      if (!t) return;
      if (cb.checked) selected.set(t.id, t);
      else selected.delete(t.id);
      saveDeck(); openPreview();
    }
  });

  // Edit form submit (Save)
  els.list.addEventListener('submit', (e) => {
    const form = e.target.closest('form.edit-panel');
    if (!form) return;
    e.preventDefault();

    const id = form.dataset.id;
    const idx = talents.findIndex(x => String(x.id) === String(id));
    if (idx < 0) return;

    const fd = new FormData(form);
    const t = talents[idx];
    t.name = (fd.get('name') || '').toString().trim();
    t.height_cm = (fd.get('height_cm') || '').toString().trim();
    t.country = (fd.get('country') || '').toString().trim();
    t.email = (fd.get('email') || '').toString().trim();
    t.profile_url = (fd.get('profile_url') || '').toString().trim();
    t.requested_media_url = (fd.get('requested_media_url') || '').toString().trim();
    t.primary_image = (fd.get('primary_image') || '').toString().trim();

    talents[idx] = t;
    selected.set(t.id, t);

    renderList(); saveDeck(); openPreview();

    // keep the edited one open for visual confirmation
    const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (li) li.classList.add('open');
  });

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
  // Klik-bug guard: gør iframen ikke-klikbar
  if (els.preview) { els.preview.style.pointerEvents = 'none'; els.preview.style.zIndex = '0'; }

  const restored = loadDeckFromStorage();
  if (!restored) maybePrefillRecent();
})();
