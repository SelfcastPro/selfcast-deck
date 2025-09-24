const STATUS_OPTIONS = [
  'New',
  'Contacted',
  'Follow-up',
  'Converted',
  'Disqualified'
];

const STORAGE_KEY = 'sc_talentscout_updates_v1';

const elements = {
  table: document.getElementById('lead-table'),
  tbody: document.querySelector('#lead-table tbody'),
  empty: document.getElementById('empty'),
  search: document.getElementById('search'),
  statusFilter: document.getElementById('status-filter'),
  sourceFilter: document.getElementById('source-filter'),
  onlyPriority: document.getElementById('only-priority'),
  detail: document.getElementById('detail'),
  hashtagList: document.getElementById('hashtag-list'),
  totalCount: document.getElementById('total-count'),
  newCount: document.getElementById('new-count'),
  rowTemplate: document.getElementById('row-template'),
  hashtagTemplate: document.getElementById('hashtag-template')
};

const state = {
  leads: [],
  hashtags: [],
  updates: loadUpdates(),
  filters: {
    search: '',
    status: '',
    source: '',
    priorityOnly: false
  },
  selected: null
};

init().catch((err) => {
  console.error('Failed to initialise Talentscout board', err);
  elements.detail.textContent = 'Failed to load leads. Reload the page to try again.';
});

async function init() {
  const [leads, hashtags] = await Promise.all([
    fetchJson('./data/leads.json'),
    fetchJson('./data/hashtags.json')
  ]);

  state.leads = Array.isArray(leads) ? leads : [];
  state.hashtags = Array.isArray(hashtags) ? hashtags : [];

  populateStatusFilter();
  populateSourceFilter();
  renderHashtags();
  renderSummary();
  renderList();
  renderDetailByHandle(state.selected);
  bindEvents();
}

function bindEvents() {
  elements.search?.addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderList();
  });

  elements.statusFilter?.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderList();
  });

  elements.sourceFilter?.addEventListener('change', (event) => {
    state.filters.source = event.target.value;
    renderList();
  });

  elements.onlyPriority?.addEventListener('change', (event) => {
    state.filters.priorityOnly = Boolean(event.target.checked);
    renderList();
  });
}

function renderSummary() {
  const computed = computeLeads();
  const total = computed.length;
  const fresh = computed.filter((lead) => (lead.status || 'New') === 'New').length;

  if (elements.totalCount) {
    elements.totalCount.textContent = `${total} ${total === 1 ? 'lead' : 'leads'}`;
  }

  if (elements.newCount) {
    elements.newCount.textContent = `${fresh} ${fresh === 1 ? 'new contact' : 'new contacts'}`;
  }
}

function renderList(options = {}) {
  const preserveDetail = Boolean(options.preserveDetail);
  const tbody = elements.tbody;
  if (!tbody) return;

  const filtered = filterLeads();
  const handles = filtered.map((lead) => lead.handle);
  let nextSelected = state.selected;
  if (nextSelected && !handles.includes(nextSelected)) {
    nextSelected = handles[0] || null;
  } else if (!nextSelected && handles.length) {
    nextSelected = handles[0];
  }
  const selectionChanged = nextSelected !== state.selected;
  state.selected = nextSelected;

  tbody.innerHTML = '';

  if (!filtered.length) {
    elements.table.style.display = 'none';
    elements.empty.hidden = false;
  } else {
    elements.table.style.display = 'table';
    elements.empty.hidden = true;
  }

  filtered.forEach((lead) => {
    const node = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.handle = lead.handle;

    const handleCell = node.querySelector('.handle');
    const followersCell = node.querySelector('.followers');
    const sourceCell = node.querySelector('.source');
    const statusCell = node.querySelector('.status');
    const noteCell = node.querySelector('.note');

    if (handleCell) handleCell.textContent = `@${lead.handle}`;
    if (followersCell) followersCell.textContent = formatFollowers(lead.followers);
    if (sourceCell) sourceCell.textContent = lead.source || '—';
    if (statusCell) statusCell.textContent = lead.status || 'New';
    if (noteCell) noteCell.textContent = summariseNote(lead.notes);

    if (lead.priority) node.classList.add('is-priority');
    if (state.selected === lead.handle) node.classList.add('is-active');

    node.addEventListener('click', () => {
      state.selected = lead.handle;
      renderList();
      renderDetailByHandle(lead.handle);
    });

    tbody.appendChild(node);
  });

  renderSummary();
  if (selectionChanged && !preserveDetail) {
    renderDetailByHandle(state.selected);
  } else if (!state.selected && !filtered.length && !preserveDetail) {
    renderDetailByHandle(null);
  }
}

