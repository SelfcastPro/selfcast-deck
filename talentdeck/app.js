// talentdeck/app.js — Talent Builder v4.1.2
// - Contact fields (owner)
// - Load from lines or pipe format
// - Inline edit per talent
// - Autosave (localStorage) + last 20 pasted inputs
// - Generate: /view-talent/?compact=1&data=... + copy Bitly (fallback to long link)
// - Export PDF: postMessage{type:'print'} to iframe
// - Preview clicks enabled by default (toggle)
// - Never-empty preview: falls back to demo when no talents

(function () {
  const STORE_KEY  = 'sc_talentdeck_v412';
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

  // ---------- helpers ----------
  const isHttp = s => /^https?:\/\//i.test(s || '');
  const isImageUrl = s => /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(s || '') || /picsum\.photos/i.test(s || '');

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function subLine(t){
    return [t.height_cm ? `${t.height_cm} cm` : '', t.country || ''].filter(Boolean).join(' · ');
  }

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

  // ---------- state ----------
  function saveDeck() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        title: els.title?.value || '',
        owner: {
          name : els.ownerName?.value || '',
          email: els.ownerEmail?.value || '',
          phone: els.ownerPhone?.value || ''
        },
        talents
      }));
    } catch {}
  }
  function loadDeck() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return fal
