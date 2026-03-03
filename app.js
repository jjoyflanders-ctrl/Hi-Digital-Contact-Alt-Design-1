/* HI | Connect - Clean CSV + Share + QR + vCard */

const CONFIG = {
  csvUrl: "./employees.csv", // change to your Shopify asset URL if needed
  shopifyBaseUrl: "https://highlightindustries.net/pages/connect-v2"
};

const els = {
  // desktop
  employeeSearch: document.getElementById("employeeSearch"),
  openBtn: document.getElementById("openBtn"),
  deskPhoto: document.getElementById("deskPhoto"),
  deskPhotoFallback: document.getElementById("deskPhotoFallback"),
  empName: document.getElementById("empName"),
  empTitle: document.getElementById("empTitle"),
  empPhone: document.getElementById("empPhone"),
  empEmail: document.getElementById("empEmail"),
  empWeb: document.getElementById("empWeb"),
  empLocation: document.getElementById("empLocation"),
  saveBtn: document.getElementById("saveBtn"),
  shareBtn: document.getElementById("shareBtn"),

  // mobile
  mobQR: document.getElementById("mobQR"),
  mobPhotoFallback: document.getElementById("mobPhotoFallback"),
  mobCall: document.getElementById("mobCall"),
  mobMail: document.getElementById("mobMail"),
  mobSite: document.getElementById("mobSite"),
  mobEmpName: document.getElementById("mobEmpName"),
  mobEmpTitle: document.getElementById("mobEmpTitle"),
  mobEmpPhone: document.getElementById("mobEmpPhone"),
  mobEmpEmail: document.getElementById("mobEmpEmail"),
  mobEmpLocation: document.getElementById("mobEmpLocation"),
  shareBtnMobile: document.getElementById("shareBtnMobile"),
  findBtnMobile: document.getElementById("findBtnMobile"),
  findBtnMobileTop: document.getElementById("findBtnMobileTop"),

  // modal
  shareModal: document.getElementById("shareModal"),
  modalQR: document.getElementById("modalQR"),
  nativeShareBtn: document.getElementById("nativeShareBtn"),
  copyLinkBtn: document.getElementById("copyLinkBtn"),
  downloadVcardBtn: document.getElementById("downloadVcardBtn"),
  shopifyUrlLabel: document.getElementById("shopifyUrlLabel")
};

let EMPLOYEES = [];
let CURRENT = null;

/* ---------- CSV parsing ---------- */
function parseCSV(text) {
  // Simple CSV parser (handles quoted fields)
  const rows = [];
  let cur = "", inQuotes = false;
  const line = [];
  const pushCell = () => { line.push(cur); cur = ""; };
  const pushLine = () => { rows.push([...line]); line.length = 0; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }

    if (!inQuotes && ch === ",") { pushCell(); continue; }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      pushCell(); pushLine();
      continue;
    }
    cur += ch;
  }
  if (cur.length || line.length) { pushCell(); pushLine(); }

  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.some(v => (v || "").trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
      return obj;
    });
}

/* Expected CSV headers (you can add more):
   id, name, title, phone, email, website, location, photo
*/

/* ---------- Helpers ---------- */
function slugify(str="") {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildShopifyUrl(emp) {
  // You can change param naming here if you want
  const id = emp.id || slugify(emp.name || "");
  const url = new URL(CONFIG.shopifyBaseUrl);
  url.searchParams.set("e", id);
  return url.toString();
}

function cleanPhone(p="") {
  return p.replace(/[^\d+]/g, "");
}

function toast(msg) {
  // super-light toast
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position:"fixed", left:"50%", transform:"translateX(-50%)",
    bottom:"86px", background:"rgba(0,0,0,.75)", color:"#fff",
    padding:"10px 14px", borderRadius:"12px", zIndex:999,
    border:"1px solid rgba(255,255,255,.18)", fontWeight:"800"
  });
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 2200);
}

/* ---------- QR ---------- */
function renderQR(container, text) {
  container.innerHTML = "";
  // QRCode library writes an <img> or <canvas>
  new QRCode(container, {
    text,
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.M
  });
}

/* ---------- vCard ---------- */
function buildVCard(emp) {
  const name = emp.name || "";
  const title = emp.title || "";
  const phone = cleanPhone(emp.phone || "");
  const email = emp.email || "";
  const website = emp.website || "";
  const org = "Highlight Industries";
  const loc = emp.location || "";

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `ORG:${org}`,
    title ? `TITLE:${title}` : "",
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    email ? `EMAIL;TYPE=INTERNET:${email}` : "",
    website ? `URL:${website}` : "",
    loc ? `ADR;TYPE=WORK:;;${loc};;;;` : "",
    "END:VCARD"
  ].filter(Boolean).join("\n");
}

