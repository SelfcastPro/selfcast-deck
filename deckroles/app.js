// ---- State ----
let state = {
  projectName: "",
  brand: { logoUrl:"", wordmark:"SELFCAST", subtitle:"CASTING MADE EASY", showWordmark:true },
  contact: { person:"", email:"", phone:"" },
  roles: [],
  showHow: true
};

// ---- Load from localStorage ----
const saved = localStorage.getItem("sc_deckroles_project_v1");
if (saved) {
  try { state = JSON.parse(saved); } catch(e){}
}

// ---- Utils ----
function esc(s){return (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));}

// ---- Save ----
function save(){
  localStorage.setItem("sc_deckroles_project_v1", JSON.stringify(state));
  alert("Project saved!");
}
document.getElementById("btn-save").addEventListener("click", save);

// ---- Project name ----
const pn = document.getElementById("projectName");
pn.value = state.projectName || "";
pn.addEventListener("input", e=>{
  state.projectName = e.target.value;
});

// ---- Print ----
document.getElementById("btn-print").addEventListener("click", ()=> window.print());

// ---- Share link helpers ----
function pack(obj){ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function unpack(s){ return JSON.parse(decodeURIComponent(escape(atob(s)))); }
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
document.getElementById('btn-share').addEventListener('click', async ()=>{
  const url = makeShareUrl();
  try { await navigator.clipboard.writeText(url); alert("Share link copied"); }
  catch { prompt("Copy this link:", url); }
});
document.getElementById('btn-open-share').addEventListener('click', ()=>{
  document.getElementById('btn-open-share').href = makeShareUrl();
});

// ---- Render (simplified demo) ----
function render(){
  // here you render roles + preview (your existing grid logic)
}
render();
