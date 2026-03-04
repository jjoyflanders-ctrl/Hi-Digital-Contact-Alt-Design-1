/* HI | Connect (CSV-driven) — Desktop + Mobile + Shopify share QR
   - employees.csv in the same folder as index.html
   - QR points to: https://highlightindustries.net/pages/connect-v2
   - vCard download for the currently selected employee
*/

const SHOPIFY_URL = "https://highlightindustries.net/pages/connect-v2";
const DEFAULT_PHOTO = "./assets/building.png"; // fallback if employee photo missing
const CSV_URL = "./employees.csv";

// ---- tiny helpers ----
const $ = (sel) => document.querySelector(sel);

function toast(msg){
  // super-light toast (non-blocking)
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "22px";
  t.style.transform = "translateX(-50%)";
  t.style.background = "rgba(0,0,0,.78)";
  t.style.border = "1px solid rgba(255,255,255,.16)";
  t.style.color = "#fff";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "14px";
  t.style.zIndex = "9999";
  t.style.fontWeight = "700";
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity = "0"; t.style.transition = "opacity .25s"; }, 1400);
  setTimeout(()=>t.remove(), 1750);
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function normalize(s){
  return String(s ?? "").trim().toLowerCase();
}

function buildPhoneDisplay(phone, ext){
  if (!phone) return "";
  const clean = phone.replace(/\s+/g," ").trim();
  return ext ? `${clean} ext ${ext}` : clean;
}

function buildTelHref(phone, ext){
  if (!phone) return "#";
  // keep digits and +
  const digits = phone.replace(/[^0-9+]/g,"");
  // NOTE: extensions in tel: aren't universally supported; keep it simple
  return `tel:${digits}`;
}

function buildMailHref(email){
  if (!email) return "#";
  return `mailto:${email}`;
}

