/* Selfcast – Production Role Builder
   - Minimal role inputs (title, role URL, hero)
   - Two-up cards in preview
   - Save to localStorage
   - Share link uses compressed URL (shorter than base64)
   - Read-only viewer at /view/?d=...
*/

/* --- LZString (URI-safe compression) --- */
!function(r){function t(r){return o.charAt(r)}function e(r){return r.charCodeAt(0)}var n=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",i={};i.compressToEncodedURIComponent=function(r){return null==r?"":i._compress(r,6,function(r){return t(r)})},i.decompressFromEncodedURIComponent=function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(t){return function(r,t){if(!i._uriSafe)for(var e={},n=0;n<o.length;n++)e[o.charAt(n)]=n;i._uriSafe=!0;return e[r.charAt(t)]}(r,t)})},i._compress=function(r,t,e){if(null==r)return"";var n,o,i,s={},a={},l="",c="",u="",f=2,d=3,h=2,p=[],v=0,g=0;for(i=0;i<r.length;i+=1)if(l=r.charAt(i),Object.prototype.hasOwnProperty.call(s,l)||(s[l]=d++,a[l]=!0),c=u+l,Object.prototype.hasOwnProperty.call(s,c))u=c;else{if(Object.prototype.hasOwnProperty.call(a,u)){if(u.charCodeAt(0)<256){for(n=0;n<h;n++)v<<=1,g==t-1?(g=0,p.push(e(v)),v=0):g++;for(o=u.charCodeAt(0),n=0;n<8;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1}else{for(o=1,n=0;n<h;n++)v=v<<1|o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o=0;for(o=u.charCodeAt(0),n=0;n<16;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1}f--,0==f&&(f=Math.pow(2,h),h++),delete a[u]}else for(o=s[u],n=0;n<h;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1;f--,0==f&&(f=Math.pow(2,h),h++),s[c]=d++,u=String(l)}if(""!==u){if(Object.prototype.hasOwnProperty.call(a,u)){if(u.charCodeAt(0)<256){for(n=0;n<h;n++)v<<=1,g==t-1?(g=0,p.push(e(v)),v=0):g++;for(o=u.charCodeAt(0),n=0;n<8;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1}else{for(o=1,n=0;n<h;n++)v=v<<1|o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o=0;for(o=u.charCodeAt(0),n=0;n<16;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1}f--,0==f&&(f=Math.pow(2,h),h++),delete a[u]}else for(o=s[u],n=0;n<h;n++)v=v<<1|1&o,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1;f--,0==f&&(f=Math.pow(2,h),h++)}for(o=2,n=0;n<h;n++)v=v<<1|o&1,g==t-1?(g=0,p.push(e(v)),v=0):g++,o>>=1;for(;;){if(v<<=1,g==t-1){p.push(e(v));break}g++}return p.join("")},i._decompress=function(r,t,e){var o,i,s,a,l,c,u,f=[],d=4,h=4,p=3,v="",g=[],m={val:e(0),position:t,index:1};for(o=0;o<3;o+=1)f[o]=o;for(s=0,c=Math.pow(2,2),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;switch(s){case 0:for(s=0,c=Math.pow(2,8),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;g[3]=n(s);break;case 1:for(s=0,c=Math.pow(2,16),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;g[3]=n(s);break;case 2:return""}for(l=g[3],f[3]=l,i=l;!0;){if(m.index>r)return"";for(s=0,c=Math.pow(2,p),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;switch(l=s){case 0:for(s=0,c=Math.pow(2,8),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;f[h++]=n(s),l=h-1,d--;break;case 1:for(s=0,c=Math.pow(2,16),u=1;u!=c;)a=m.val&m.position,m.position>>=1,0==m.position&&(m.position=t,m.val=e(m.index++)),s|=(a>0?1:0)*u,u<<=1;f[h++]=n(s),l=h-1,d--;break;case 2:return i}if(0==d&&(d=Math.pow(2,p),p++),f[l])v=f[l];else{if(l!==h)return null;v=i+n(i.charCodeAt(0))}i+=v.charAt(0),f[h++]=i,i=v}};
// expose
const LZ = i;

/* --- tiny helpers --- */
const el = (id)=>document.getElementById(id);
const esc = s => (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
const setStatus = (msg)=>{ el('status').textContent = msg; setTimeout(()=>el('status').textContent="",2500); };

/* --- state --- */
const state = {
  projectName:"",
  brand:{ logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
  contact:{ person:"", email:"", phone:"" },
  roles:[ { title:"New role", roleUrl:"", hero:"" } ],
  showHow:true
};
const STORAGE_KEY = "sc_deckroles_project_v1";

/* --- load/save --- */
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    Object.assign(state, JSON.parse(raw));
  }catch(e){}
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setStatus("Saved");
}

/* --- share link (compressed) --- */
function pack(obj){ return LZ.compressToEncodedURIComponent(JSON.stringify(obj)); }
function unpack(s){ return JSON.parse(LZ.decompressFromEncodedURIComponent(s)); }
function snapshot(){
  return {
    projectName: state.projectName,
    brand: state.brand,
    contact: state.contact,
    roles: state.roles,
    showHow: state.showHow
  };
}
function makeShareUrl(){
  const data = pack(snapshot());
  return `${location.origin}/view/?d=${data}`;
}

/* --- builder inputs wiring --- */
function bindInputs(){
  const b = state.brand, c = state.contact;
  el('projectName').value = state.projectName;
  el('brandLogo').value = b.logoUrl||"";
  el('brandWordmark').value = b.wordmark||"";
  el('brandSubtitle').value = b.subtitle||"";
  el('brandShow').value = b.showWordmark? "1":"0";
  el('contactPerson').value = c.person||"";
  el('contactEmail').value = c.email||"";
  el('contactPhone').value = c.phone||"";

  el('projectName').oninput = e=>{ state.projectName=e.target.value; render(); };
  el('brandLogo').oninput = e=>{ state.brand.logoUrl=e.target.value; render(); };
  el('brandWordmark').oninput = e=>{ state.brand.wordmark=e.target.value; render(); };
  el('brandSubtitle').oninput = e=>{ state.brand.subtitle=e.target.value; render(); };
  el('brandShow').onchange = e=>{ state.brand.showWordmark=(e.target.value==="1"); render(); };
  el('contactPerson').oninput = e=>{ state.contact.person=e.target.value; render(); };
  el('contactEmail').oninput = e=>{ state.contact.email=e.target.value; render(); };
  el('contactPhone').oninput = e=>{ state.contact.phone=e.target.value; render(); };
}

/* --- role editor UI (simple) --- */
function roleCard(role, index){
  const wrap = document.createElement('div');
  wrap.className = 'card stack';
  wrap.innerHTML = `
    <div class="between">
      <h3>Role #${index+1}</h3>
      <div class="no-print" style="display:flex;gap:8px">
        <button class="btn secondary" data-action="auto">Auto-fill</button>
        <button class="btn secondary" data-action="paste">Paste meta</button>
        <button class="btn ghost" data-action="remove">Remove</button>
      </div>
    </div>
    <div class="row">
      <div>
        <label>Role title</label>
        <input data-key="title" value="${esc(role.title)}" placeholder="New role"/>
      </div>
      <div>
        <label>Role link (producer.selfcast.com/.../role/...)</label>
        <input data-key="roleUrl" value="${esc(role.roleUrl||'')}"/>
      </div>
    </div>
    <div>
      <label>Hero image URL (optional)</label>
      <input data-key="hero" value="${esc(role.hero||'')}" placeholder="Top image URL from the role page"/>
    </div>
  `;
  wrap.querySelectorAll('input[data-key]').forEach(inp=>{
    inp.addEventListener('input',()=>{
      role[inp.getAttribute('data-key')] = inp.value;
      render();
    });
  });
  wrap.querySelector('[data-action="remove"]').addEventListener('click',()=>{
    state.roles.splice(index,1); render();
  });
  wrap.querySelector('[data-action="auto"]').addEventListener('click',()=>{
    // naive auto from role page if public assets are readable
    // (kept simple – you can paste meta if page is private)
    const url = role.roleUrl;
    if(!url){ alert("Add role link first"); return; }
    try{
      // best effort: infer title from path
      const guess = decodeURIComponent(url.split('/').pop()).replace(/[-_]/g,' ');
      if(guess && !role.title) role.title = guess;
      render();
    }catch(e){}
  });
  wrap.querySelector('[data-action="paste"]').addEventListener('click', async ()=>{
    try{
      const text = await navigator.clipboard.readText();
      const meta = JSON.parse(text);
      if(meta.title) role.title = meta.title;
      if(meta.url) role.roleUrl = meta.url;
      if(meta.hero) role.hero = meta.hero;
      render();
    }catch(e){ alert("Could not read meta from clipboard"); }
  });
  return wrap;
}
function renderBuilder(){
  const rolesWrap = document.getElementById('rolesWrap');
  rolesWrap.innerHTML = '';
  state.roles.forEach((r,i)=> rolesWrap.appendChild(roleCard(r,i)));
}

/* --- presentation (cover + how + roles grid) --- */
function cover(){
  const b = state.brand;
  const box = document.createElement('section');
  box.className = 'sheet';
  box.innerHTML = `
    <div class="pad">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="display:flex;align-items:center;gap:12px">
          ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="Logo" style="height:40px;border-radius:8px;border:1px solid #eee">` : ``}
          <div class="proj-title">${esc(state.projectName||'Untitled')}</div>
        </div>
        <div style="text-align:right">
          ${b.showWordmark ? `
            <div class="wordmark">${esc(b.wordmark||'SELFCAST')}</div>
            <div class="subtitle">${esc(b.subtitle||'CASTING MADE EASY')}</div>` : ``}
        </div>
      </div>
    </div>`;
  return box;
}
function howItWorks(){
  const c = state.contact;
  const sec = document.createElement('section');
  sec.className = 'sheet';
  sec.innerHTML = `
    <div class="pad">
      <div class="how">
        <h2>THIS IS HOW IT WORKS!</h2>
        <p><strong>Decline</strong><br>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
        <p><strong><span class="green">Requested videos/photos</span></strong><br>See new videos or photos uploaded by the Talent for this job.</p>
        <p><strong>Talent picture</strong><br>Click a Talent’s picture to open their full profile.</p>
        <p><strong>Add to Shortlist</strong><br>Move Talents forward in the process, or book a Talent directly.</p>
        <div style="margin-top:10px;border-top:1px dashed var(--accent);padding-top:8px;color:#111">
          <div style="font-size:13px">If you need assistance:</div>
          <div style="color:#6b7280">${esc(c.person||"Selfcast")}${c.email?` · ${esc(c.email)}`:""}${c.phone?` · ${esc(c.phone)}`:""}</div>
        </div>
      </div>
    </div>`;
  return sec;
}
function rolesGrid(){
  const sec = document.createElement('section');
  sec.className = 'sheet';
  sec.innerHTML = `
    <div class="pad">
      <div class="rolegrid">
        ${state.roles.map(r=>`
          <div class="rolecard">
            <div class="imgwrap">
              ${r.hero ? `<img src="${esc(r.hero)}" alt="${esc(r.title)}">` : `<div style="height:230px;background:#f4f4f5"></div>`}
              ${r.roleUrl ? `<a class="rolecta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>` : ``}
            </div>
            <div class="cap"><div style="font-weight:800">${esc(r.title||"")}</div></div>
          </div>
        `).join('')}
      </div>
    </div>`;
  return sec;
}

function render(){
  bindInputs();
  renderBuilder();

  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  preview.appendChild(cover());
  if(state.showHow) preview.appendChild(howItWorks());
  preview.appendChild(rolesGrid());
}

/* --- buttons --- */
document.getElementById('btn-add-role').addEventListener('click',()=>{
  state.roles.push({ title:"New role", roleUrl:"", hero:"" });
  render();
});
document.getElementById('btn-save').addEventListener('click', save);
document.getElementById('btn-print').addEventListener('click', ()=>window.print());
document.getElementById('btn-share').addEventListener('click', async ()=>{
  const url = makeShareUrl();
  try{ await navigator.clipboard.writeText(url); setStatus("Share link copied"); }
  catch{ prompt("Copy this link:", url); }
});
document.getElementById('btn-open-share').addEventListener('click', (e)=>{
  e.currentTarget.href = makeShareUrl();
});

/* --- init --- */
load();
render();
