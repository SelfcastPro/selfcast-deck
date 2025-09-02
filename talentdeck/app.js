// talentdeck/app.js — clean, English, no-API builder with autosave + inline edit

(function () {
  const STORE_KEY  = 'sc_talentdeck_v3';
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

  // ---------- utils ----------
  const isHttp = s => /^https?:\/\//i.test(s);
  const isImageUrl = s => /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(s) || /picsum\.photos/i.test(s);

  function parseLines() {
    return (els.input.value || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
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

  // Pipe format: profile | name | height | country | image | requested
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
      localStorage.setItem(STORE_KEY, JSON.stringify({ title: els.title.value || '', talents }));
    } catch {}
  }

  function loadDeckFromStorage() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      els.title.value = d.title || '';
      talents = Array.isArray(d.talents) ? d.talents : [];
      selected = new Map(talents.map(t => [t.id, t]));
      renderList(); openPreview();
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
    return [t.height_cm ? `${t.height_cm} cm` : '', t.country || '']
      .filter(Boolean).join(' · ');
  }

  // ---------- render ----------
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
              <label class="field">Profile URL
                <input name="profile_url" value="${escapeAttr(t.profile_url || '')}" />
              </label>
              <label class="field">Requested media URL
                <input name="requested_media_url" value="${escapeAttr(t.requested_media_url || '')}" />
              </label>
              <label class="field">Image URL
                <input name="primary_image" value="${escapeAttr(t.primary_image || '')}" placeholder="https://…/photo.jpg" />
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

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escapeAttr(s){ return escapeHtml(s); }

  // ---------- data for preview ----------
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

  // ---------- load logic ----------
  // Supported input:
  //  (A) "profile | name | height | country | image | requested"
  //  (B) profile (line)  + optional next lines: "img: url", "req: url"
  //      If the very next line is an image URL, it becomes the primary image.
  function loadFromTextarea() {
    const lines = parseLines();
    if (!lines.length) {
      alert('Paste at least one talent.\nEither: "profile | name | height_cm | country | imageUrl | requestedUrl"\nOr lines:\n<profile>\nimg: <image>\nreq: <url>');
      return;
    }

    let last = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      // Pipe format
      if (raw.includes('|')) {
        const t = fromPipe(raw);
        upsert(t);
        uniqPushRecent(raw.split('|')[0].trim());
        last = t;
        continue;
      }

      // Prefixed helpers
      if (raw.toLowerCase().startsWith('img:')) {
        if (last) {
          const url = raw.slice(4).trim();
          if (url) { last.primary_image = url; touch(last); }
        }
        continue;