function setVCardDownload(emp) {
  const vcf = buildVCard(emp);
  const blob = new Blob([vcf], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  els.downloadVcardBtn.href = url;
  els.downloadVcardBtn.download = `${slugify(emp.name || "contact")}.vcf`;
}

/* ---------- Render employee ---------- */
function renderEmployee(emp) {
  CURRENT = emp;

  // Desktop texts
  els.empName.textContent = emp.name || "—";
  els.empTitle.textContent = emp.title || "";

  els.empPhone.textContent = emp.phone || "";
  els.empPhone.href = emp.phone ? `tel:${cleanPhone(emp.phone)}` : "#";

  els.empEmail.textContent = emp.email || "";
  els.empEmail.href = emp.email ? `mailto:${emp.email}` : "#";

  const web = emp.website || "https://www.highlightindustries.com";
  els.empWeb.textContent = web.replace(/^https?:\/\//, "");
  els.empWeb.href = web;

  els.empLocation.textContent = emp.location || "";

  // Photo
  const photo = emp.photo || "";
  if (photo) {
    els.deskPhoto.src = photo;
    els.deskPhoto.style.display = "block";
    els.deskPhotoFallback.style.display = "none";
  } else {
    els.deskPhoto.removeAttribute("src");
    els.deskPhoto.style.display = "none";
    els.deskPhotoFallback.style.display = "flex";
  }

  // Mobile
  els.mobEmpName.textContent = emp.name || "—";
  els.mobEmpTitle.textContent = emp.title || "";
  els.mobEmpPhone.textContent = emp.phone || "";
  els.mobEmpPhone.href = emp.phone ? `tel:${cleanPhone(emp.phone)}` : "#";
  els.mobEmpEmail.textContent = emp.email || "";
  els.mobEmpEmail.href = emp.email ? `mailto:${emp.email}` : "#";
  els.mobEmpLocation.textContent = emp.location || "";

  els.mobCall.href = emp.phone ? `tel:${cleanPhone(emp.phone)}` : "#";
  els.mobMail.href = emp.email ? `mailto:${emp.email}` : "#";

  // QR url
  const shopifyUrl = buildShopifyUrl(emp);
  els.shopifyUrlLabel.textContent = shopifyUrl;

  // Mobile QR in circle
  renderQR(els.mobQR, shopifyUrl);
  els.mobPhotoFallback.style.display = "none";

  // Prep modal share pieces
  renderQR(els.modalQR, shopifyUrl);
  setVCardDownload(emp);
}

/* ---------- Find / Search ---------- */
function findEmployeeByNameOrId(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return null;

  return EMPLOYEES.find(e => {
    const id = (e.id || "").toLowerCase();
    const nm = (e.name || "").toLowerCase();
    return id === q || nm.includes(q);
  }) || null;
}

function openFindPrompt() {
  const q = prompt("Type an employee name or id:");
  if (!q) return;
  const hit = findEmployeeByNameOrId(q);
  if (hit) renderEmployee(hit);
  else toast("No match found.");
}

/* ---------- Modal ---------- */
function openShareModal() {
  els.shareModal.classList.add("show");
  els.shareModal.setAttribute("aria-hidden", "false");
}

function closeShareModal() {
  els.shareModal.classList.remove("show");
  els.shareModal.setAttribute("aria-hidden", "true");
}

function wireModalClose() {
  els.shareModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeShareModal();
  });
}

/* ---------- Share actions ---------- */
async function doNativeShare() {
  if (!CURRENT) return;
  const url = buildShopifyUrl(CURRENT);

  // iOS/Android modern browsers
  if (navigator.share) {
    try {
      await navigator.share({
        title: CURRENT.name || "Contact",
        text: "Highlight Industries contact",
        url
      });
      return;
    } catch (err) {
      // user cancelled or blocked — no big deal
      return;
    }
  }

  // Fallback
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied (share not supported on this browser).");
  } catch {
    toast("Share not supported here.");
  }
}

async function copyLink() {
  if (!CURRENT) return;
  const url = buildShopifyUrl(CURRENT);
  try {
    await navigator.clipboard.writeText(url);
    toast("Shopify link copied!");
  } catch {
    toast("Couldn’t copy. (Browser blocked clipboard)");
  }
}

/* ---------- Init ---------- */
async function loadEmployees() {
  const res = await fetch(CONFIG.csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load employees.csv");
  const text = await res.text();
  EMPLOYEES = parseCSV(text);

  if (!EMPLOYEES.length) throw new Error("employees.csv is empty.");

  // Pick first as default
  renderEmployee(EMPLOYEES[0]);
}

function wireControls() {
  // Desktop open
  els.openBtn.addEventListener("click", () => {
    const hit = findEmployeeByNameOrId(els.employeeSearch.value);
    if (hit) renderEmployee(hit);
    else toast("No match found.");
  });

  els.employeeSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      els.openBtn.click();
    }
  });

  // Desktop buttons
  els.saveBtn.addEventListener("click", () => {
    if (!CURRENT) return;
    // triggers download link
    els.downloadVcardBtn.click();
  });

  els.shareBtn.addEventListener("click", openShareModal);

  // Mobile buttons
  els.shareBtnMobile.addEventListener("click", openShareModal);
  els.findBtnMobile.addEventListener("click", openFindPrompt);
  els.findBtnMobileTop.addEventListener("click", openFindPrompt);

  // Modal actions
  els.nativeShareBtn.addEventListener("click", doNativeShare);
  els.copyLinkBtn.addEventListener("click", copyLink);

  wireModalClose();

  // ESC closes modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeShareModal();
  });
}

(async function init() {
  try {
    wireControls();
    await loadEmployees();
  } catch (err) {
    console.error(err);
    toast(err.message || "Error loading app.");
    els.empName.textContent = "Couldn’t load employees.csv";
    els.mobEmpName.textContent = "Couldn’t load employees.csv";
  }
})();