function qrImgUrl(text){
  // QuickChart QR: simple and reliable
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=220`;
}

// ---- CSV parsing (handles quotes) ----
function parseCsv(text){
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i=0; i<text.length; i++){
    const ch = text[i];
    const next = text[i+1];

    if (ch === '"' ){
      if (inQuotes && next === '"'){ // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ","){
      row.push(cur);
      cur = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")){
      if (ch === "\r" && next === "\n"){ i++; }
      row.push(cur);
      cur = "";
      if (row.some(cell => cell.length > 0)){
        rows.push(row);
      }
      row = [];
      continue;
    }

    cur += ch;
  }

  // last cell
  row.push(cur);
  if (row.some(cell => cell.length > 0)) rows.push(row);

  if (!rows.length) return [];
  const header = rows[0].map(h => normalize(h));
  return rows.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx)=> obj[h] = (cols[idx] ?? "").trim());
    return obj;
  }).filter(r => Object.values(r).some(v => String(v).trim().length));
}

// ---- App state ----
let EMPLOYEES = [];
let current = null;

// ---- UI elements ----
const els = {
  // desktop
  employeeSearch: $("#employeeSearch"),
  deskSaveHit: $("#deskSaveHit"),
  deskShareHit: $("#deskShareHit"),
  openBtn: $("#openBtn"),
  clearBtn: $("#clearBtn"),
  downloadBtn: $("#downloadBtn"),
  shareBtn: $("#shareBtn"),

  deskPhoto: $("#deskPhoto"),
  deskName: $("#deskName"),
  deskTitle: $("#deskTitle"),
  deskPhone: $("#deskPhone"),
  deskEmail: $("#deskEmail"),

  // mobile
  mobQr: $("#mobQr"),
  mobPhoto: $("#mobPhoto"),
  mobName: $("#mobName"),
  mobTitle: $("#mobTitle"),
  mobCall: $("#mobCall"),
  mobEmail: $("#mobEmail"),
  mobWeb: $("#mobWeb"),
  mobPhone: $("#mobPhone"),
  mobEmail2: $("#mobEmail2"),
  mobShareBtn: $("#mobShareBtn"),
  mobDirectoryBtn: $("#mobDirectoryBtn"),
  mobAddBtn: $("#mobAddBtn"),

  // modal
  modal: $("#modal"),
  modalBody: $("#modalBody"),
  modalTitle: $("#modalTitle"),
};

function findEmployee(query){
  const q = normalize(query);
  if (!q) return null;
  return EMPLOYEES.find(e =>
    normalize(e.id) === q ||
    normalize(e.first) === q ||
    normalize(e.last) === q ||
    normalize(`${e.first} ${e.last}`) === q ||
    normalize(`${e.last}, ${e.first}`) === q
  ) || EMPLOYEES.find(e => normalize(`${e.first} ${e.last}`).includes(q));
}

function photoSrc(emp){
  const p = (emp.photo || "").trim();
  if (!p) return DEFAULT_PHOTO;
  // allow either full URL or relative asset path
  if (/^https?:\/\//i.test(p)) return p;
  return `./assets/${encodeURIComponent(p)}`;
}

function renderEmployee(emp){
  current = emp;

  const full = `${emp.first || ""} ${emp.last || ""}`.trim() || "Employee";
  const title = emp.title || "";
  const phoneDisp = buildPhoneDisplay(emp.phone, emp.phone_ext);
  const telHref = buildTelHref(emp.phone, emp.phone_ext);
  const email = emp.email || "";
   // --- Mobile mockup icon click targets (green-bar icons) ---
const mobCallHit = document.getElementById("mobCallHit");
const mobEmailHit = document.getElementById("mobEmailHit");
const mobWebHit = document.getElementById("mobWebHit");

// phone
if (mobCallHit && emp.phone) {
  const digits = String(emp.phone).replace(/[^\d+]/g, "");
  mobCallHit.href = `tel:${digits}`;
}

// email
if (mobEmailHit && emp.email) {
  mobEmailHit.href = `mailto:${emp.email}`;
}

// website
if (mobWebHit) {
  const url = (emp.website && emp.website.trim())
    ? emp.website.trim()
    : "https://www.highlightindustries.com";
  mobWebHit.href = url.startsWith("http") ? url : `https://${url}`;
}

  // desktop
  if (els.deskPhoto){
    els.deskPhoto.src = photoSrc(emp);
    els.deskPhoto.onerror = () => { els.deskPhoto.src = DEFAULT_PHOTO; };
  }
  if (els.deskName) els.deskName.textContent = full;
  if (els.deskTitle) els.deskTitle.textContent = title;

  if (els.deskPhone){
    els.deskPhone.textContent = phoneDisp || "—";
    els.deskPhone.href = telHref;
  }
  if (els.deskEmail){
    els.deskEmail.textContent = email || "—";
    els.deskEmail.href = buildMailHref(email);
  }

  // mobile
  if (els.mobPhoto){
    els.mobPhoto.src = photoSrc(emp);
    els.mobPhoto.onerror = () => { els.mobPhoto.src = DEFAULT_PHOTO; };
  }
  if (els.mobName) els.mobName.textContent = full;
  if (els.mobTitle) els.mobTitle.textContent = title;

  const qr = qrImgUrl(SHOPIFY_URL);
  if (els.mobQr) els.mobQr.src = qr;

  if (els.mobCall) els.mobCall.href = telHref;
  if (els.mobEmail) els.mobEmail.href = buildMailHref(email);
  if (els.mobWeb) els.mobWeb.href = emp.website ? String(emp.website).trim() : "https://www.highlightindustries.com";
   // wire mockup icon hit areas (if present)
const mobCallHit  = document.getElementById("mobCallHit");
const mobEmailHit = document.getElementById("mobEmailHit");
const mobWebHit   = document.getElementById("mobWebHit");

if (mobCallHit)  mobCallHit.href  = telHref;
if (mobEmailHit) mobEmailHit.href = buildMailHref(email);
if (mobWebHit)   mobWebHit.href   = emp.website ? String(emp.website).trim() : "https://www.highlightindustries.com";
  if (els.mobPhone){
    els.mobPhone.textContent = phoneDisp || "—";
    els.mobPhone.href = telHref;
  }
  if (els.mobEmail2){
    els.mobEmail2.textContent = email || "—";
    els.mobEmail2.href = buildMailHref(email);
  }
}

