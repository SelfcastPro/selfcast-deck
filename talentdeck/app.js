// talentdeck/app.js — manual data + optional scraper (no Selfcast API needed)

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

let talents = [];
let selected = new Map();

// -------- Helpers --------

function parseLines() {
  return els.input.value
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function extractTalentIdOrUrl(s) {
  // If it looks like a URL, return it; else return raw string as "id"
  if (/^https?:\/\//i.test(s)) return s;
  const m = s.match(/\/talent\/([^/?#]+)/i);
  if (m) return `https://producer.selfcast.com/talent/${m[1]}`;
  return s; // id or slug
}

function splitFields(line) {
  // <urlOrId> | <name> | <height_cm> | <country> | <imageUrl>
  const parts = line.split('|').map(x => x.trim());
  return {
    urlOrId: parts[0] || '',
    name: parts[1] || '',
    height_cm: parts[2] || '',
    country: parts[3] || '',
    imageUrl: parts[4] || ''
  };
}

function toProfileUrl(urlOrId) {
  if (!urlOrId) return '';
  if (/^https?:\/\//i.test(urlOrId)) return urlOrId;
  return `https://producer.selfcast.com/talent/${urlOrId}`;
}

function guessIdFromUrl(u) {
  const m = String(u).match(/\/talent\/([^/?#]+)/i);
  return m ? m[1] : String(u);
}

async function tryScrape(url) {
  try {
    const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function renderList() {
  const q = (els.filter.value || '').trim().toLowerCase();
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

// -------- Events --------

els.load.onclick = async () => {
  const lines = parseLines();
  if (!lines.length) return alert('Indsæt mindst ét talent: URL/ID eller pipe-format: url | name | height_cm | country | imageUrl');

  talents = [];
  selected.clear();
  renderList();

  for (const raw of lines) {
    const { urlOrId, name, height_cm, country, imageUrl } = splitFields(raw);
    const profile_url = toP_
