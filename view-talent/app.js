// view-talent/app.js

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
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
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
  if (data.owner?.email){
    ownerEmail.textContent = data.owner.email;
    ownerEmail.href = `mailto:${data.owner.email}`;
  }
  if (data.owner?.phone) ownerPhone.textContent = data.owner.phone;

  (data.talents || []).forEach(t => {
    const card = el('article','card');

    // Hero image (sort/hvid + centreret)
    const img = el('div','hero');
    img.style.backgroundImage = `url('${t.primary_image || ''}')`;
    img.style.filter = 'grayscale(1)';
    img.style.backgroundPosition = 'center';
    img.style.backgroundSize = 'cover';
    card.appendChild(img);

    // Name
    const head = el('div','card-head', `<h3>${t.name || 'Untitled'}</h3>`);
    card.appendChild(head);

    // Sub info: height + country
    const subInfo = [t.height_cm ? `${t.height_cm} cm` : '', t.country || '']
      .filter(Boolean).join(' · ');
    if (subInfo) {
      const sub = el('div', 'sub-info', `<small style="opacity:.7">${subInfo}</small>`);
      sub.style.padding = '0 16px 8px';
      card.appendChild(sub);
    }

    // Links
    const links = el('div','links');
    const emailBtn = t.email ? `<a class="btn small" href="mailto:${encodeURIComponent(t.email)}">Email talent</a>` : '';
    links.innerHTML = `
      <a class="btn small" target="_blank" href="${t.profile_url}">Open profile</a>
      ${t.requested_media_url ? `<a class="btn small" target="_blank" href="${t.requested_media_url}">Requested photos/videos</a>` : ''}
      ${emailBtn}
    `;
    card.appendChild(links);

    // "Mark interest" → mailto til afsenderen
    if (data.owner?.email){
      const mail = `mailto:${encodeURIComponent(data.owner.email)}?subject=${encodeURIComponent('Interested – ' + (t.name || t.id))}&body=${encodeURIComponent(
        `Hi,\n\nWe’re interested in ${t.name || t.id}.\nProfile: ${t.profile_url}\n\n— Sent from Selfcast Talent Presentation`
      )}`;
      const interest = el('div','interest', `<a class="btn primary" href="${mail}">Mark interest</a>`);
      card.appendChild(interest);
    }

    root.appendChild(card);
  });
}

// Print fra parent-iframe
window.addEventListener('message', ev => {
  if (ev.data?.type === 'print') window.print();
});

// Copy share link
document.getElementById('btnShare')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    alert('Share link copied to clipboard');
  } catch {
    alert('Could not copy. Here is the link:\n' + location.href);
  }
});
