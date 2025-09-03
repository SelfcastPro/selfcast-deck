// Talent Builder — simple, English, no-API, autosave, recent 20, inline edit + preview click toggle
(function () {
  const STORE_KEY  = 'sc_talentdeck_v4';
  const RECENT_KEY = 'sc_talentdeck_recent_v1';

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
    gen: $('btnGenerate'),
    pdf: $('btnExportPdf'),
    prev: $('btnPrev'),
    next: $('btnNext'),
    filter: $('filterInput'),
    list: $('talentList'),
    preview: $('preview'),
    toggleClicks: $('togglePreviewClicks'),
  };

  let talents  = [];
  let selected = new Map();

  // --- helpers ---
  const isHttp = s => /^https?:\/\//i.test(s);
  const isImageUrl = s => /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(s) || /picsum\.photos/i.test(s);

  function parseLines() {
    return (els.input.value || '')
      .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  function toProfileUrl(urlOrId) {
    if (!urlOrId) return '';
    if (isHttp(urlOrId)) return urlOrId;
    const m = urlOrId.match(/\/talent\/([^/?#]+)/i);
    if (m) return `https://producer.selfcast.com/talent/${m[1]}`;
    return `https://producer.selfcast.com/talent/${urlOrId}`;
  }
  function idFromProfileUrl(u) {
    const m = String(u).match(/\/talent\/([^/?#]+)/i);
    return m ? m[1] : String(u);
  }
  // Pipe: profile | name | height | country | image | requested
  function fromPipe(line) {
    const p = line.split('|').map(s => s.trim());
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

  function uniqPushRecent(s) {
    try {
      const rec = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const val = String(s || '').trim();
      if (!val) return;
      const next = [val, ...rec.filter(x => x !== val)].slice(0, 20);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function saveDeck() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        title: els.title.value || '',
        owner: {
          name: els.ownerName.value || '',
          email: els.ownerEmail.value || '',
          phone: els.ownerPhone.value || ''
        },
        talents
      }));
    } catch {}
  }
  function loadDeck() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      els.title.value = d.title || '';
      els.ownerName.value = d.owner?.name || '';
      els.ownerEmail.value = d.owner?.email || '';
      els.ownerPhone.value = d.owner?.phone || '';
      talents = Array.isArray(d.talents) ? d.talents : [];
      selected = new Map(talents.map(t => [t.id, t]));
      renderList(); openPreview();
      return true;
    } catch { return false; }
  }
  function prefillRecent() {
    if (els.input.value.trim()) return;
    try {
      const rec = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (rec.length) els.input.value = rec.join('\n');
    } catch {}
  }

  function subLine(t) {
    return [t.height_cm ? `${t.height_cm} cm` : '', t.country || ''].filter(Boolean).join(' · ');
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

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
                <input name="name" value="${esc(t.name || '')}"/>
              </label>
              <label class="field">Height (cm)
                <input name="height_cm" type="number" inputmode="numeric" value="${esc(t.height_cm || '')}"/>
              </label>
              <label class="field">Country
                <input name="country" value="${esc(t.country || '')}"/>
              </label>
              <label class="field">Profile URL
                <input name="profile_url" value="${esc(t.profile_url || '')}" placeholder="https://producer.selfcast.com/talent/..."/>
              </label>
              <label class="field">Requested media URL
                <input name="requested_media_url" value="${esc(t.requested_media_url || '')}" placeholder="https://…"/>
              </label>
              <label class="field">Image URL
                <input name="primary_image" value="${esc(t.primary_image || '')}" placeholder="https://…/photo.jpg"/>
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

  function currentDeckData() {
    const arr = Array.from(selected.values());
    return {
      kind: 'talent-deck',
      title: els.title.value || 'Untitled',
      created_at: new Date().toISOString(),
      owner: {
        name: els.ownerName.value || 'Selfcast',
        email: els.ownerEmail.value || 'info@selfcast.com',
        phone: els.ownerPhone.value || '+45 22 81 31 13'
      },
      talents: arr.map(t => ({
        id: t.id,
        name: t.name,
        primary_image: t.primary_image || '',
        profile_url: t.profile_url || '',
        requested_media_url: t.requested_media_url || '',
        height_cm: t.height_cm || '',
        country: t.country || ''
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

  // --------- LOAD ----------
  function loadFromTextarea() {
    const lines = parseLines();
    if (!lines.length) { alert('Paste at least one talent link or ID'); return; }

    let last = null;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      if (raw.includes('|')) {
        const t = fromPipe(raw);
        upsert(t);
        uniqPushRecent(raw.split('|')[0].trim());
        last = t;
        continue;
      }

      const profile_url = toProfileUrl(raw);
      const t = {
        id: idFromProfileUrl(profile_url),
        name: '', height_cm: '', country: '',
        primary_image: '', requested_media_url: '',
        profile_url
      };
      upsert(t);
      uniqPushRecent(raw);
      last = t;

      const next = lines[i + 1];
      if (next && isImageUrl(next)) { t.primary_image = next.trim(); touch(t); i += 1; }
    }

    renderList(); saveDeck(); openPreview();
    els.input.value = '';
  }

  function upsert(t) {
    const idx = talents.findIndex(x => String(x.id) === String(t.id));
    if (idx >= 0) talents[idx] = { ...talents[idx], ...t };
    else talents.push(t);
    selected.set(t.id, idx >= 0 ? talents[idx] : t);
  }
  function touch(t) {
    const idx = talents.findIndex(x => String(x.id) === String(t.id));
    if (idx >= 0) talents[idx] = { ...t };
    selected.set(t.id, talents[idx] || t);
  }

  // --------- Events ----------
  els.load.addEventListener('click', loadFromTextarea);

  els.selectAll.addEventListener('click', () => {
    talents.forEach(t => selected.set(t.id, t));
    renderList(); saveDeck(); openPreview();
  });

  els.clear.addEventListener('click', () => {
    talents = []; selected.clear(); els.list.innerHTML = '';
    saveDeck(); openPreview();
  });

  [els.title, els.ownerName, els.ownerEmail, els.ownerPhone].forEach(inp =>
    inp.addEventListener('input', () => { saveDeck(); openPreview(); })
  );

  els.filter.addEventListener('input', renderList);

  // Edit / Remove / Cancel
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
    t.profile_url = (fd.get('profile_url') || '').toString().trim();
    t.requested_media_url = (fd.get('requested_media_url') || '').toString().trim();
    t.primary_image = (fd.get('primary_image') || '').toString().trim();

    talents[idx] = t;
    selected.set(t.id, t);
    renderList(); saveDeck(); openPreview();

    const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (li) li.classList.add('open');
  });

  els.gen.addEventListener('click', async () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(currentDeckData()))));
    const shareUrl = `${location.origin}/view-talent/?data=${data}`;
    els.preview.src = shareUrl;

    let urlToCopy = shareUrl;
    try { urlToCopy = await shorten(shareUrl); } catch {}
    try { await navigator.clipboard.writeText(urlToCopy); alert(`Share link copied:\n${urlToCopy}`); }
    catch { alert(`Share link:\n${urlToCopy}`); }
  });

  els.pdf.addEventListener('click', () => {
    els.preview.contentWindow?.postMessage({ type: 'print' }, '*');
  });

  els.prev.addEventListener('click', () => history.back());
  els.next.addEventListener('click', () => (location.href = '/view-talent/'));

  // Preview click toggle
  function applyPreviewClicks(){
    els.preview.style.pointerEvents = els.togglePreviewClicks.checked ? 'auto' : 'none';
  }
  els.togglePreviewClicks.addEventListener('change', applyPreviewClicks);

  // Init
  const restored = loadDeck();
  if (!restored) prefillRecent();
  applyPreviewClicks();
})();
