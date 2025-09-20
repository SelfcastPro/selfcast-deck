diff --git a//dev/null b/radar/app.js
index 0000000000000000000000000000000000000000..38325489eba9a6d6a8d6d0c158826bdcd9f44371 100644
--- a//dev/null
+++ b/radar/app.js
@@ -0,0 +1,557 @@
+(function(){
+  "use strict";
+
+  let path = "jobs/live/jobs.json";
+  if (typeof PATH !== "undefined") {
+    path = PATH;
+  } else if (typeof window !== "undefined" && typeof window.PATH === "string") {
+    path = window.PATH;
+  }
+  const readStoreKey = "radar:read:v1";
+
+  const metaEl = document.getElementById("meta");
+  const fallbackEl = document.getElementById("fallback");
+  const tableEl = document.getElementById("tbl");
+  const tbodyEl = tableEl ? tableEl.querySelector("tbody") : null;
+  const detailEl = document.getElementById("detail");
+  const qInput = document.getElementById("q");
+  const sourceSelect = document.getElementById("source");
+  const ageSelect = document.getElementById("age");
+  const sortSelect = document.getElementById("sort");
+  const onlyUnreadCheckbox = document.getElementById("onlyUnread");
+
+  if (!tbodyEl || !detailEl) {
+    console.warn("Radar dashboard: required DOM nodes missing - aborting initialisation");
+    return;
+  }
+
+  const formatter = new Intl.DateTimeFormat("da-DK", {
+    dateStyle: "short",
+    timeStyle: "short",
+  });
+
+  let data = [];
+  let filtered = [];
+  let updatedAt = null;
+  let selectedId = null;
+  const itemsById = new Map();
+  const readMap = loadReadMap();
+
+  const debounce = (fn, delay = 200) => {
+    let timer = null;
+    return (...args) => {
+      clearTimeout(timer);
+      timer = setTimeout(() => fn(...args), delay);
+    };
+  };
+
+  function loadReadMap(){
+    if (!window.localStorage) return {};
+    try {
+      const raw = window.localStorage.getItem(readStoreKey);
+      if (!raw) return {};
+      const parsed = JSON.parse(raw);
+      return parsed && typeof parsed === "object" ? parsed : {};
+    } catch (err) {
+      console.warn("Radar dashboard: unable to read localStorage", err);
+      return {};
+    }
+  }
+
+  function persistReadMap(){
+    if (!window.localStorage) return;
+    try {
+      window.localStorage.setItem(readStoreKey, JSON.stringify(readMap));
+    } catch (err) {
+      console.warn("Radar dashboard: unable to persist read state", err);
+    }
+  }
+
+  function nowISO(){
+    return new Date().toISOString();
+  }
+
+  function esc(value){
+    return (value || "").replace(/[&<>"']/g, (m) => ({
+      "&": "&amp;",
+      "<": "&lt;",
+      ">": "&gt;",
+      '"': "&quot;",
+      "'": "&#39;",
+    })[m]);
+  }
+
+  function coerceDate(value){
+    if (!value) return null;
+    if (value instanceof Date) {
+      const time = value.getTime();
+      return Number.isNaN(time) ? null : time;
+    }
+    if (typeof value === "number" && Number.isFinite(value)) {
+      if (value > 0 && value < 1e12) return value * 1000;
+      return value;
+    }
+    if (typeof value === "string") {
+      const trimmed = value.trim();
+      if (!trimmed) return null;
+      const asNumber = Number(trimmed);
+      if (!Number.isNaN(asNumber)) return coerceDate(asNumber);
+      const parsed = Date.parse(trimmed);
+      return Number.isNaN(parsed) ? null : parsed;
+    }
+    if (typeof value === "object") {
+      if (typeof value.seconds === "number" && Number.isFinite(value.seconds)) {
+        return coerceDate(value.seconds);
+      }
+      if (typeof value.ms === "number" && Number.isFinite(value.ms)) {
+        return coerceDate(value.ms);
+      }
+    }
+    return null;
+  }
+
+  function formatDate(value){
+    const ts = typeof value === "number" ? value : coerceDate(value);
+    if (!ts) return "";
+    try {
+      return formatter.format(new Date(ts));
+    } catch {
+      return "";
+    }
+  }
+
+  function stableId(record){
+    if (!record || typeof record !== "object") return null;
+    const directCandidates = [
+      record.post_id,
+      record.postId,
+      record.postID,
+      record.id,
+      record.facebookId,
+    ];
+    for (const candidate of directCandidates) {
+      if (candidate === null || candidate === undefined) continue;
+      const str = String(candidate).trim();
+      if (str) return str;
+    }
+
+    const urlCandidates = [
+      record.facebookUrl,
+      record.url,
+      record.permalinkUrl,
+      record.postUrl,
+      record.link,
+    ];
+    let url = "";
+    for (const candidate of urlCandidates) {
+      if (candidate === null || candidate === undefined) continue;
+      const str = String(candidate).trim();
+      if (str) {
+        url = str;
+        break;
+      }
+    }
+
+    const userCandidates = [
+      record?.user?.id,
+      record?.from?.id,
+      record?.owner?.id,
+      record?.author?.id,
+    ];
+    let userId = "";
+    for (const candidate of userCandidates) {
+      if (candidate === null || candidate === undefined) continue;
+      const str = String(candidate).trim();
+      if (str) {
+        userId = str;
+        break;
+      }
+    }
+
+    const textCandidate = (
+      record.summary ||
+      record.text ||
+      record.snippet ||
+      record.message ||
+      record.description ||
+      ""
+    );
+    const text = String(textCandidate || "")
+      .slice(0, 80)
+      .replace(/\s+/g, " ")
+      .trim();
+
+    if (url && userId && text) return `${url}|${userId}|${text}`;
+    if (url && text) return `${url}|${text}`;
+    if (text) return text;
+    return null;
+  }
+
+  function jobTimestamp(job){
+    const candidates = [
+      job.postDate,
+      job.posted_at,
+      job.postedAt,
+      job.created_at,
+      job.createdAt,
+      job.creation_time,
+      job.creationTime,
+      job.importedAt,
+      job.fetched_at,
+      job.updatedAt,
+    ];
+    for (const candidate of candidates) {
+      const ts = coerceDate(candidate);
+      if (ts) return ts;
+    }
+    return null;
+  }
+
+  function normaliseJob(raw){
+    if (!raw || typeof raw !== "object") return null;
+    const job = { ...raw };
+    const id = stableId(job);
+    if (!id) return null;
+    job.id = id;
+
+    const sourceCandidate =
+      job.source || job.sourceName || job.origin || job.provider || "Unknown";
+    job._source = String(sourceCandidate);
+    job._country = job.country ? String(job.country) : "";
+
+    const textCandidate =
+      job.text ||
+      job.summary ||
+      job.snippet ||
+      job.message ||
+      job.description ||
+      "";
+    job._text = String(textCandidate || "");
+    job._snippet = job._text
+      ? job._text.replace(/\s+/g, " ").trim().slice(0, 320)
+      : "";
+
+    const haystackParts = [
+      job.title,
+      job._text,
+      job._source,
+      job._country,
+      job.language,
+      job.tags ? job.tags.join(" ") : "",
+      job?.user?.name,
+    ]
+      .filter(Boolean)
+      .map((value) => String(value).toLowerCase());
+    job._haystack = haystackParts.join(" ");
+
+    job._timestamp = jobTimestamp(job);
+    job._dateLabel = job._timestamp ? formatDate(job._timestamp) : "";
+
+    const linkCandidate =
+      job.url ||
+      job.facebookUrl ||
+      job.permalinkUrl ||
+      job.postUrl ||
+      job.link ||
+      "";
+    job._link = linkCandidate ? String(linkCandidate) : "";
+
+    job._readAt = readMap[job.id] || null;
+    job._read = Boolean(job._readAt);
+
+    return job;
+  }
+
+  function populateSources(items){
+    if (!sourceSelect) return;
+    const seen = new Set();
+    const sources = [];
+    for (const job of items) {
+      const key = job._source;
+      if (key && !seen.has(key)) {
+        seen.add(key);
+        sources.push(key);
+      }
+    }
+    sources.sort((a, b) => a.localeCompare(b, "da", { sensitivity: "base" }));
+    while (sourceSelect.options.length > 1) {
+      sourceSelect.remove(1);
+    }
+    for (const source of sources) {
+      const opt = document.createElement("option");
+      opt.value = source;
+      opt.textContent = source;
+      sourceSelect.appendChild(opt);
+    }
+  }
+
+  function unreadCount(){
+    return data.reduce((acc, job) => (job._read ? acc : acc + 1), 0);
+  }
+
+  function renderMeta(){
+    if (!metaEl) return;
+    if (!data.length) {
+      metaEl.textContent = "No posts available.";
+      return;
+    }
+    const total = data.length;
+    const visible = filtered.length;
+    const unread = unreadCount();
+    const parts = [`Showing ${visible} of ${total} posts`];
+    if (unread) parts.push(`Unread: ${unread}`);
+    if (updatedAt) parts.push(`Updated ${formatDate(updatedAt)}`);
+    metaEl.textContent = parts.join(" · ");
+  }
+
+  function renderTable(){
+    if (!tableEl || !tbodyEl) return;
+    if (!filtered.length) {
+      tableEl.style.display = "none";
+      fallbackEl.style.display = "block";
+      fallbackEl.textContent = data.length
+        ? "No posts match the current filters."
+        : "No posts available.";
+      return;
+    }
+    tableEl.style.display = "table";
+    fallbackEl.style.display = "none";
+
+    const frag = document.createDocumentFragment();
+    for (const job of filtered) {
+      const tr = document.createElement("tr");
+      tr.dataset.id = job.id;
+      if (job._read) tr.classList.add("is-read");
+      if (job.id === selectedId) tr.classList.add("is-active");
+
+      const tdRead = document.createElement("td");
+      tdRead.textContent = job._read ? "✓" : "";
+      tdRead.title = job._read ? "Marked as read" : "Unread";
+      tr.appendChild(tdRead);
+
+      const titleCell = document.createElement("td");
+      titleCell.innerHTML = `
+        <div class="job-title">${esc(job.title || "(no title)")}</div>
+        ${job?.user?.name ? `<div class="small">${esc(job.user.name)}</div>` : ""}
+      `;
+      tr.appendChild(titleCell);
+
+      const countryCell = document.createElement("td");
+      countryCell.textContent = job._country || "";
+      tr.appendChild(countryCell);
+
+      const sourceCell = document.createElement("td");
+      sourceCell.textContent = job._source;
+      tr.appendChild(sourceCell);
+
+      const snippetCell = document.createElement("td");
+      snippetCell.className = "snippet";
+      snippetCell.textContent = job._snippet || job.title || "";
+      tr.appendChild(snippetCell);
+
+      const postedCell = document.createElement("td");
+      postedCell.textContent = job._dateLabel || "";
+      tr.appendChild(postedCell);
+
+      frag.appendChild(tr);
+    }
+
+    tbodyEl.replaceChildren(frag);
+  }
+
+  function renderDetail(job){
+    if (!job) {
+      detailEl.innerHTML = "<em>Select a post…</em>";
+      return;
+    }
+
+    const inFiltered = filtered.some((item) => item.id === job.id);
+    const details = [];
+    details.push(`<h2>${esc(job.title || "(no title)")}</h2>`);
+    const metaBits = [];
+    if (job._source) metaBits.push(esc(job._source));
+    if (job._country) metaBits.push(esc(job._country));
+    if (job?.user?.name) metaBits.push(esc(job.user.name));
+    if (metaBits.length) {
+      details.push(`<div class="small">${metaBits.join(" · ")}</div>`);
+    }
+    if (!inFiltered) {
+      details.push(
+        '<div class="detail-note">Hidden by current filters. Adjust filters to show this post in the list.</div>'
+      );
+    }
+
+    const links = [];
+    if (job._link) {
+      links.push(
+        `<a href="${esc(job._link)}" target="_blank" rel="noreferrer">Open original post</a>`
+      );
+    }
+    if (job.facebookUrl && job.facebookUrl !== job._link) {
+      links.push(
+        `<a href="${esc(job.facebookUrl)}" target="_blank" rel="noreferrer">Open Facebook link</a>`
+      );
+    }
+    const toggleLabel = job._read ? "Mark as unread" : "Mark as read";
+    links.push(`<button type="button" data-action="toggle-read">${toggleLabel}</button>`);
+    details.push(
+      `<div class="detail-actions">${links
+        .map((item) => `<span>${item}</span>`)
+        .join("")}</div>`
+    );
+
+    const timeline = [];
+    if (job.postDate || job.posted_at) {
+      timeline.push(`<strong>Posted:</strong> ${esc(formatDate(job.postDate || job.posted_at))}`);
+    }
+    if (job.importedAt) {
+      timeline.push(`<strong>Imported:</strong> ${esc(formatDate(job.importedAt))}`);
+    }
+    if (job.fetched_at) {
+      timeline.push(`<strong>Fetched:</strong> ${esc(formatDate(job.fetched_at))}`);
+    }
+    if (job._readAt) {
+      timeline.push(`<strong>Read:</strong> ${esc(formatDate(job._readAt))}`);
+    }
+    if (timeline.length) {
+      details.push(`<div class="detail-meta">${timeline.join("<br>")}</div>`);
+    }
+
+    if (job._text) {
+      const formatted = esc(job._text).replace(/\n/g, "<br>");
+      details.push(`<div class="detail-text">${formatted}</div>`);
+    }
+
+    if (job._haystack && job._haystack !== job._text.toLowerCase()) {
+      const rawJson = esc(JSON.stringify(job, null, 2));
+      details.push(
+        `<details class="detail-raw"><summary>Show raw data</summary><pre>${rawJson}</pre></details>`
+      );
+    }
+
+    detailEl.innerHTML = details.join("");
+
+    const toggleBtn = detailEl.querySelector('[data-action="toggle-read"]');
+    if (toggleBtn) {
+      toggleBtn.addEventListener("click", () => toggleRead(job));
+    }
+  }
+
+  function setRead(job, value){
+    if (!job) return;
+    if (value) {
+      const ts = nowISO();
+      readMap[job.id] = ts;
+      job._read = true;
+      job._readAt = ts;
+    } else {
+      delete readMap[job.id];
+      job._read = false;
+      job._readAt = null;
+    }
+    persistReadMap();
+  }
+
+  function markAsRead(job){
+    if (!job || job._read) return;
+    setRead(job, true);
+  }
+
+  function toggleRead(job){
+    if (!job) return;
+    setRead(job, !job._read);
+    applyFilters();
+  }
+
+  function applyFilters(){
+    const query = qInput ? qInput.value.trim().toLowerCase() : "";
+    const source = sourceSelect ? sourceSelect.value : "";
+    const ageDays = ageSelect ? Number(ageSelect.value || 0) : 0;
+    const sort = sortSelect ? sortSelect.value : "new";
+    const onlyUnread = onlyUnreadCheckbox ? onlyUnreadCheckbox.checked : false;
+
+    const now = Date.now();
+    const ageThreshold = ageDays ? now - ageDays * 86400000 : null;
+
+    filtered = data.filter((job) => {
+      if (source && job._source !== source) return false;
+      if (query && (!job._haystack || !job._haystack.includes(query))) return false;
+      if (onlyUnread && job._read) return false;
+      if (ageThreshold && job._timestamp) {
+        if (job._timestamp < ageThreshold) return false;
+      }
+      return true;
+    });
+
+    const sortAccessor = (job) => (job._timestamp ? job._timestamp : 0);
+    filtered.sort((a, b) => {
+      const diff = sortAccessor(a) - sortAccessor(b);
+      return sort === "old" ? diff : -diff;
+    });
+
+    renderTable();
+    renderMeta();
+    renderDetail(itemsById.get(selectedId) || null);
+  }
+
+  function handleRowClick(event){
+    const tr = event.target.closest("tr");
+    if (!tr) return;
+    const id = tr.dataset.id;
+    if (!id) return;
+    const job = itemsById.get(id);
+    if (!job) return;
+    selectedId = job.id;
+    markAsRead(job);
+    renderDetail(job);
+    applyFilters();
+  }
+
+  async function loadData(){
+    try {
+      const res = await fetch(path, { cache: "no-store" });
+      if (!res.ok) throw new Error(`HTTP ${res.status}`);
+      const payload = await res.json();
+      const items = Array.isArray(payload?.items) ? payload.items : [];
+      updatedAt = payload?.updatedAt || null;
+
+      const prepared = [];
+      itemsById.clear();
+      for (const raw of items) {
+        const job = normaliseJob(raw);
+        if (!job) continue;
+        prepared.push(job);
+        itemsById.set(job.id, job);
+      }
+
+      data = prepared;
+      selectedId = data[0]?.id || null;
+      populateSources(data);
+      applyFilters();
+    } catch (err) {
+      console.error("Radar dashboard: failed to load jobs", err);
+      metaEl.textContent = "Failed to load jobs.";
+      tableEl.style.display = "none";
+      fallbackEl.style.display = "block";
+      fallbackEl.textContent = "Failed to load jobs.";
+      detailEl.innerHTML = "<em>Unable to load data.</em>";
+    }
+  }
+
+  function init(){
+    if (tbodyEl) tbodyEl.addEventListener("click", handleRowClick);
+    if (qInput) qInput.addEventListener("input", debounce(applyFilters, 150));
+    if (sourceSelect) sourceSelect.addEventListener("change", applyFilters);
+    if (ageSelect) ageSelect.addEventListener("change", applyFilters);
+    if (sortSelect) sortSelect.addEventListener("change", applyFilters);
+    if (onlyUnreadCheckbox) onlyUnreadCheckbox.addEventListener("change", applyFilters);
+
+    loadData();
+  }
+
+  if (document.readyState === "loading") {
+    document.addEventListener("DOMContentLoaded", init, { once: true });
+  } else {
+    init();
+  }
+})();
