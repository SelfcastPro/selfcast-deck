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
@@ -185,101 +199,192 @@
    if (url && text) return `${url}|${text}`;
    if (text) return text;
    return null;
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
    "contactEmailAddress",
    "contact_email",
    "contact_emails",
    "producerEmail",
    "producerEmails",
  ];
  const EMAIL_TEXT_FIELDS = ["text", "summary", "snippet", "description", "message", "body"];

  function extractEmails(raw){
    if (!raw || typeof raw !== "object") return [];

    const found = new Map();

    const addEmail = (value) => {
      if (!value) return;
      const matches = String(value).match(EMAIL_PATTERN);
      if (!matches) return;
      for (const match of matches) {
        const trimmed = match.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!found.has(lower)) {
          found.set(lower, trimmed);
        }
      }
    };

    const collect = (value, depth = 0) => {
      if (!value || depth > 3) return;
      if (typeof value === "string" || typeof value === "number") {
        addEmail(value);
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          collect(item, depth + 1);
        }
        return;
      }
      if (typeof value === "object") {
        for (const field of EMAIL_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(value, field)) {
            collect(value[field], depth + 1);
          }
        }
      }
    };

    for (const field of EMAIL_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(raw, field)) {
        collect(raw[field]);
      }
    }

    if (raw.contact) collect(raw.contact);
    if (raw.contactInfo) collect(raw.contactInfo);
    if (raw.metadata) collect(raw.metadata);
    if (raw.details) collect(raw.details);
    if (raw.organisation) collect(raw.organisation);
    if (Array.isArray(raw.contacts)) {
      for (const contact of raw.contacts) {
        collect(contact);
      }
    }
    if (Array.isArray(raw.contactPersons)) {
      for (const person of raw.contactPersons) {
        collect(person);
      }
    }

    for (const field of EMAIL_TEXT_FIELDS) {
      if (raw[field]) {
        collect(raw[field]);
      }
    }

    return Array.from(found.values());
  }

  function normaliseJob(raw){
    if (!raw || typeof raw !== "object") return null;
    const emailList = extractEmails(raw);
    const job = { ...raw };
    const id = stableId(job);
    if (!id) return null;
    job.id = id;

    const sourceCandidate =
      job.source || job.sourceName || job.origin || job.provider || "Unknown";
    job._source = String(sourceCandidate);
    job._country = job.country ? String(job.country) : "";

    const textCandidate =
      job.text ||
      job.summary ||
      job.snippet ||
      job.message ||
      job.description ||
      "";
    job._text = String(textCandidate || "");
    job._snippet = job._text
      ? job._text.replace(/\s+/g, " ").trim().slice(0, 320)
      : "";

    const haystackParts = [
      job.title,
      job._text,
      job._source,
      job._country,
      job.language,
      job.tags ? job.tags.join(" ") : "",
      job?.user?.name,
      emailList.join(" "),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    job._haystack = haystackParts.join(" ");

    job._timestamp = jobTimestamp(job);
    job._dateLabel = job._timestamp ? formatDate(job._timestamp) : "";

    const linkCandidate =
      job.url ||
      job.facebookUrl ||
      job.permalinkUrl ||
      job.postUrl ||
      job.link ||
      "";
    job._link = linkCandidate ? String(linkCandidate) : "";

    job._readAt = readMap[job.id] || null;
    job._read = Boolean(job._readAt);
    job._emails = emailList;
    job._primaryEmail = emailList.length ? emailList[0] : "";

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
@@ -337,124 +442,264 @@
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
    if (title) spottedLine += ` "${title}"`;
    if (source) spottedLine += ` on ${source}`;
    spottedLine += ".";
    lines.push(spottedLine);
    lines.push(
      "Selfcast is a global roster of actors ready to deliver self-tapes within 24 hours."
    );
    lines.push("If you're still casting, we'd love to help connect you with suitable talent fast.");
    if (country) {
      lines.push(`We can prioritise talent based in ${country}.`);
    }
    if (link) {
      lines.push("", `Listing: ${link}`);
    }
    lines.push("", "Best,", "The Selfcast Team");

    return { subject, body: lines.join("\n") };
  }

  function openMailClient(email, template){
    if (!email) return;
    const params = [];
    if (template?.subject) params.push(`subject=${encodeURIComponent(template.subject)}`);
    if (template?.body) params.push(`body=${encodeURIComponent(template.body)}`);
    const query = params.length ? `?${params.join("&")}` : "";
    window.location.href = `mailto:${encodeURIComponent(email)}${query}`;
  }

  async function sendProducerReply(job, emails, button){
    if (!emails || !emails.length) {
      showToast("No email address available for this job", "error");
      return;
    }

    const primaryEmail = emails[0];
    const template = buildProducerEmailTemplate(job);

    if (button) button.disabled = true;

    if (typeof fetch !== "function") {
      showToast("Opening email client…", "info");
      openMailClient(primaryEmail, template);
      if (button) button.disabled = false;
      return;
    }

    showToast("Sending email…", "info");

    try {
      const response = await fetch("/api/sendProducerReply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: primaryEmail,
          jobId: job?.id || null,
          jobTitle: job?.title || job?._snippet || "",
          jobSource: job?._source || job?.source || "",
          jobLink: job?._link || job?.facebookUrl || job?.url || "",
          jobCountry: job?._country || job?.country || "",
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok && data && data.ok) {
        showToast("Producer reply sent", "success");
        return;
      }

      if (response.status === 501 || data?.code === "smtp_not_configured") {
        const fallbackTemplate = data?.template && data.template.body ? data.template : template;
        showToast("Mail service not configured. Opening email client…", "info");
        openMailClient(primaryEmail, fallbackTemplate);
        return;
      }

      const errorMessage =
        (data && (data.error || data.message)) || `Failed to send email (${response.status})`;
      showToast(errorMessage, "error");
    } catch (err) {
      console.error("Radar dashboard: failed to send producer reply", err);
      showToast("Unable to contact email service. Opening email client…", "error");
      openMailClient(primaryEmail, template);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderDetail(job){
    if (!job) {
      detailEl.innerHTML = "<em>Select a post…</em>";
      return;
    }

    const inFiltered = filtered.some((item) => item.id === job.id);
    const emails = Array.isArray(job._emails) ? job._emails : [];
    const details = [];
    details.push(`<h2>${esc(job.title || "(no title)")}</h2>`);
    const metaBits = [];
    if (job._source) metaBits.push(esc(job._source));
    if (job._country) metaBits.push(esc(job._country));
    if (job?.user?.name) metaBits.push(esc(job.user.name));
    if (metaBits.length) {
      details.push(`<div class="small">${metaBits.join(" · ")}</div>`);
    }
    if (!inFiltered) {
      details.push(
        '<div class="detail-note">Hidden by current filters. Adjust filters to show this post in the list.</div>'
      );
    }

    if (emails.length) {
      const emailLinks = emails
        .map((address) => {
          const href = `mailto:${encodeURIComponent(address)}`;
          return `<a href="${href}">${esc(address)}</a>`;
        })
        .join("<br>");
      details.push(`<div class="detail-contact"><strong>Emails:</strong><br>${emailLinks}</div>`);
    }

    const links = [];
    if (job._link) {
      links.push(
        `<a href="${esc(job._link)}" target="_blank" rel="noreferrer">Open original post</a>`
      );
    }
    if (job.facebookUrl && job.facebookUrl !== job._link) {
      links.push(
        `<a href="${esc(job.facebookUrl)}" target="_blank" rel="noreferrer">Open Facebook link</a>`
      );
    }
    if (emails.length) {
      const primaryEmail = emails[0];
      const label = emails.length > 1 ? `Email producer (${emails.length})` : "Email producer";
      links.push(
        `<button type="button" data-action="producer-email" title="Send to ${esc(
          primaryEmail
        )}">${label}</button>`
      );
    }
    const toggleLabel = job._read ? "Mark as unread" : "Mark as read";
    links.push(`<button type="button" data-action="toggle-read">${toggleLabel}</button>`);
    details.push(
      `<div class="detail-actions">${links
        .map((item) => `<span>${item}</span>`)
        .join("")}</div>`
    );

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
      details.push(`<div class="detail-meta">${timeline.join("<br>")}</div>`);
    }

    if (job._text) {
      const formatted = esc(job._text).replace(/\n/g, "<br>");
      details.push(`<div class="detail-text">${formatted}</div>`);
    }

        const rawJson = esc(JSON.stringify(job, null, 2));
    details.push(
      `<details class="detail-raw"><summary>Show raw data</summary><pre>${rawJson}</pre></details>`
    );

    detailEl.innerHTML = details.join("");

    const toggleBtn = detailEl.querySelector('[data-action="toggle-read"]');
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => toggleRead(job));
    }
    const producerBtn = detailEl.querySelector('[data-action="producer-email"]');
    if (producerBtn) {
      producerBtn.addEventListener("click", () => sendProducerReply(job, emails, producerBtn));
    }
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
