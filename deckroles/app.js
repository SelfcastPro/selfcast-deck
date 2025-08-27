/* Selfcast – Production Role Builder (standalone)
   - Saves to localStorage
   - Share link packs state in URL
   - Two-up preview grid
   - Clear all, Download PDF, Read-only open
*/

(function(){
  // ---------- utils ----------
  const LS_KEY = "sc_deckroles_project_v1";

  const $ = sel => document.querySelector(sel);
  const el = (tag, attrs={}, html="")=>{
    const n = document.createElement(tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (html) n.innerHTML = html;
    return n;
  };
  const esc = s => (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // base64 (utf-8 safe)
  const pack = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const unpack = s => JSON.parse(decodeURIComponent(escape(atob(s))));

  // ---------- state ----------
  let state = {
    projectName: "",
    brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
    contact: { person:"", email:"", phone:"" },
    roles: [],             // [{title, roleUrl, hero}]
    showHow: true
  };

  // load
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = {...state, ...JSON.parse(raw)};
  } catch {}

  // ---------- save helpers ----------
  function save(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    flash("Saved");
    render();
  }
  function clearAll(){
    if (!confirm("Clear everything in this builder?")) return;
    localStorage.removeItem(LS_KEY);
    state = {
      projectName:"", brand:{logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true},
      contact:{person:"", email:"", phone:""}, roles:[], showHow:true
    };
    render();
    flash("Cleared");
  }
  function flash(msg){
    const n = el("div",{style:"position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #444;border-radius:10px;padding:8px 12px;color:#fff;font-weight:700;z-index:9999"}, esc(msg));
    document.body.appendChild(n); setTimeout(()=>n.remove(),1500);
  }

  // ---------- share ----------
  function currentSnapshot(){
    return {
      projectName: state.projectName,
      brand: state.brand,
      contact: state.contact,
      roles: state.roles,
      showHow: state.showHow
    };
  }
  function makeShareUrl(){
    const data = pack(currentSnapshot());
    return `${location.origin}/view/?d=${data}`;
  }

  // ---------- inputs wiring ----------
  function bindInputs(){
    $("#projectName").value = state.projectName || "";
    $("#brandWordmark").value = state.brand.wordmark || "SELFCAST";
    $("#brandSubtitle").value = state.brand.subtitle || "CASTING MADE EASY";
    $("#brandLogo").value = state.brand.logoUrl || "";
    $("#brandShow").value = state.brand.showWordmark !== false ? "yes" : "no";

    $("#contactPerson").value = state.contact.person || "";
    $("#contactEmail").value = state.contact.email || "";
    $("#contactPhone").value = state.contact.phone || "";

    $("#projectName").oninput = e => { state.projectName = e.target.value; save(); };
    $("#brandWordmark").oninput = e => { state.brand.wordmark = e.target.value; save(); };
    $("#brandSubtitle").oninput = e => { state.brand.subtitle = e.target.value; save(); };
    $("#brandLogo").oninput = e => { state.brand.logoUrl = e.target.value; save(); };
    $("#brandShow").onchange = e => { state.brand.showWordmark = e.target.value === "yes"; save(); };

    $("#contactPerson").oninput = e => { state.contact.person = e.target.value; save(); };
    $("#contactEmail").oninput  = e => { state.contact.email  = e.target.value; save(); };
    $("#contactPhone").oninput  = e => { state.contact.phone  = e.target.value; save(); };

    // buttons
    $("#btn-save").onclick = save;
    $("#btn-clear").onclick = clearAll;
    $("#btn-share").onclick = async ()=>{
      const url = makeShareUrl();
      try { await navigator.clipboard.writeText(url); flash("Share link copied"); }
      catch { prompt("Copy this link:", url); }
    };
    $("#btn-open-share").onclick = (e)=>{
      e.preventDefault();
      const url = makeShareUrl();
      $("#btn-open-share").href = url;
      window.open(url, "_blank","noreferrer");
    };
    $("#btn-pdf").onclick = ()=>{
      // Open view in a new window; the /view/ page handles printing layout
      const url = makeShareUrl();
      window.open(url, "_blank", "noreferrer");
    };
  }

  // ---------- roles UI ----------
  function addRole(prefill){
    state.roles.push({
      title: prefill?.title || "New role",
      roleUrl: prefill?.url || "",
      hero: prefill?.hero || ""
    });
    save();
  }
  function removeRole(idx){
    state.roles.splice(idx,1);
    save();
  }
  function pasteMeta(idx){
    const raw = prompt("Paste meta (JSON from bookmarklet):");
    if(!raw) return;
    try{
      const m = JSON.parse(raw);
      const r = state.roles[idx];
      if (m.title) r.title = m.title;
      if (m.url)   r.roleUrl = m.url;
      if (m.hero)  r.hero = m.hero;
      save();
    }catch{
      alert("Invalid JSON");
    }
  }

  function roleCard(r, idx){
    const wrap = el("div",{class:"role"});
    wrap.append(
      el("div",{class:"row"},
        `
        <div class="field">
          <div class="label">Role title</div>
          <input type="text" value="${esc(r.title||"")}" data-k="title" data-i="${idx}">
        </div>
        <div class="field">
          <div class="label">Role link (producer.selfcast.com/.../role/...)</div>
          <input type="url" value="${esc(r.roleUrl||"")}" placeholder="https://..." data-k="roleUrl" data-i="${idx}">
        </div>
        `
      )
    );
    wrap.append(
      el("div",{class:"row"},
        `
        <div class="field">
          <div class="label">Hero image URL (optional)</div>
          <input type="url" value="${esc(r.hero||"")}" placeholder="Top image URL" data-k="hero" data-i="${idx}">
        </div>
        <div class="actions">
          <button class="btn gray" data-act="paste" data-i="${idx}">Paste meta</button>
          <button class="btn ghost" data-act="remove" data-i="${idx}">Remove</button>
        </div>
        `
      )
    );
    return wrap;
  }

  function wireRoleInputs(container){
    container.querySelectorAll("input[data-k]").forEach(inp=>{
      inp.oninput = (e)=>{
        const i = +e.target.getAttribute("data-i");
        const k = e.target.getAttribute("data-k");
        state.roles[i][k] = e.target.value;
        save();
      };
    });
    container.querySelectorAll("button[data-act='remove']").forEach(b=>{
      b.onclick = e => removeRole(+e.currentTarget.getAttribute("data-i"));
    });
    container.querySelectorAll("button[data-act='paste']").forEach(b=>{
      b.onclick = e => pasteMeta(+e.currentTarget.getAttribute("data-i"));
    });
  }

  // ---------- preview ----------
  function cover(){
    const left = `
      <div>
        <div style="font-size:30px;font-weight:900">${esc(state.projectName||"Untitled")}</div>
      </div>`;
    const right = `
      <div style="display:flex;align-items:center;gap:12px">
        ${state.brand.showWordmark !== false ? `
          <div style="text-align:right">
            <div class="wordmark">${esc(state.brand.wordmark||"SELFCAST")}</div>
            <div class="subtitle">${esc(state.brand.subtitle||"CASTING MADE EASY")}</div>
          </div>` : ``}
        ${state.brand.logoUrl ? `<img src="${esc(state.brand.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee;background:#fff">` : ``}
      </div>`;
    return `
      <section class="cover">
        <div class="cover-head">${left}${right}</div>
        ${state.showHow ? `
        <div class="how" style="margin-top:12px">
          <h3>THIS IS HOW IT WORKS!</h3>
          <p><strong>Decline</strong><br>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
          <p><strong><span class="green">Requested videos/photos</span></strong><br>See new videos or photos uploaded by the Talent for this job.</p>
          <p><strong>Talent picture</strong><br>Click a Talent’s picture to open their full profile.</p>
          <p><strong>Add to Shortlist</strong><br>Move Talents forward in the process, or book a Talent directly.</p>
          <div style="margin-top:8px;border-top:1px dashed var(--accent);padding-top:6px;color:#111">
            <div class="tip" style="color:#111">If you need assistance:</div>
            <div class="muted" style="color:#6b7280">${esc(state.contact.person||"Selfcast")}${state.contact.email?` · ${esc(state.contact.email)}`:""}${state.contact.phone?` · ${esc(state.contact.phone)}`:""}</div>
          </div>
        </div>` : ``}
      </section>`;
  }

  function rolesGrid(){
    const cards = (state.roles||[]).map(r=>`
      <div class="card">
        <div class="imgwrap">
          ${r.hero ? `<img src="${esc(r.hero)}" alt="${esc(r.title||"Role")}">` : `<div style="height:220px;background:#f4f4f5"></div>`}
          ${r.roleUrl ? `<a class="cta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>` : ``}
        </div>
        <div class="cap">${esc(r.title||"")}</div>
      </div>
    `).join("");
    return `<div class="rolegrid">${cards}</div>`;
  }

  // ---------- render ----------
  function render(){
    // roles list
    const rwrap = $("#roles"); rwrap.innerHTML = "";
    state.roles.forEach((r,i)=> rwrap.appendChild(roleCard(r,i)));
    wireRoleInputs(rwrap);

    // preview
    $("#preview").innerHTML = cover() + rolesGrid();
  }

  // add role button
  $("#btn-add-role").onclick = ()=> addRole();

  // initial bind + render
  bindInputs();
  render();

  // expose small debug (optional)
  window._sc_export = ()=>JSON.parse(JSON.stringify(state));

})();
