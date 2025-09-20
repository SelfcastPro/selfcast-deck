(function(){
  "use strict";

  let path = "jobs/live/jobs.json";
  if (typeof PATH !== "undefined") {
    path = PATH;
  } else if (typeof window !== "undefined" && typeof window.PATH === "string") {
    path = window.PATH;
  }
  const readStoreKey = "radar:read:v1";

  const metaEl = document.getElementById("meta");
  const fallbackEl = document.getElementById("fallback");
  const tableEl = document.getElementById("tbl");
  const tbodyEl = tableEl ? tableEl.querySelector("tbody") : null;
  const detailEl = document.getElementById("detail");
  const qInput = document.getElementById("q");
  const sourceSelect = document.getElementById("source");
  const ageSelect = document.getElementById("age");
  const sortSelect = document.getElementById("sort");
  const onlyUnreadCheckbox = document.getElementById("onlyUnread");
  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  if (!tbodyEl || !detailEl) {
    console.warn("Radar dashboard: required DOM nodes missing - aborting initialisation");
    return;
  }

  const formatter = new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let data = [];
  let filtered = [];
  let updatedAt = null;
  let selectedId = null;
  const itemsById = new Map();
  const readMap = loadReadMap();

  const debounce = (fn, delay = 200) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  function loadReadMap(){
    if (!window.localStorage) return {};
    try {
      const raw = window.localStorage.getItem(readStoreKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn("Radar dashboard: unable to read localStorage", err);
      return {};
    }
  }

  function persistReadMap(){
    if (!window.localStorage) return;
    try {
      window.localStorage.setItem(readStoreKey, JSON.stringify(readMap));
    } catch (err) {
      console.warn("Radar dashboard: unable to persist read state", err);
    }
  }

  function showToast(message, variant = "info"){
    if (!toastEl) return;
    const normalised = variant === "success" || variant === "error" ? variant : "info";
    toastEl.textContent = message;
    toastEl.classList.remove("toast--success", "toast--error", "toast--info", "show");
    toastEl.classList.add(`toast--${normalised}`, "show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show", "toast--success", "toast--error", "toast--info");
    }, 2600);
  }

   function nowISO(){
    return new Date().toISOString();
  }

  function esc(value){
    return (value || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[m]);
  }

  function coerceDate(value){
    if (!value) return null;
    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : time;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      if (value > 0 && value < 1e12) return value * 1000;
      return value;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) return coerceDate(numeric);
      const parsed = Date.parse(trimmed);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === "object") {
      if (Number.isFinite(value?.seconds)) {
        return coerceDate(value.seconds);
      }
      if (Number.isFinite(value?.ms)) {
        return coerceDate(value.ms);
      }
    }
    return null;
  }

  function formatDate(value){
    const timestamp = coerceDate(value);
    if (!timestamp) return "";
    try {
      return formatter.format(new Date(timestamp));
    } catch (err) {
      console.warn("Radar dashboard: failed to format date", err);
      return "";
    }
  }

  function stableId(record){
    if (!record || typeof record !== "object") return null;

    const toStringOrNull = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" || typeof value === "string") {
        const str = String(value).trim();
        return str ? str : null;
      }
      return null;
    };

    const direct =
      toStringOrNull(record.post_id) ||
      toStringOrNull(record.id) ||
      toStringOrNull(record.facebookId) ||
      toStringOrNull(record.postId) ||
      toStringOrNull(record.postID);
    if (direct) return direct;

    const url =
      toStringOrNull(record.facebookUrl) ||
      toStringOrNull(record.url) ||
      toStringOrNull(record.permalinkUrl) ||
      toStringOrNull(record.postUrl) ||
      toStringOrNull(record.link);

    const userId =
      toStringOrNull(record.user?.id) ||
      toStringOrNull(record.from?.id) ||
      toStringOrNull(record.owner?.id) ||
      toStringOrNull(record.author?.id);

    const text =
      record.summary ||
      record.text ||
      record.snippet ||
      record.message ||
      record.description ||
      "";
    const textSnippet = String(text).slice(0, 80).replace(/\s+/g, " ").trim();

    if (url && userId) return `${url}|${userId}|${textSnippet}`;
    if (url && textSnippet) return `${url}|${textSnippet}`;
    if (url) return url;
    return textSnippet || null;
  }

  function jobTimestamp(job){
    const candidates = [
      job.postDate,
      job.posted_at,
      job.postedAt,
      job.created_at,
      job.createdAt,
      job.creation_time,
      job.creationTime,
      job.importedAt,
      job.fetched_at,
      job.updatedAt,
    ];
    for (const candidate of candidates) {
      const ts = coerceDate(candidate);
      if (ts) return ts;
    }
    return null;
  }

  const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const EMAIL_FIELDS = [
    "email",
    "emails",
    "emailAddress",
@@ -277,74 +348,94 @@

    return job;
  }

  function populateSources(items){
    if (!sourceSelect) return;
    const seen = new Set();
    const sources = [];
    for (const job of items) {
      const key = job._source;
      if (key && !seen.has(key)) {
        seen.add(key);
        sources.push(key);
      }
    }
    sources.sort((a, b) => a.localeCompare(b, "da", { sensitivity: "base" }));
    while (sourceSelect.options.length > 1) {
      sourceSelect.remove(1);
    }
    for (const source of sources) {
      const opt = document.createElement("option");
      opt.value = source;
      opt.textContent = source;
      sourceSelect.appendChild(opt);
    }
  }

  function renderList(items){
    if (!tbodyEl) return;
    const frag = document.createDocumentFragment();
    for (const job of items) {
      const tr = document.createElement("tr");
      tr.dataset.id = job.id;
      if (job._read) tr.classList.add("is-read");
      if (selectedId && job.id === selectedId) {
        tr.classList.add("is-active");
      }

      const readCell = document.createElement("td");
      readCell.dataset.cell = "read";
      readCell.textContent = job._read ? "✓" : "";
      tr.appendChild(readCell);

      const titleCell = document.createElement("td");
      titleCell.innerHTML = `<div class="job-title">${esc(job.title || "(no title)")}</div>`;
      tr.appendChild(titleCell);

      const countryCell = document.createElement("td");
      countryCell.textContent = job._country || "";
      tr.appendChild(countryCell);

      const sourceCell = document.createElement("td");
      sourceCell.textContent = job._source;
      tr.appendChild(sourceCell);

      const snippetCell = document.createElement("td");
      snippetCell.className = "snippet";
      snippetCell.textContent = job._snippet || job.title || "";
      tr.appendChild(snippetCell);

      const postedCell = document.createElement("td");
      postedCell.textContent = job._dateLabel || "";
      tr.appendChild(postedCell);

      frag.appendChild(tr);
    }

    tbodyEl.replaceChildren(frag);
    updateRowClasses();
  }

  function buildProducerEmailTemplate(job){
    const title = job?.title ? String(job.title).trim() : "";
    const source = job?._source
      ? String(job._source).trim()
      : job?.source
      ? String(job.source).trim()
      : "";
    const link = job?._link
      ? String(job._link).trim()
      : job?.facebookUrl
      ? String(job.facebookUrl).trim()
      : job?.url
      ? String(job.url).trim()
      : "";
    const country = job?._country
      ? String(job._country).trim()
      : job?.country
      ? String(job.country).trim()
      : "";

    const subject = title ? `Selfcast x ${title}` : "Selfcast – Casting support";
    const lines = ["Hi,", ""];
    let spottedLine = "We spotted your casting";
@@ -542,25 +633,281 @@
  }

  function setRead(job, value){
    if (!job) return;
    if (value) {
      const ts = nowISO();
      readMap[job.id] = ts;
      job._read = true;
      job._readAt = ts;
    } else {
      delete readMap[job.id];
      job._read = false;
      job._readAt = null;
    }
    persistReadMap();
  }

  function markAsRead(job){
    if (!job || job._read) return;
    setRead(job, true);
  }

  function toggleRead(job){
    if (!job) return;
    setRead(job, !job._read);
    renderDetail(job);
    updateRowClasses();
    updateMeta();
    applyFilters();
  }

  function updateRowClasses(){
    if (!tbodyEl) return;
    const rows = tbodyEl.querySelectorAll("tr");
    for (const row of rows) {
      const job = itemsById.get(row.dataset.id);
      const isSelected = selectedId && row.dataset.id === selectedId;
      row.classList.toggle("is-active", Boolean(isSelected));
      row.classList.toggle("is-read", Boolean(job && job._read));
      const readCell = row.querySelector('td[data-cell="read"]');
      if (readCell) {
        readCell.textContent = job && job._read ? "✓" : "";
      }
    }
  }

  function hideFallback(){
    if (fallbackEl) {
      fallbackEl.style.display = "none";
      fallbackEl.textContent = "";
    }
    if (tableEl) {
      tableEl.style.display = "";
    }
  }

  function showFallback(message){
    if (fallbackEl) {
      fallbackEl.textContent = message;
      fallbackEl.style.display = "block";
    }
    if (tableEl) {
      tableEl.style.display = "none";
    }
  }

  function unreadCount(){
    let unread = 0;
    for (const job of data) {
      if (!job._read) unread += 1;
    }
    return unread;
  }

  function updateMeta(){
    if (!metaEl) return;
    if (!data.length) {
      metaEl.textContent = "No posts available.";
      return;
    }
    const parts = [];
    const visible = filtered.length;
    parts.push(`${visible} ${visible === 1 ? "post" : "posts"} shown`);
    parts.push(`${data.length} total`);
    const unread = unreadCount();
    if (unread) {
      parts.push(`${unread} unread`);
    }
    if (updatedAt) {
      const label = formatDate(updatedAt);
      if (label) parts.push(`Updated ${label}`);
    }
    metaEl.textContent = parts.join(" · ");
  }

  function applyFilters(){
    let items = data.slice();

    const query = qInput ? qInput.value.trim().toLowerCase() : "";
    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      items = items.filter((job) =>
        terms.every((term) => job._haystack.includes(term))
      );
    }

    const sourceValue = sourceSelect ? sourceSelect.value : "";
    if (sourceValue) {
      items = items.filter((job) => job._source === sourceValue);
    }

    const ageValue = ageSelect ? parseInt(ageSelect.value, 10) : 0;
    if (ageValue) {
      const threshold = Date.now() - ageValue * 86400000;
      items = items.filter(
        (job) => job._timestamp && job._timestamp >= threshold
      );
    }

    if (onlyUnreadCheckbox && onlyUnreadCheckbox.checked) {
      items = items.filter((job) => !job._read);
    }

    if (sortSelect && sortSelect.value === "old") {
      items.sort((a, b) => (a._timestamp || 0) - (b._timestamp || 0));
    } else {
      items.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));
    }

    filtered = items;

    if (!items.length) {
      renderList([]);
      const message = data.length
        ? "No posts match the current filters."
        : "No posts available.";
      showFallback(message);
    } else {
      hideFallback();
      renderList(items);
    }

    const selectedJob = selectedId ? itemsById.get(selectedId) || null : null;
    if (selectedId && !selectedJob) {
      selectedId = null;
    }

    if (selectedId) {
      renderDetail(selectedJob);
    } else if (!items.length) {
      renderDetail(null);
    }

    if (!selectedId && items.length) {
      selectJob(items[0].id, { skipFilters: true, markRead: false });
    } else {
      updateRowClasses();
    }

    updateMeta();
  }

  function selectJob(jobId, options = {}){
    const { skipFilters = false, markRead: shouldMarkRead = true } = options;
    if (!jobId) {
      selectedId = null;
      renderDetail(null);
      updateRowClasses();
      updateMeta();
      return;
    }

    const job = itemsById.get(jobId);
    if (!job) return;

    selectedId = jobId;
    if (shouldMarkRead) {
      markAsRead(job);
    }
    renderDetail(job);
    updateRowClasses();
    updateMeta();

    if (!skipFilters) {
      applyFilters();
    }
  }

  function handleRowClick(event){
    const row = event.target.closest("tr");
    if (!row || !tbodyEl.contains(row)) return;
    const jobId = row.dataset.id;
    if (jobId) {
      selectJob(jobId);
    }
  }

  async function fetchData(){
    if (typeof fetch !== "function") {
      showFallback("This browser cannot load posts.");
      if (metaEl) metaEl.textContent = "Unable to load posts.";
      return;
    }

    if (metaEl) metaEl.textContent = "Loading…";
    showFallback("Loading posts…");

    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load jobs (${response.status})`);
      }
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      updatedAt = payload?.updatedAt || null;

      data = [];
      filtered = [];
      itemsById.clear();

      for (const raw of items) {
        const job = normaliseJob(raw);
        if (!job) continue;
        data.push(job);
        itemsById.set(job.id, job);
      }

      populateSources(data);

      if (!data.length) {
        renderList([]);
        showFallback("No posts available.");
        renderDetail(null);
        updateMeta();
        return;
      }

      hideFallback();
      applyFilters();
    } catch (err) {
      console.error("Radar dashboard: failed to load jobs", err);
      data = [];
      filtered = [];
      itemsById.clear();
      renderList([]);
      showFallback("Unable to load posts. Please try again later.");
      renderDetail(null);
      if (metaEl) metaEl.textContent = "Unable to load posts.";
    }
  }

  function attachEventListeners(){
    if (tbodyEl) {
      tbodyEl.addEventListener("click", handleRowClick);
    }

    const debouncedFilters = debounce(applyFilters, 200);
    if (qInput) {
      qInput.addEventListener("input", debouncedFilters);
    }
    if (sourceSelect) {
      sourceSelect.addEventListener("change", applyFilters);
    }
    if (ageSelect) {
      ageSelect.addEventListener("change", applyFilters);
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", applyFilters);
    }
    if (onlyUnreadCheckbox) {
      onlyUnreadCheckbox.addEventListener("change", applyFilters);
    }
  }

  function init(){
    attachEventListeners();
    fetchData();
  }

  init();
})();
