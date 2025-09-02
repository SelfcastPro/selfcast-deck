// talentdeck/app.js — robust no-API version with logs

(function(){
  console.log('[talentdeck] script loaded');

  // ---- Grab DOM ----
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

  // Safety: verify all IDs exist
  for (const [k,v] of Object.entries(els)) {
    if (!v) { alert('Missing element: ' + k); console.error('Missing element', k); return; }
  }

  let talents = [];
  let selected = new Map();

  function parseLines() {
    return (els.input.value || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // support "url | name | height | country | imageUrl" OR just plain URL/ID
  function normalizeProfile(line) {
    const parts = line.split('|').map(s => s.trim());
    const urlOrId = parts[0] || '';
    const name    = parts[1] || '';
    const height  = parts[2] || '';
    const country = parts[3] || '';
    const imgUrl  = parts[4] || '';

    let profile_url = urlOrId;
    if (!/^https?:\/\//i.test(profile_url)) {
      const m = urlOrId.match(/\/talent\/([^/?#]+)/i);
      if (m) {
        profile_url = `https://producer.selfcast.com/talent/${m[1]}`;
      } else if (urlOrId) {
        profile_url = `https://producer.selfcast.com/talent/${urlOrId}`;
      }
    }
    let id = urlOrId || profile_url;
    const mid = String(profile_url).match(/\/talent\/([^/?#]+)/i);
    if (mid) id = mid[1];

    return {
      id,
      name: name || id,
      primary_image: imgUrl || '',
      profile_url,
      requested_media_url: '',
      height_cm: height || '',
      country: country || ''
    };
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

  // ---- Events ----
  els.load.addEventListener('click', () => {
    console.log('[talentdeck] Load clicked');
    const lines = parseLines();
    if (!lines.length) {
      alert('Indsæt mindst ét talent: URL/ID eller pipe-format: url | name | height_cm | country | imageUrl_

            console.log('[talentdeck] ready');
document.getElementById('btnLoad')?.addEventListener('click', () => {
  console.log('[talentdeck] Load clicked');
});
