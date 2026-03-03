// HI | Connect (Clean Start) - uses mockup SVG templates + employees.csv
const SHOPIFY_BASE_URL = "https://highlightindustries.net/pages/connect-v2";
const DEFAULT_BUILDING = "assets/building.jpg";

const els = {
  // desktop
  deskPhoto: document.getElementById("deskPhoto"),
  deskName: document.getElementById("deskName"),
  deskTitle: document.getElementById("deskTitle"),
  deskPhone: document.getElementById("deskPhone"),
  deskEmail: document.getElementById("deskEmail"),
  deskWeb: document.getElementById("deskWeb"),
  deskSearchBtn: document.getElementById("deskSearchBtn"),
  deskVcardBtn: document.getElementById("deskVcardBtn"),
  deskShareBtn: document.getElementById("deskShareBtn"),

  // mobile
  mobiQR: document.getElementById("mobiQR"),
  mobiName: document.getElementById("mobiName"),
  mobiTitle: document.getElementById("mobiTitle"),
  mobiCall: document.getElementById("mobiCall"),
  mobiEmail: document.getElementById("mobiEmail"),
  mobiWeb: document.getElementById("mobiWeb"),
  mobiShareBtn: document.getElementById("mobiShareBtn"),
  mobiSearchBtn: document.getElementById("mobiSearchBtn"),
  mobiVcardBtn: document.getElementById("mobiVcardBtn"),

  // modals
  backdrop: document.getElementById("modalBackdrop"),
  searchModal: document.getElementById("searchModal"),
  closeSearch: document.getElementById("closeSearch"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),

  qrModal: document.getElementById("qrModal"),
  closeQR: document.getElementById("closeQR"),
  deskQR: document.getElementById("deskQR"),
  shareUrlText: document.getElementById("shareUrlText"),
  copyLinkBtn: document.getElementById("copyLinkBtn"),
  nativeShareBtn: document.getElementById("nativeShareBtn"),

  toast: document.getElementById("toast"),
};

let EMPLOYEES = [];
let current = null;

function toast(msg){
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>els.toast.classList.remove("show"), 1600);
}

// GitHub Pages project-site safe base path:
// /REPO_NAME/whatever -> /REPO_NAME/
function basePath(){
  const p = window.location.pathname;
  return p.endsWith("/") ? p : p.replace(/\/[^\/]*$/, "/");
}

function getSlugFromUrl(){
  const u = new URL(window.location.href);
  return (u.searchParams.get("u") || "").trim();
}
function setSlugInUrl(slug){
  const u = new URL(window.location.href);
  u.searchParams.set("u", slug);
  window.history.replaceState({}, "", u.toString());
}

function shareUrlFor(slug){
  // QR + shares ALWAYS use Shopify URL so clients never see GitHub
  return `${SHOPIFY_BASE_URL}?u=${encodeURIComponent(slug)}`;
}
function qrSrcFor(url, size=320){
  const t = encodeURIComponent(url);
  return `https://quickchart.io/qr?text=${t}&size=${size}&margin=1`;
}

function telHref(phone){
  const digits = (phone || "").replace(/[^\d+]/g,"");
  return digits ? `tel:${digits}` : "#";
}
function ensureImg(imgEl, src, fallback){
  if (!imgEl) return;
  imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = fallback; };
  imgEl.src = src || fallback;
}

