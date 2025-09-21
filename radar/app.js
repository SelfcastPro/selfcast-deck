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
    "emailAddresses",
    "contactEmail",
    "contactEmails",
    "contact_email",
    "contact_emails",
    "producerEmail",
    "producerEmails",
    "ownerEmail",
    "owner_email",
    "replyTo",
    "reply_to",
  ];
  const EMAIL_TEXT_FIELDS = [
    "text",
    "summary",
    "snippet",
    "description",
    "message",
    "body",
    "notes",
    "about",
  ];
  const PHONE_FIELDS = [
    "phone",
    "phones",
    "phoneNumber",
    "phoneNumbers",
    "contactPhone",
    "contactPhones",
    "telephone",
    "mobile",
    "mobilePhone",
    "contact_phone",
    "contact_number",
  ];
  const PHONE_PATTERN = /\+?[0-9][0-9().\s-]{5,}[0-9]/g;

  function collectEmailsFromValue(value, emails, depth = 0){
    if (!value || depth > 4) return;
    if (typeof value === "string") {
      const matches = value.match(EMAIL_PATTERN);
      if (!matches) return;
      for (const match of matches) {
        const normalised = match.trim().toLowerCase();
        if (normalised) emails.add(normalised);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectEmailsFromValue(entry, emails, depth + 1);
      }
      return;
    }
    if (typeof value === "object") {
      if (value === null) return;
      const nextDepth = depth + 1;
      if (typeof value.email === "string") {
        collectEmailsFromValue(value.email, emails, nextDepth);
      }
      if (typeof value.address === "string") {
        collectEmailsFromValue(value.address, emails, nextDepth);
      }
      if (
        typeof value.value === "string" &&
        (typeof value.type === "string" && value.type.toLowerCase().includes("email"))
      ) {
        collectEmailsFromValue(value.value, emails, nextDepth);
      }
      for (const [key, nested] of Object.entries(value)) {
        if (EMAIL_FIELDS.includes(key) || EMAIL_TEXT_FIELDS.includes(key) || /email/i.test(key)) {
          collectEmailsFromValue(nested, emails, nextDepth);
        }
      }
    }
  }

  function extractEmails(raw){
    if (!raw || typeof raw !== "object") return [];
    const emails = new Set();
    for (const field of EMAIL_FIELDS) {
      if (field in raw) {
        collectEmailsFromValue(raw[field], emails, 0);
      }
    }
    for (const field of EMAIL_TEXT_FIELDS) {
      if (typeof raw[field] === "string") {
        collectEmailsFromValue(raw[field], emails, 0);
      }
    }
    if (Array.isArray(raw.contacts)) {
      for (const contact of raw.contacts) {
        collectEmailsFromValue(contact, emails, 0);
      }
    }
    if (raw.contact) {
      collectEmailsFromValue(raw.contact, emails, 0);
    }
    return Array.from(emails).sort((a, b) => a.localeCompare(b));
  }

  function collectPhonesFromValue(value, map, depth = 0){
    if (!value || depth > 4) return;
    if (typeof value === "string") {
      const matches = value.match(PHONE_PATTERN);
      if (!matches) return;
      for (const match of matches) {
        const formatted = match.trim();
        if (!formatted) continue;
        const key = formatted.replace(/[^0-9+]/g, "");
        if (!key) continue;
        if (!map.has(key)) {
          map.set(key, formatted);
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectPhonesFromValue(entry, map, depth + 1);
      }
      return;
    }
    if (typeof value === "object") {
      if (value === null) return;
      const nextDepth = depth + 1;
      if (typeof value.phone === "string") {
        collectPhonesFromValue(value.phone, map, nextDepth);
      }
      if (
        typeof value.value === "string" &&
        (typeof value.type === "string" && value.type.toLowerCase().includes("phone"))
      ) {
        collectPhonesFromValue(value.value, map, nextDepth);
      }
      for (const [key, nested] of Object.entries(value)) {
        if (PHONE_FIELDS.includes(key) || /phone|tel/i.test(key)) {
          collectPhonesFromValue(nested, map, nextDepth);
        }
      }
    }
  }

  function extractPhones(raw){
    if (!raw || typeof raw !== "object") return [];
    const map = new Map();
    for (const field of PHONE_FIELDS) {
      if (field in raw) {
        collectPhonesFromValue(raw[field], map, 0);
      }
    }
    if (Array.isArray(raw.contacts)) {
      for (const contact of raw.contacts) {
        collectPhonesFromValue(contact, map, 0);
      }
    }
    if (raw.contact) {
      collectPhonesFromValue(raw.contact, map, 0);
    }
    return Array.from(map.values());
  }

  function normaliseJob(raw){
    if (!raw || typeof raw !== "object") return null;
    const job = { ...raw };
    const id = stableId(job);
    if (!id) return null;
    job.id = id;

    const sourceCandidate =
      job._source ||
      job.source ||
      job.sourceName ||
      job.origin ||
      job.provider ||
      job.groupName ||
      job.channel ||
      job.feed ||
      job.site ||
      job.page ||
      job.owner?.name ||
      job.from?.name ||
      "Unknown";
    job._source = String(sourceCandidate).trim() || "Unknown";

    const countryCandidate =
      job._country ||
      job.country ||
      job.location?.country ||
      job.location?.name ||
      (Array.isArray(job.locations)
        ? job.locations
            .map((item) =>
              item && typeof item === "object"
                ? item.country || item.name || item.label
                : item
            )
            .find(Boolean)
        : null) ||
      job.region ||
      job.area ||
      job.countryCode ||
      "";
    job._country = countryCandidate ? String(countryCandidate).trim() : "";

    const textCandidate =
      job._text ||
      job.text ||
      job.summary ||
      job.snippet ||
      job.message ||
      job.description ||
      job.body ||
      job.caption ||
      "";
    job._text = String(textCandidate || "");
    job._snippet = job._text
      ? job._text.replace(/\s+/g, " ").trim().slice(0, 320)
      : "";

    const emails = extractEmails(job);
    job._emails = emails;
    job._primaryEmail = emails.length ? emails[0] : "";

    const phones = extractPhones(job);
    job._phones = phones;

    const haystackParts = [
      job.title,
      job._text,
      job._source,
      job._country,
      job.language,
      job.category,
      job.tags ? (Array.isArray(job.tags) ? job.tags.join(" ") : String(job.tags)) : "",
      job.user?.name,
      job.owner?.name,
      job.from?.name,
      job.company,
      job.employer,
      Array.isArray(job.locations)
        ? job.locations
            .map((item) =>
              item && typeof item === "object"
                ? item.country || item.name || item.label
                : item
            )
            .join(" ")
        : "",
      emails.join(" "),
      phones.join(" "),
    ].filter(Boolean);
    job._haystack = haystackParts
      .map((value) => String(value).toLowerCase())
      .join(" ");

    job._timestamp = jobTimestamp(job);
    job._dateLabel = job._timestamp ? formatDate(job._timestamp) : "";

    const linkCandidate =
      job._link ||
      job.url ||
      job.facebookUrl ||
      job.permalinkUrl ||
      job.postUrl ||
      job.link ||
      job.href ||
      job.externalUrl ||
      (typeof job.sharedPost?.url === "string" ? job.sharedPost.url : "") ||
      (typeof job.sharedPost?.permalink_url === "string"
        ? job.sharedPost.permalink_url
        : "");
    job._link = linkCandidate ? String(linkCandidate).trim() : "";

    job._readAt = readMap[job.id] || null;
    job._read = Boolean(job._readAt);

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

    const subject = "Regarding your casting call on Facebook";
    const lines = ["Hi,", ""];
    let intro = "We came across your casting post on Facebook";
    if (title) intro += ` for "${title}"`;
    if (country) intro += ` (${country})`;
    intro += " and wanted to introduce Selfcast as a casting partner.";
    lines.push(intro);
    lines.push("");
    lines.push(
      "Could you share a few more details about the production so we can tailor support?",
    );
    lines.push("");
    lines.push("✨ The more info you can share, the better we can help:");
    lines.push("- Project overview & format");
    lines.push("- Roles or talent you're casting (including headcount)");
    lines.push("- Key dates, deadlines, and timeline");
    lines.push("- Location(s)");
    lines.push("- Rates, budget, or union status");
    lines.push("");
    lines.push(
      "You'll be able to review and book talent via Selfcast once you're ready to move forward.",
    );
    lines.push("");
    lines.push("Best regards,");
    lines.push("Selfcast");
    lines.push("CASTING MADE EASY");

    const postText = [
      job?._text,
      job?.text,
      job?.summary,
      job?.description,
      job?.message,
      job?._snippet,
    ]
      .find((value) => typeof value === "string" && value.trim())
      ?.trim();

    if (title || link || postText) {
      lines.push("");
      if (title) lines.push(title);
      if (link) lines.push(`Casting link: ${link}`);
      if (postText) {
        lines.push("");
        lines.push(postText);
      }
    }

    return {
      subject,
      body: lines.join("\n"),
    };
  }

  async function copyToClipboard(value){
    if (!value) return false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) {
      console.warn("Radar dashboard: clipboard write failed", err);
    }
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try {
      success = document.execCommand ? document.execCommand("copy") : false;
    } catch (err) {
      success = false;
    }
    document.body.removeChild(textarea);
    return success;
  }

  function openMailClient(emails, template){
    if (!emails || !emails.length || !template || !template.body) return false;
    if (typeof window === "undefined") return false;
    const to = emails[0];
    const mailto =
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    try {
      window.open(mailto, "_blank");
      return true;
    } catch (err) {
      console.warn("Radar dashboard: unable to open mail client", err);
      return false;
    }
  }

  function renderDetail(job){
    if (!detailEl) return;
    if (!job) {
      detailEl.innerHTML = "<em>Select a post…</em>";
      return;
    }

    const inFiltered = filtered.some((item) => item.id === job.id);
    const emails = Array.isArray(job._emails) ? job._emails : [];
    const phones = Array.isArray(job._phones) ? job._phones : [];
    const template = buildProducerEmailTemplate(job);

    const parts = [];
    parts.push(`<h2>${esc(job.title || "(no title)")}</h2>`);

    const metaBits = [];
    if (job._source) metaBits.push(esc(job._source));
    if (job._country) metaBits.push(esc(job._country));
    if (job._dateLabel) metaBits.push(esc(job._dateLabel));
    if (job?.user?.name) metaBits.push(esc(job.user.name));
    if (metaBits.length) {
      parts.push(`<div class="small">${metaBits.join(" · ")}</div>`);
    }

    if (!inFiltered) {
      parts.push(
        '<div class="detail-note">Hidden by current filters. Adjust filters to show this post in the list.</div>'
      );
    }

    const actions = [];
    if (job._link) {
      actions.push(
        `<a href="${esc(job._link)}" target="_blank" rel="noreferrer">Open original post</a>`
      );
    }
    if (job.facebookUrl && job.facebookUrl !== job._link) {
      actions.push(
        `<a href="${esc(job.facebookUrl)}" target="_blank" rel="noreferrer">Facebook link</a>`
      );
    }
    if (emails.length && template.body) {
      actions.push('<button type="button" data-action="copy-email">Copy outreach email</button>');
      actions.push('<button type="button" data-action="compose-email">Compose email</button>');
    }
    const toggleLabel = job._read ? "Mark as unread" : "Mark as read";
    actions.push(`<button type="button" data-action="toggle-read">${toggleLabel}</button>`);
    if (actions.length) {
      parts.push(
        `<div class="detail-actions">${actions
          .map((html) => `<span>${html}</span>`)
          .join("")}</div>`
      );
    }

    const timeline = [];
    if (job.postDate || job.posted_at) {
      timeline.push(`<strong>Posted:</strong> ${esc(formatDate(job.postDate || job.posted_at))}`);
    }
    if (job.importedAt) {
      timeline.push(`<strong>Imported:</strong> ${esc(formatDate(job.importedAt))}`);
    }
    if (job.fetched_at) {
      timeline.push(`<strong>Fetched:</strong> ${esc(formatDate(job.fetched_at))}`);
    }
    if (job._readAt) {
      timeline.push(`<strong>Read:</strong> ${esc(formatDate(job._readAt))}`);
      }
    if (timeline.length) {
      parts.push(`<div class="detail-meta">${timeline.join("<br>")}</div>`);
    }

    if (emails.length) {
      const emailLinks = emails
        .map((email) => `<a href="mailto:${encodeURIComponent(email)}">${esc(email)}</a>`)
        .join(", ");
      parts.push(
        `<div class="detail-contact"><strong>Email${emails.length > 1 ? "s" : ""}:</strong> ${emailLinks}</div>`
      );
    } else {
      parts.push('<div class="detail-contact"><strong>Emails:</strong> None detected</div>');
    }
    if (phones.length) {
      parts.push(
        `<div class="detail-contact"><strong>Phone${phones.length > 1 ? "s" : ""}:</strong> ${phones
          .map((phone) => esc(phone))
          .join(", ")}</div>`
      );
    }

    if (template.body) {
      parts.push(
        `<details class="detail-email">
          <summary>Producer outreach email</summary>
          <div class="detail-email__subject"><strong>Subject:</strong> ${esc(template.subject)}</div>
          <pre>${esc(template.body)}</pre>
        </details>`
      );
    }

    if (job._text) {
      const formatted = esc(job._text).replace(/\n{2,}/g, "\n\n").replace(/\n/g, "<br>");
      parts.push(`<div class="detail-text">${formatted}</div>`);
    }

    const rawJson = esc(JSON.stringify(job, null, 2));
    parts.push(
      `<details class="detail-raw"><summary>Show raw data</summary><pre>${rawJson}</pre></details>`
    );

    detailEl.innerHTML = parts.join("");

    const toggleBtn = detailEl.querySelector('[data-action="toggle-read"]');
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => toggleRead(job));
    }

    const copyBtn = detailEl.querySelector('[data-action="copy-email"]');
    if (copyBtn && template.body) {
      copyBtn.addEventListener("click", async () => {
        const snippet = `Subject: ${template.subject}\n\n${template.body}`;
        const ok = await copyToClipboard(snippet);
        if (ok) {
          showToast("Email template copied to clipboard", "success");
        } else {
          showToast("Unable to copy email template", "error");
        }
      });
    }

    const composeBtn = detailEl.querySelector('[data-action="compose-email"]');
    if (composeBtn && template.body && emails.length) {
      composeBtn.addEventListener("click", () => {
        const opened = openMailClient(emails, template);
        if (opened) {
          composeBtn.classList.add("is-sent");
        } else {
          showToast("Unable to open email client", "error");
        }
      });
    }
  }  function setRead(job, value){
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
