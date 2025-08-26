// ---- Share link helpers (URL-packed snapshot) ----
function pack(obj){
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json))); // UTF-8 safe base64
}
function unpack(s){
  const json = decodeURIComponent(escape(atob(s)));
  return JSON.parse(json);
}
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

// Buttons
document.getElementById('btn-share').addEventListener('click', async ()=>{
  const url = makeShareUrl();
  try { await navigator.clipboard.writeText(url); setStatus("Share link copied"); }
  catch { prompt("Copy this link:", url); }
});
document.getElementById('btn-open-share').addEventListener('click', ()=>{
  const url = makeShareUrl();
  document.getElementById('btn-open-share').href = url;
});

// (optional) expose unpack on window for debug:
// window._unpack = unpack;
