// ------------------ LZ-String (URL-safe) ------------------
var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},e={compressToEncodedURIComponent:function(r){return null==r?"":e._compress(r,6,function(o){return n.charAt(o)})},decompressFromEncodedURIComponent:function(t){return null==t?"":""==t?null:e._decompress(t.length,32,function(e){return o(n,t.charAt(e))})},_compress:function(o,n,t){if(null==o)return"";var e,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==n-1?(v=0,d.push(t(m)),m=0):v++;for(i=a.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1}else{for(i=1,e=0;e<h;e++)m=m<<1|i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i=0;for(i=a.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(i=s[a],e=0;e<h;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==n-1?(v=0,d.push(t(m)),m=0):v++;for(i=a.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1}else{for(i=1,e=0;e<h;e++)m=m<<1|i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i=0;for(i=a.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(i=s[a],e=0;e<h;e++)m=m<<1|1&i,v==n-1?(v=0,d.push(t(m)),m=0):v++,i>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(i=0;i<h;i++)m<<=1,v==n-1?(v=0,d.push(t(m)),m=0):v++;for(;;){if(m<<=1,v==n-1){d.push(t(m));break}v++}return d.join("")},_decompress:function(o,t,e){var i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:t,index:1};for(i=0;i<3;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1; l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1; l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=t,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}; return e;}();

// ------------------ App state ------------------
const id = s => document.getElementById(s);
const STORAGE_KEY = "sc_deckroles_project_v1";
const state = {
  projectName:"",
  brand:{ logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
  contact:{ person:"", email:"", phone:"" },
  roles:[ { title:"New role", roleUrl:"", hero:"" } ],
  showHow:true
};

// ------------------ Helpers ------------------
function esc(s){ return (s||'').replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
function setStatus(msg){ const el=id('status'); el.textContent=msg; setTimeout(()=>{ if(el.textContent===msg) el.textContent=''; },2000); }
function pack(obj){ return LZString.compressToEncodedURIComponent(JSON.stringify(obj)); }
function unpack(s){ return JSON.parse(LZString.decompressFromEncodedURIComponent(s)); }
function currentSnapshot(){ return { projectName:state.projectName, brand:state.brand, contact:state.contact, roles:state.roles, showHow:state.showHow }; }
function makeShareUrl(){ return `${location.origin}/view/?d=${pack(currentSnapshot())}`; }
function decodeHtml(s){ const d=document.createElement('textarea'); d.innerHTML=s; return d.value; }

// ------------------ Save / load ------------------
function saveProject(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStatus("Saved"); }
function loadProject(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) Object.assign(state, JSON.parse(raw)); }catch{} }

// ------------------ Bookmarklet ------------------
function buildBookmarklet(){
  const code = `(function(){try{const img=document.querySelector('meta[property="og:image"]')?.content||document.querySelector('img,[data-testid*=image],.hero img')?.src||'';const title=document.querySelector('meta[property="og:title"]')?.content||document.querySelector('h1,h2,[data-testid*=title]')?.textContent||document.title;const d={title:title?.trim(),hero:img};navigator.clipboard.writeText(JSON.stringify(d)).then(()=>alert('Selfcast: meta copied to clipboard')).catch(()=>prompt('Copy meta:',JSON.stringify(d)));}catch(e){prompt('Copy meta:',JSON.stringify({title:document.title,hero:''}))}})();`;
  return "javascript:" + encodeURIComponent(code);
}

// ------------------ Builder UI ------------------
function bindInputs(){
  id('projectName').addEventListener('input',e=>{state.projectName=e.target.value; render();});
  id('brandLogo').addEventListener('input',e=>{state.brand.logoUrl=e.target.value; render();});
  id('brandWordmark').addEventListener('input',e=>{state.brand.wordmark=e.target.value; render();});
  id('brandSubtitle').addEventListener('input',e=>{state.brand.subtitle=e.target.value; render();});
  id('brandShow').addEventListener('change',e=>{state.brand.showWordmark=(e.target.value==="1"); render();});
  id('contactPerson').addEventListener('input',e=>{state.contact.person=e.target.value; render();});
  id('contactEmail').addEventListener('input',e=>{state.contact.email=e.target.value; render();});
  id('contactPhone').addEventListener('input',e=>{state.contact.phone=e.target.value; render();});

  id('btn-add-role').addEventListener('click',()=>{ state.roles.push({title:"New role",roleUrl:"",hero:""}); render(); });

  id('btn-save').addEventListener('click',saveProject);
  id('btn-clear').addEventListener('click',()=>{
    if(confirm("Clear all data? This cannot be undone.")){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
  id('btn-share').addEventListener('click', async ()=>{
    const url = makeShareUrl();
    try{ await navigator.clipboard.writeText(url); setStatus("Share link copied"); }
    catch{ prompt("Copy this link:", url); }
    id('btn-open-share').href = url;
  });
  id('btn-open-share').addEventListener('click',(e)=>{ e.currentTarget.href = makeShareUrl(); });
  id('btn-pdf').addEventListener('click',()=>{ window.open(makeShareUrl()+"&print=1","_blank"); });

  // Bookmarklet
  id('bm-link').href = buildBookmarklet();
}

function roleCard(role, i){
  const el=document.createElement('div');
  el.className='rolecard';
  el.innerHTML=`
    <div class="between">
      <strong>Role #${i+1}</strong>
      <div class="inline-btns">
        <button class="btn gray" data-a="paste">Paste meta</button>
        <button class="btn gray" data-a="auto">Auto-fill</button>
        <button class="btn outline" data-a="remove">Remove</button>
      </div>
    </div>
    <div class="row" style="margin-top:10px">
      <div><label>Role title</label><input data-k="title" value="${esc(role.title)}"/></div>
      <div><label>Role link (producer.selfcast.com/.../role/...)</label><input data-k="roleUrl" value="${esc(role.roleUrl||'')}"/></div>
    </div>
    <div class="row">
      <div><label>Hero image URL (optional)</label><input data-k="hero" value="${esc(role.hero||'')}"/></div>
      <div></div>
    </div>`;
  el.querySelectorAll('input[data-k]').forEach(inp=>{
    inp.addEventListener('input',()=>{ role[inp.dataset.k]=inp.value; render(); });
  });
  el.querySelector('[data-a="remove"]').addEventListener('click',()=>{ if(confirm('Remove this role?')){ state.roles.splice(i,1); render(); }});
  el.querySelector('[data-a="paste"]').addEventListener('click', async ()=>{
    try{ applyMeta(role, await navigator.clipboard.readText()); }catch{ const t=prompt('Paste meta JSON:'); if(t) applyMeta(role,t); }
  });
  el.querySelector('[data-a="auto"]').addEventListener('click', async ()=>{
    if(!role.roleUrl){ alert('Add a Role link first.'); return; }
    try{
      const html = await (await fetch(role.roleUrl,{mode:'cors'})).text();
      const title=((html.match(/<meta\\s+property=["']og:title["']\\s+content=["']([^"']+)/i)||[])[1])||((html.match(/<title>([^<]+)/i)||[])[1])||role.title;
      const img=((html.match(/<meta\\s+property=["']og:image["']\\s+content=["']([^"']+)/i)||[])[1])||role.hero;
      role.title = decodeHtml(title); role.hero = img; render(); setStatus("Auto-fill updated");
    }catch{ alert('Auto-fill could not read the page (maybe private). Use the bookmarklet and “Paste meta”.'); }
  });
  return el;
}

function renderBuilder(){
  const w=id('rolesWrap'); w.innerHTML=''; state.roles.forEach((r,i)=> w.appendChild(roleCard(r,i)));
}

function cover(){
  const b=state.brand,c=state.contact;
  const el=document.createElement('div'); el.className='sheet';
  el.innerHTML=`
    <div class="between" style="align-items:flex-start;">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="proj-title">${esc(state.projectName||'Untitled')}</div>
        ${b.logoUrl?`<img src="${esc(b.logoUrl)}" alt="Logo" style="height:34px;border-radius:8px;border:1px solid #eee">`:``}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        ${b.showWordmark?`<div style="text-align:right"><div class="wordmark">${esc(b.wordmark||'SELFCAST')}</div><div class="subtitle">${esc(b.subtitle||'CASTING MADE EASY')}</div></div>`:``}
      </div>
    </div>
    ${state.showHow?howItWorks():''}`;
  return el;
}
function howItWorks(){
  const c=state.contact;
  return `<div class="how" style="margin-top:18px">
    <h2>THIS IS HOW IT WORKS!</h2>
    <p><strong>Decline</strong><br>Click <em>Decline</em> to notify the Talent they’re not selected. They disappear from your list.</p>
    <p><strong><span class="green">Requested videos/photos</span></strong><br>See new videos or photos uploaded by the Talent for this job.</p>
    <p><strong>Talent picture</strong><br>Click a Talent’s picture to open their full profile.</p>
    <p><strong>Add to Shortlist</strong><br>Move Talents forward in the process, or book a Talent directly.</p>
    <div style="margin-top:10px;border-top:1px dashed #e51c23;padding-top:8px;color:#111">
      <div style="font-size:13px">If you need assistance:</div>
      <div style="color:#6b7280">${esc(c?.person||"Selfcast")}${c?.email?` · ${esc(c.email)}`:""}${c?.phone?` · ${esc(c.phone)}`:""}</div>
    </div>
  </div>`;
}
function rolesGrid(){
  const el=document.createElement('div'); el.className='sheet';
  el.innerHTML=`<div class="grid2" style="margin-top:6px">
    ${state.roles.map(r=>`
      <div class="rolecard">
        <div class="imgwrap">
          ${r.hero?`<img src="${esc(r.hero)}" alt="${esc(r.title)}">`:`<div style="height:240px;background:#1b1b1b"></div>`}
          ${r.roleUrl?`<a class="rolecta" href="${esc(r.roleUrl)}" target="_blank" rel="noreferrer">Open role</a>`:``}
        </div>
        <div class="cap"><div style="font-weight:800">${esc(r.title||'')}</div></div>
      </div>`).join('')}
  </div>`;
  return el;
}
function renderPreview(){ const p=id('preview'); p.innerHTML=''; p.appendChild(cover()); p.appendChild(rolesGrid()); }
function applyMeta(role, txt){ try{ const o=JSON.parse(txt); if(o.title) role.title=o.title; if(o.hero) role.hero=o.hero; render(); setStatus("Meta pasted"); }catch{ alert('Could not read meta JSON.'); }}

// Render all
function render(){ renderBuilder(); renderPreview(); }

// Boot
(function(){
  loadProject();
  id('projectName').value=state.projectName||"";
  id('brandLogo').value=state.brand.logoUrl||"";
  id('brandWordmark').value=state.brand.wordmark||"SELFCAST";
  id('brandSubtitle').value=state.brand.subtitle||"CASTING MADE EASY";
  id('brandShow').value=state.brand.showWordmark?"1":"0";
  id('contactPerson').value=state.contact.person||"";
  id('contactEmail').value=state.contact.email||"";
  id('contactPhone').value=state.contact.phone||"";
  bindInputs();
  render();
})();