function makeVCard(emp){
  const full = `${emp.first || ""} ${emp.last || ""}`.trim();
  const n = `${emp.last || ""};${emp.first || ""};;;`;
  const phone = (emp.phone || "").trim();
  const ext = (emp.phone_ext || "").trim();
  const tel = phone ? phone.replace(/[^0-9+]/g,"") : "";
  const email = (emp.email || "").trim();
  const title = (emp.title || "").trim();

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${n}`,
    `FN:${full || "Highlight Industries"}`,
    title ? `TITLE:${title}` : null,
    "ORG:Highlight Industries",
    tel ? `TEL;TYPE=CELL:${tel}` : null,
    ext ? `NOTE:Ext ${ext}` : null,
    email ? `EMAIL;TYPE=INTERNET:${email}` : null,
    "URL:https://www.highlightindustries.com",
    "END:VCARD"
  ].filter(Boolean);

  return lines.join("\r\n");
}

function downloadVCard(emp){
  const vcf = makeVCard(emp);
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = `${(emp.first||"").trim()}_${(emp.last||"").trim()}`.replace(/\s+/g,"_") || "contact";
  a.href = url;
  a.download = `${safeName}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1200);
}

async function nativeShare(emp){
  const full = `${emp.first||""} ${emp.last||""}`.trim() || "Highlight Industries";
  const phoneDisp = buildPhoneDisplay(emp.phone, emp.phone_ext);
  const text = [
    full,
    emp.title || "",
    phoneDisp ? `Phone: ${phoneDisp}` : "",
    emp.email ? `Email: ${emp.email}` : "",
    `Connect: ${SHOPIFY_URL}`
  ].filter(Boolean).join("\n");

  if (navigator.share){
    try{
      await navigator.share({
        title: `HI | Connect — ${full}`,
        text,
        url: SHOPIFY_URL
      });
      return true;
    }catch(err){
      return false;
    }
  }
  return false;
}

function openModal(title, innerHtml){
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = innerHtml;
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
}

function openShareModal(emp){
  const full = `${emp.first||""} ${emp.last||""}`.trim() || "Highlight Industries";

  const html = `
    <div class="card">
      <div class="share-grid">
        <div class="qrbox">
          <img alt="QR code to HI Connect" src="${qrImgUrl(SHOPIFY_URL)}">
        </div>
        <div class="share-actions">
          <div style="font-weight:900; font-size:18px;">${escapeHtml(full)}</div>
          
          <div class="list">
            <button class="btn btn--solid" type="button" data-action="nativeShare">Share (AirDrop / Text / Email)</button>
            <button class="btn" type="button" data-action="copyLink">Copy Link</button>
            <button class="btn" type="button" data-action="downloadVcard">Download Contact (.vcf)</button>
          </div>

          <div class="small">If Share isn't available, Copy Link works everywhere.</div>
        </div>
      </div>
    </div>
  `;

  openModal("Share", html);

  els.modalBody.querySelector('[data-action="nativeShare"]')?.addEventListener("click", async ()=>{
    const ok = await nativeShare(emp);
    if (ok) closeModal();
    else toast("Share not available here — try Copy Link.");
  });
  els.modalBody.querySelector('[data-action="copyLink"]')?.addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(SHOPIFY_URL);
      toast("Copied!");
    }catch{
      // fallback
      const inp = document.createElement("input");
      inp.value = SHOPIFY_URL;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand("copy");
      inp.remove();
      toast("Copied!");
    }
  });
  els.modalBody.querySelector('[data-action="downloadVcard"]')?.addEventListener("click", ()=>{
    downloadVCard(emp);
  });
}