function renderDetailByHandle(handle) {
  const container = elements.detail;
  if (!container) return;

  if (!handle) {
    container.innerHTML = '<p>Select a lead to see details and log outreach.</p>';
    return;
  }

  const lead = computeLeads().find((entry) => entry.handle === handle);
  if (!lead) {
    container.innerHTML = '<p>Lead not found. Choose another entry from the list.</p>';
    return;
  }

  const sourceLink = buildSourceLink(lead.source);

  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = `@${lead.handle}`;
  container.appendChild(title);

  const meta = document.createElement('dl');
  addMeta(meta, 'Followers', formatFollowers(lead.followers));
  addMeta(meta, 'Location', lead.location || '—');
  if (sourceLink) {
    const dt = document.createElement('dt');
    dt.textContent = 'Source';
    const dd = document.createElement('dd');
    const link = document.createElement('a');
    link.href = sourceLink;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = lead.source;
    dd.appendChild(link);
    meta.appendChild(dt);
    meta.appendChild(dd);
  } else {
    addMeta(meta, 'Source', lead.source || '—');
  }
  addMeta(meta, 'Last contact', lead.last_contacted || '—');
  container.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'actions';

  if (lead.profile_url) {
    const profileBtn = document.createElement('a');
    profileBtn.className = 'button';
    profileBtn.href = lead.profile_url;
    profileBtn.target = '_blank';
    profileBtn.rel = 'noreferrer noopener';
    profileBtn.textContent = 'Open profile';
    actions.appendChild(profileBtn);
  }

  if (lead.post_url) {
    const postBtn = document.createElement('a');
    postBtn.className = 'button secondary';
    postBtn.href = lead.post_url;
    postBtn.target = '_blank';
    postBtn.rel = 'noreferrer noopener';
    postBtn.textContent = 'Open post';
    actions.appendChild(postBtn);
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'secondary';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy handle';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`@${lead.handle}`);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy handle'; }, 1200);
    } catch (err) {
      console.error('Clipboard failed', err);
    }
  });
  actions.appendChild(copyBtn);

  container.appendChild(actions);

  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Status';
  const statusSelect = document.createElement('select');
  STATUS_OPTIONS.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });
  statusSelect.value = lead.status || 'New';
  statusSelect.addEventListener('change', (event) => {
    persistUpdate(lead.handle, { status: event.target.value });
  });
  statusLabel.appendChild(statusSelect);
  container.appendChild(statusLabel);

  const contactLabel = document.createElement('label');
  contactLabel.textContent = 'Last contact';
  const contactInput = document.createElement('input');
  contactInput.type = 'date';
  if (lead.last_contacted) contactInput.value = lead.last_contacted;
  contactInput.addEventListener('change', (event) => {
    const value = event.target.value || null;
    persistUpdate(lead.handle, { last_contacted: value });
  });
  contactLabel.appendChild(contactInput);
  container.appendChild(contactLabel);

  const notesLabel = document.createElement('label');
  notesLabel.textContent = 'Notes';
  const notesTextarea = document.createElement('textarea');
  notesTextarea.rows = 5;
  notesTextarea.value = lead.notes || '';
  notesTextarea.placeholder = 'DM status, vibe, next follow-up…';
  notesTextarea.addEventListener('input', (event) => {
    persistUpdate(lead.handle, { notes: event.target.value }, { skipDetail: true });
  });
  notesLabel.appendChild(notesTextarea);
  container.appendChild(notesLabel);

  const priorityLabel = document.createElement('label');
  priorityLabel.className = 'priority-toggle';
  const priorityInput = document.createElement('input');
  priorityInput.type = 'checkbox';
  priorityInput.checked = Boolean(lead.priority);
  priorityInput.addEventListener('change', (event) => {
    persistUpdate(lead.handle, { priority: Boolean(event.target.checked) });
  });
  priorityLabel.appendChild(priorityInput);
  const priorityText = document.createElement('span');
  priorityText.textContent = 'Mark as priority lead';
  priorityLabel.appendChild(priorityText);
  container.appendChild(priorityLabel);

  if (Array.isArray(lead.tags) && lead.tags.length) {
    const tagsLabel = document.createElement('label');
    tagsLabel.textContent = 'Tags';
    const tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    lead.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagRow.appendChild(span);
    });
    tagsLabel.appendChild(tagRow);
    container.appendChild(tagsLabel);
  }
}

