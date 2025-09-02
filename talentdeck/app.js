// talentdeck/app.js – simple version uden API key

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

function parseLines() {
  return els.input.value
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Tag ID eller URL direkte
function extractTalentId(s) {
  const m = s.match(/\/talent\/([^/?#]+)/i);
  if (m) return m[1];
  return s; // fallback: brug hele strengen
}

// Her er ingen API – vi laver et simpelt objekt
async function fetchTalentById(idOrUrl) {
  return {
    id: idOrUrl,
    name: idOrUrl,
    primary_image: '', // intet billede hvis ikke du manuelt tilføjer
    profile_url: idOrUrl.startsWith('http') 
      ? idOrUrl 
      : `https://producer.selfcast.com/talent/${idOrUrl}`,
    requested_media_url: ''
  };
}

function renderList() {
  const q = (els.filter.value || '').toLowerCase();
  els.list.innerHTML = '';

  talents
    .filter(t => (q ? (t.name || '').toLowerCase().includes(q) : true))
    .forEach(t => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <label class="chk">
          <input type="checkbox" data-id="${t.id}" ${selected.has(t.id) ? 'checked' : ''}/>
          <span class="avatar"></span>
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

function openPreview() {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(currentDeckData()))));
  els.preview.src = `/view-talent/?data=${data}`;
}

els.load.onclick = async () => {
  const ids = parseLines().map(extractTalentId).filter(Boolean);
  if (!ids.length) return alert('Indsæt mindst ét talent link eller ID');

  talents = [];
  selected.clear();
  renderList();

  for (const id of ids) {
    const t = await fetchTalentById(id);
    talents.push(t);
    selected.set(t.id, t);
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
    const t = talents.find(x => x.id === cb.dataset.id);
    if (cb.checked) selected.set(t.id, t);
    else selected.delete(t.id);
    openPreview();
  }
});

els.filter.oninput = renderList;

els.gen.onclick = async () => {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(currentDeckData()))));
  const shareUrl = `${location.origin}/view-talent/?data=${data}`;
  els.preview.src = shareUrl;
  try {
    await navigator.clipboard.writeText(shareUrl);
    alert(`Share link copied:\n${shareUrl}`);
  } catch {
    alert(`Share link:\n${shareUrl}`);
  }
};

els.pdf.onclick = () => {
  els.preview.contentWindow?.postMessage({ type: 'print' }, '*');
};

els.prev.onclick = () => history.back();
els.next.onclick = () => (location.href = '/view-talent/');