function openDirectoryModal(){
  const items = EMPLOYEES.map(e => {
    const full = `${e.first||""} ${e.last||""}`.trim();
    const sub = e.title || "";
    return `
      <div class="emp-item" data-emp="${escapeHtml(e.id)}">
        <div style="font-weight:900; font-size:16px;">${escapeHtml(full)}</div>
        <div class="emp-sub">${escapeHtml(sub)}</div>
      </div>
    `;
  }).join("");

  const html = `
    <div class="card">
      <div style="display:flex; gap:10px; align-items:center;">
        <input id="dirSearch" type="search" placeholder="Search…" style="
          flex:1; padding:10px 12px; border-radius:14px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.08); color:#fff; outline:0;
        ">
        <button class="btn btn--solid" type="button" id="dirGo">Go</button>
      </div>
      <div style="height:10px"></div>
      <div id="dirList" style="display:grid; gap:10px; max-height: 46vh; overflow:auto;">
        ${items}
      </div>
    </div>
  `;
  openModal("Employees", html);

  const dirSearch = $("#dirSearch");
  const dirGo = $("#dirGo");
  const dirList = $("#dirList");

  function filter(){
    const q = normalize(dirSearch.value);
    const children = Array.from(dirList.children);
    children.forEach(el=>{
      const id = el.getAttribute("data-emp") || "";
      const emp = EMPLOYEES.find(e => normalize(e.id) === normalize(id));
      const full = normalize(`${emp?.first||""} ${emp?.last||""}`);
      const title = normalize(emp?.title || "");
      const show = !q || full.includes(q) || title.includes(q) || normalize(id).includes(q);
      el.style.display = show ? "" : "none";
    });
  }

  dirSearch.addEventListener("input", filter);
  dirGo.addEventListener("click", ()=>{
    const hit = findEmployee(dirSearch.value);
    if (hit){ renderEmployee(hit); closeModal(); }
    else toast("No match found.");
  });
  dirSearch.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){ e.preventDefault(); dirGo.click(); }
  });

  dirList.querySelectorAll(".emp-item").forEach(el=>{
    el.addEventListener("click", ()=>{
      const id = el.getAttribute("data-emp");
      const hit = EMPLOYEES.find(e => normalize(e.id) === normalize(id));
      if (hit){ renderEmployee(hit); closeModal(); }
    });
  });
}

// ---- Wire up buttons ----
function wireUI(){
  // Desktop mockup bottom buttons
  els.deskSaveHit?.addEventListener("click", ()=>{
    if (!current) return;
    downloadVCard(current);
  });

  els.deskShareHit?.addEventListener("click", async ()=>{
    if (!current) return;
    // Always open the QR modal first (so you don't have to tap twice)
    openShareModal(current);
  });

  // Desktop open
  els.openBtn?.addEventListener("click", ()=>{
    const hit = findEmployee(els.employeeSearch?.value);
    if (hit) renderEmployee(hit);
    else toast("No match found.");
  });

  els.employeeSearch?.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){ e.preventDefault(); els.openBtn?.click(); }
  });

  els.clearBtn?.addEventListener("click", ()=>{
    if (els.employeeSearch) els.employeeSearch.value = "";
    toast("Cleared.");
  });

  els.downloadBtn?.addEventListener("click", ()=>{
    if (!current) return;
    downloadVCard(current);
  });

  els.shareBtn?.addEventListener("click", async ()=>{
    if (!current) return;
    openShareModal(current);
  });

  // Mobile bottom bar
  els.mobShareBtn?.addEventListener("click", async ()=>{
    if (!current) return;
    // Show QR immediately; share options live inside the modal
    openShareModal(current);
  });

  els.mobDirectoryBtn?.addEventListener("click", ()=>{
    openDirectoryModal();
  });

  els.mobAddBtn?.addEventListener("click", ()=>{
    if (!current) return;
    downloadVCard(current);
  });

  // Modal close
  document.addEventListener("click", (e)=>{
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.close === "1") closeModal();
  });

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") closeModal();
  });
}

// ---- Load CSV and start ----
async function init(){
  try{
    // cache-bust so Shopify/GitHub doesn't hang on old CSV
    const res = await fetch(`${CSV_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV load failed: ${res.status}`);
    const txt = await res.text();
    EMPLOYEES = parseCsv(txt);

    if (!EMPLOYEES.length) throw new Error("No employees found in CSV.");

    wireUI();

    // default to first employee (Jessica) if present
    const preferred = EMPLOYEES.find(e => normalize(e.id) === "jessica") || EMPLOYEES[0];
    renderEmployee(preferred);
  }catch(err){
    console.error(err);
    toast("Couldn't load employees.csv");
    if (els.deskName) els.deskName.textContent = "Error loading employees.csv";
    if (els.mobName) els.mobName.textContent = "Error loading employees.csv";
  }
}

init();
