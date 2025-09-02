function readData() {
  const url = new URL(location.href);
  const raw = url.searchParams.get('data');
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch (e) {
    console.error('data parse error', e);
    return null;
  }
}

function el(tag, cls, html) {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (html !== undefined) x.innerHTML = html;
  return x;
}

const data = readData();
const root = document.getElementById('root');
const deckTitle = document.getElementById('deckTitle');
const ownerName = document.getElementById('ownerName');
const ownerEmail = document.getElementById('ownerEmail');
const ownerPhone = document.getElementById('ownerPhone');

if (!data) {
  root.innerHTML = '<p style="padding:24px">No data</p>';
} else {
  deckTitle.textContent = data.title || 'Untitled';
  if (data.owner?.name) ownerName.textContent = data.owner.name;
  if (data.owner?.email) ownerEmail.textContent = data.owner.email, ownerEmail.href = `mailto:${data.owner.email}`;
  if (data.owner?.phone) ownerPhone.textContent = data.owner.phone;

  data.talents.forEach(t => {
    const card = el('article', 'card');

    const img = el('div', 'hero');
    img.style.backgroundImage = `url('${t.primary_image || ''}')`;
    card.appendChild(img);

    const h = el('div', 'card-head');
    h.innerHTML = `<h3>${t.name || 'Untitled'}</h3>`;
    card.appendChild(h);

    const links = el('div', 'links');
    links.innerHTML = `
      <a class="btn small" target="_blank" href="${t.profile_url}">Open profile</a>
      ${t.requested_media_url ? `<a class="btn small" target="_blank" href="${t.requested_media_url}">Requested photos/videos</a>` : ''}
    `;
    card.appendChild(links);

    if (t.gallery?.length) {
      const g = el('div', 'gallery');
      t.gallery.slice(0, 12).forEach(u => {
        const i = el('div', 'thumb'); i.style.backgroundImage = `url('${u}')`;
        g.appendChild(i);
      });
      card.appendChild(g);
    }

    // “I'm interested” → open prefilled email to owner (simple + reliable)
    if (data.owner?.email) {
      const mail = `mailto:${encodeURIComponent(data.owner.email)}?subject=${encodeURIComponent('Interested – ' + (t.name || t.id))}&body=${encodeURIComponent(
        `Hi,\n\nWe’re interested in ${t.name || t.id}.\nProfile: ${t.profile_url}\n\n— Sent from Selfcast Talent Presentation`
      )}`;
      const interest = el('div', 'interest');
      interest.innerHTML = `<a class="btn primary" href="${mail}">Mark interest</a>`;
      card.appendChild(interest);
    }

    root.appendChild(card);
  });
}

// Copy share link
document.getElementById('btnShare')?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(location.href);
  alert('Share link copied to clipboard');
});