function renderHashtags() {
  if (!elements.hashtagList) return;
  elements.hashtagList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.hashtags.forEach((tag) => {
    const node = elements.hashtagTemplate.content.firstElementChild.cloneNode(true);
    const code = node.querySelector('code');
    if (code) code.textContent = tag;
    fragment.appendChild(node);
  });
  elements.hashtagList.appendChild(fragment);
}

function populateStatusFilter() {
  if (!elements.statusFilter) return;
  STATUS_OPTIONS.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    elements.statusFilter.appendChild(option);
  });
}

function populateSourceFilter() {
  if (!elements.sourceFilter) return;
  const sources = new Set();
  state.leads.forEach((lead) => {
    if (lead.source) sources.add(lead.source);
  });
  Array.from(sources)
    .sort((a, b) => a.localeCompare(b))
    .forEach((source) => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      elements.sourceFilter.appendChild(option);
    });
}

function filterLeads() {
  const computed = computeLeads();
  const search = (state.filters.search || '').trim().toLowerCase();
  const status = state.filters.status;
  const source = state.filters.source;
  const priorityOnly = state.filters.priorityOnly;

  return computed.filter((lead) => {
    if (status && (lead.status || 'New') !== status) return false;
    if (source && lead.source !== source) return false;
    if (priorityOnly && !lead.priority) return false;
    if (search) {
      const haystack = [
        lead.handle,
        lead.notes,
        lead.location,
        lead.source,
        Array.isArray(lead.tags) ? lead.tags.join(' ') : ''
      ]
        .map((value) => (value || '').toLowerCase())
        .join(' ');
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function computeLeads() {
  return state.leads.map((lead) => {
    const update = state.updates?.[lead.handle] || {};
    return {
      ...lead,
      status: update.status ?? lead.status ?? 'New',
      notes: update.notes ?? lead.notes ?? '',
      last_contacted: update.last_contacted ?? lead.last_contacted ?? null,
      priority: update.priority ?? lead.priority ?? false
    };
  });
}

function fetchJson(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return response.json();
    })
    .catch((err) => {
      console.error('Failed to load JSON', url, err);
      return [];
    });
}

function loadUpdates() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to read Talentscout local state', err);
    return {};
  }
}

function saveUpdates() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.updates));
  } catch (err) {
    console.warn('Failed to persist Talentscout local state', err);
  }
}

function persistUpdate(handle, partial, options = {}) {
  state.updates = state.updates || {};
  const current = state.updates[handle] || {};
  state.updates[handle] = { ...current, ...partial };
  saveUpdates();
  renderList({ preserveDetail: options.skipDetail });
  renderSummary();
  if (!options.skipDetail) renderDetailByHandle(handle);
}

function formatFollowers(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 10_000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return num.toLocaleString('en-US');
}

function summariseNote(note) {
  if (!note) return '—';
  const trimmed = String(note).trim();
  if (!trimmed) return '—';
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

function addMeta(container, term, description) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  container.appendChild(dt);

  const dd = document.createElement('dd');
  dd.textContent = description || '—';
  container.appendChild(dd);
}

function buildSourceLink(source) {
  if (!source || typeof source !== 'string') return null;
  if (source.startsWith('#')) {
    return `https://www.instagram.com/explore/tags/${encodeURIComponent(source.slice(1))}/`;
  }
  if (source.startsWith('@')) {
    return `https://www.instagram.com/${encodeURIComponent(source.slice(1))}/`;
  }
  return null;
}
