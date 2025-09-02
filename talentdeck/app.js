const API_BASE = process.env.SELFCAST_API_BASE || (typeof window !== 'undefined' && window.__API_BASE__);
const API_KEY  = process.env.SELFCAST_API_KEY  || (typeof window !== 'undefined' && window.__API_KEY__);

const els = {
  title:       document.getElementById('deckTitle'),
  input:       document.getElementById('talentInput'),
  minImages:   document.getElementById('minImages'),
  load:        document.getElementById('btnLoad'),
  selectAll:   document.getElementById('btnSelectAll'),
  clear:       document.getElementById('btnClear'),
  gen:         document.getElementById('btnGenerate'),
  pdf:         document.getElementById('btnExportPdf'),
  prev:        document.getElementById('btnPrev'),
  next:        document.getElementById('btnNext'),
  filter:      document.getElementById('filterInput'),
  list:        document.getElementById('talentList'),
  preview:     document.getElementById('preview'),
};

let talents = [];      // loaded
let selected = new Map(); // id -> talent

function parseLines() {
  return els.input.value
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function extractTalentId(s) {
  // Accept full URL or id
  const m = s.match(/talent\/(\d+)/i);
  if (m) return m[1];
  if (/^\d+$/.test(s)) return s;
  return null;
}

async function fetchTalentById(id) {
  // Adjust to your real API shape; this mirrors the role deck pattern.
  const url = `${API_BASE}/talents/${id}`;
  const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const t = await res.json();

  // Normalize to what the deck expects
  return {
    id: t.id || id,
    name: t.name || t.full_name || 'Unnamed',
    primary_image: t.best_image?.url || t.picture || '',
    gallery: (t.gallery || []).map(g => g.url).filter(Boolean),
    profile_url: t.profile_url || t.link || `https://producer.selfcast.com/talent/${id}`,
    requested_media_url: t.requested_media_url || '', // optional uploader page
    age: t.age || null,
    sizes: t.sizes || null,
    socials: t.socials || null,
  };
}

function renderList() {
  const q = els.filter.value.trim().toLowerCase();
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
            <strong>${t.name}</strong>
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
      primary_image: t.primary_image,
      profile_url: t.profile_url,
      requested_media_url: t.requested_media_url
    }))
  };
}

return {
  id: t.id || id,
  name: t.name || t.full_name || 'Unnamed',
  primary_image: t.best_image?.url || t.picture || '',
  // Ingen gallery lige nu:
  gallery: [],
  profile_url: t.profile_url || t.link || `https://producer.selfcast.com/talent/${id}`,
  requested_media_url: t.requested_media_url || ''
    },
    talents: arr.map(t => ({
      id: t.id,
      name: t.name,
      primary_image: t.primary_image,
      gallery: t.gallery,
      profile_url: t.profile_url,
      requested_media_url: t.requested_media_url
    }))
  };
}

function openPreview() {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(currentDeckData()))));
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

els.load.onclick = async () => {
  const ids = parseLines().map(extractTalentId).filter(Boolean);
  if (!ids.length) return alert('Indsæt mindst ét talent link/ID');

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
    const t = talents.find(x => x.id == cb.dataset.id);
    if (cb.checked) selected.set(t.id, t);
    else selected.delete(t.id);
    openPreview();
  }
});

els.filter.oninput = renderList;

els.gen.onclick = async () => {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(currentDeckData()))));
  const shareUrl = `${location.origin}/view-talent/?data=${data}`;
  const shortUrl = await shorten(shareUrl);

  // Show in the preview iframe and copy to clipboard
  els.preview.src = shareUrl;
  await navigator.clipboard.writeText(shortUrl);
  alert(`Share link copied:\n${shortUrl}`);
};

els.pdf.onclick = () => {
  // The view page owns print CSS for clean PDF
  els.preview.contentWindow?.postMessage({ type: 'print' }, '*');
};

els.prev.onclick = () => history.back();
els.next.onclick = () => location.href = '/view-talent/';
