// talentdeck/app.js

const els = {
  title:     document.getElementById('deckTitle'),
  input:     document.getElementById('talentInput'),
  minImages: document.getElementById('minImages'), // ignoreres pt. (ét billede pr. talent)
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

let talents = [];           // loaded talents (array)
let selected = new Map();   // id -> talent (selected)

// Helpers
function parseLines() {
  return els.input.value
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Accept full URL (/talent/<id>) OR raw id (uuid/slug/numeric)
function extractTalentId(s) {
  const m = s.match(/\/talent\/([^/?#]+)/i);
  if (m) return m[1];
  // accept raw uuid/slug (>=8 chars alnum-dash) or numbers
  if (/^[a-z0-9-]{8,}$/i.test(s) || /^\d+$/.test(s)) return s;
  return null;
}

// Fetch via serverless proxy (uses SELFCAST_API_* on server)
async function fetchTalentById(id) {
  const res = await fetch(`/api/talent?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Talent fetch failed ${res.status} ${msg}`);
  }
  // Already normalized by api/talent.js
  const t = await res.json();
  return t;
}

function renderList() {
  const q = (els.filter.value || '').trim().toLowerCase();
  els.list.innerHTML = '';

  talents
    .filter(t => (q ? (t.name || '').toLowerCase().includes(q) : true))
    .forEach(t => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <label class="chk">
          <input type="checkbox" data-id="${t.id}" ${selected.has(t.id) ? 'checked' : ''}/>
          <span class="avatar" style="background-image:url('${t.primary_image || ''}')"></span>
          <span class="meta">
            <strong>${t.name || 'Unnamed'}</strong>
            <small>${t.id}</small>
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
      requested_media_url: t.requested_media_url || ''
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
  } catch {
    return url;
  }
}

// Event handlers
els.load.onclick = async () => {
  const ids = parseLines().map(extractTalentId).filter(Boolean);
  if (!ids.length) {
    alert('Indsæt mindst ét talent link/ID');
    return;
  }

  talents = [];
  selected.clear();
  renderList();

  for (const id of ids) {
    try {
      const t = await fetchTalentById(id);
      talents.push(t);
      selected.set(t.id, t);
    } catch (e) {
      console.error('Talent fetch error', id, e);
    }
  }
  renderList();
  openPreview();
};

els.selectAll.onclick = () => {
  talents.forEach(t => selected.set(t.id, t));
  renderList();
  openPreview();
};

els.clear.onclick = () => {
  talents = [];
  selected.clear();
  els.list.innerHTML = '';
  openPreview();
};

els.list.addEventListener('change', (e) => {
  const cb = e.target;
  if (cb?.dataset?.id) {
    const t = talents.find(x => String(x.id) === String(cb.dataset.id));
    if (!t) return;
    if (cb.checked) selected.set(t.id, t);
    else selected.delete(t.id);
    openPreview();
  }
});

els.filter.oninput = renderList;

els.gen.onclick = async () => {
  const json = JSON.stringify(currentDeckData());
  const data = btoa(unescape(encodeURIComponent(json)));
  const shareUrl = `${location.origin}/view-talent/?data=${data}`;
  const shortUrl = await shorten(shareUrl);

  // Update preview and copy short link
  els.preview.src = shareUrl;
  try {
    await navigator.clipboard.writeText(shortUrl);
    alert(`Share link copied:\n${shortUrl}`);
  } catch {
    alert(`Share link:\n${shortUrl}`);
  }
};

els.pdf.onclick = () => {
  // The view page owns print CSS for clean PDF
  els.preview.contentWindow?.postMessage({ type: 'print' }, '*');
};

els.prev.onclick = () => history.back();
els.next.onclick = () => (location.href = '/view-talent/');