// vCard helpers
function escapeV(s){
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function buildVCard(emp){
  const fn = `${emp.first_name} ${emp.last_name}`.trim();
  const org = "Highlight Industries";
  const title = emp.title || "";
  const phone = (emp.phone || "").replace(/[^\d+]/g,"");
  const ext = (emp.ext || "").trim();
  const email = emp.email || "";
  const url = emp.website || "https://www.highlightindustries.com";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeV(fn)}`,
    `N:${escapeV(emp.last_name||"")};${escapeV(emp.first_name||"")};;;`,
    `ORG:${escapeV(org)}`,
    title ? `TITLE:${escapeV(title)}` : null,
    phone ? `TEL;TYPE=WORK,VOICE:${phone}${ext ? "x"+ext : ""}` : null,
    email ? `EMAIL;TYPE=INTERNET,WORK:${escapeV(email)}` : null,
    url ? `URL:${escapeV(url)}` : null,
    "END:VCARD"
  ].filter(Boolean);

  return lines.join("\r\n");
}
function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type: mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
}

// modal helpers
function openModal(dlg){
  if (!dlg) return;
  if (els.backdrop) els.backdrop.hidden = false;
  dlg.showModal();
}
function closeModal(dlg){
  if (!dlg) return;
  dlg.close();
  if (els.backdrop) els.backdrop.hidden = true;
}

async function loadEmployees(){
  const url = basePath() + "employees.csv";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load employees.csv");
  const text = await res.text();
  return parseCSV(text);
}

// small CSV parser that handles quoted fields
function parseCSV(text){
  const rows = [];
  let i=0, field="", row=[], inQ=false;
  const pushField = () => { row.push(field); field=""; };
  const pushRow = () => { if(!(row.length===1 && row[0].trim()==="")) rows.push(row); row=[]; };

  while (i < text.length){
    const c = text[i];
    if (inQ){
      if (c === '"'){
        if (text[i+1] === '"'){ field += '"'; i+=2; continue; }
        inQ=false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"'){ inQ=true; i++; continue; }
      if (c === ','){ pushField(); i++; continue; }
      if (c === '\r'){ if (text[i+1] === '\n'){ pushField(); pushRow(); i+=2; continue; } pushField(); pushRow(); i++; continue; }
      if (c === '\n'){ pushField(); pushRow(); i++; continue; }
      field += c; i++; continue;
    }
  }
  pushField(); pushRow();

  if (!rows.length) return [];
  const header = rows.shift().map(h=>h.trim());
  return rows.map(r=>{
    const obj = {};
    header.forEach((h, idx)=> obj[h] = (r[idx] ?? "").trim());
    return obj;
  }).filter(e => e.slug);
}

function render(emp){
  current = emp;

  const fullName = `${emp.first_name} ${emp.last_name}`.trim();
  const title = emp.title || "";
  const phoneDisplay = emp.phone ? `${emp.phone}${emp.ext ? " x " + emp.ext : ""}` : "—";
  const email = emp.email || "—";
  const website = emp.website || "https://www.highlightindustries.com";
  const photo = emp.photo || DEFAULT_BUILDING;

  // Desktop
  ensureImg(els.deskPhoto, photo, DEFAULT_BUILDING);
  if (els.deskName) els.deskName.textContent = fullName || "—";
  if (els.deskTitle) els.deskTitle.textContent = title;

  if (els.deskPhone){
    els.deskPhone.textContent = phoneDisplay;
    els.deskPhone.href = telHref(emp.phone);
  }
  if (els.deskEmail){
    els.deskEmail.textContent = email;
    els.deskEmail.href = emp.email ? `mailto:${emp.email}` : "#";
  }
  if (els.deskWeb){
    els.deskWeb.textContent = website.replace(/^https?:\/\//,"");
    els.deskWeb.href = website;
  }

  // Mobile QR + text
  const sUrl = shareUrlFor(emp.slug);
  if (els.mobiQR) els.mobiQR.src = qrSrcFor(sUrl, 260);
  if (els.mobiName) els.mobiName.textContent = fullName || "—";
  if (els.mobiTitle) els.mobiTitle.textContent = title;

  // Mobile icon links
  if (els.mobiCall) els.mobiCall.href = telHref(emp.phone);
  if (els.mobiEmail) els.mobiEmail.href = emp.email ? `mailto:${emp.email}` : "#";
  if (els.mobiWeb) els.mobiWeb.href = website;

  // Desktop QR modal content
  if (els.deskQR) els.deskQR.src = qrSrcFor(sUrl, 360);
  if (els.shareUrlText) els.shareUrlText.textContent = sUrl;

  setSlugInUrl(emp.slug);
}

// Search rendering
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function updateResults(q){
  const query = (q || "").toLowerCase().trim();
  const hits = !query ? EMPLOYEES : EMPLOYEES.filter(e=>{
    const s = `${e.first_name} ${e.last_name} ${e.slug} ${e.title}`.toLowerCase();
    return s.includes(query);
  });

  if (!els.searchResults) return;
  els.searchResults.innerHTML = "";
  hits.slice(0, 50).forEach(e=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "resultBtn";
    btn.innerHTML = `
      <div class="resultName">${escapeHTML(`${e.first_name} ${e.last_name}`.trim())}</div>
      <div class="resultTitle">${escapeHTML(e.title || "")}</div>
    `;
    btn.addEventListener("click", ()=>{
      render(e);
      closeModal(els.searchModal);
      toast("Loaded employee");
    });
    els.searchResults.appendChild(btn);
  });

  if (!hits.length){
    const div = document.createElement("div");
    div.style.opacity = ".7";
    div.textContent = "No matches.";
    els.searchResults.appendChild(div);
  }
}

function openSearch(){
  if (!els.searchInput) return;
  els.searchInput.value = "";
  updateResults("");
  openModal(els.searchModal);
  setTimeout(()=>els.searchInput.focus(), 50);
}

// Native share helper
async function nativeShare(emp){
  const url = shareUrlFor(emp.slug);
  const fullName = `${emp.first_name} ${emp.last_name}`.trim();
  if (navigator.share){
    try{
      await navigator.share({ title:`HI | Connect - ${fullName}`, text:`Contact: ${fullName}`, url });
      return true;
    }catch(_e){ return false; }
  }
  return false;
}

function wire(){
  // Search buttons
  els.deskSearchBtn?.addEventListener("click", openSearch);
  els.mobiSearchBtn?.addEventListener("click", openSearch);

  // Close modals
  els.closeSearch?.addEventListener("click", ()=>closeModal(els.searchModal));
  els.closeQR?.addEventListener("click", ()=>closeModal(els.qrModal));
  els.backdrop?.addEventListener("click", ()=>{
    closeModal(els.searchModal);
    closeModal(els.qrModal);
  });
  els.searchInput?.addEventListener("input", (e)=>updateResults(e.target.value));

  // Save to Contacts (desktop + mobile)
  const vcardHandler = ()=>{
    if (!current) return;
    const vcf = buildVCard(current);
    const fn = `${current.first_name||"contact"}-${current.last_name||""}`.toLowerCase().replace(/\s+/g,"-");
    downloadText(`${fn}.vcf`, vcf, "text/vcard");
    toast("vCard downloaded");
  };
  els.deskVcardBtn?.addEventListener("click", vcardHandler);
  els.mobiVcardBtn?.addEventListener("click", vcardHandler);

  // Desktop: Send to Phone opens QR modal
  els.deskShareBtn?.addEventListener("click", ()=>{
    if (!current) return;
    openModal(els.qrModal);
  });

  // Mobile: Share opens share sheet (no QR generation)
  els.mobiShareBtn?.addEventListener("click", async ()=>{
    if (!current) return;
    const ok = await nativeShare(current);
    if (!ok){
      // fallback: copy link
      try{
        await navigator.clipboard.writeText(shareUrlFor(current.slug));
        toast("Link copied");
      }catch(_e){
        toast("Copy failed");
      }
    }
  });

  // QR modal buttons
  els.copyLinkBtn?.addEventListener("click", async ()=>{
    if (!current) return;
    try{
      await navigator.clipboard.writeText(shareUrlFor(current.slug));
      toast("Copied!");
    }catch(_e){ toast("Copy failed"); }
  });
  els.nativeShareBtn?.addEventListener("click", async ()=>{
    if (!current) return;
    const ok = await nativeShare(current);
    if (!ok) toast("Sharing not supported here");
  });

  // keep backdrop sane if user presses ESC
  [els.searchModal, els.qrModal].forEach(dlg=>{
    dlg?.addEventListener("close", ()=>{ if (els.backdrop) els.backdrop.hidden = true; });
  });
}

(async function init(){
  wire();
  try{
    EMPLOYEES = await loadEmployees();
    if (!EMPLOYEES.length) throw new Error("No employees in CSV");

    const slug = getSlugFromUrl();
    const hit = slug ? EMPLOYEES.find(e=>e.slug===slug) : null;
    render(hit || EMPLOYEES[0]);

  }catch(e){
    console.error(e);
    toast("Couldn’t load employees.csv");
  }
})();
