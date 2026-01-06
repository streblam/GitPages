
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

export function toast(title, message, type="info", timeoutMs=4500){
  const host = ensureToastHost();
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="tRow">
      <div>
        <div class="tTitle">${escapeHtml(title)}</div>
        <div class="tMsg">${escapeHtml(message)}</div>
      </div>
      <button aria-label="Aizvērt">✕</button>
    </div>
  `;
  $("button", el).addEventListener("click", () => el.remove());
  host.appendChild(el);
  if(timeoutMs){
    window.setTimeout(() => { if(el.isConnected) el.remove(); }, timeoutMs);
  }
}

function ensureToastHost(){
  let host = $(".toasts");
  if(!host){
    host = document.createElement("div");
    host.className = "toasts";
    document.body.appendChild(host);
  }
  return host;
}

export async function fetchXml(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Neizdevās ielādēt: ${url}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parseErr = doc.querySelector("parsererror");
  if(parseErr) throw new Error(`XML kļūda: ${parseErr.textContent}`);
  return doc;
}

export function parseLvDateSmart(s){
  if(!s) return null;
  const str = String(s).trim();
  if(!str) return null;
  // supports YYYY-MM-DD and dot formats: 2026.19.6 (YYYY.DD.M) or 2026.9.5
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(".");
  if(parts.length < 3) return null;
  const y = Number(parts[0]);
  const a = Number(parts[1]);
  const b = Number(parts[2]);
  if(!y || !a || !b) return null;
  let d, m;
  if(a > 12 && b <= 12){ d = a; m = b; }
  else if(b > 12 && a <= 12){ d = b; m = a; }
  else { d = a; m = b; }
  const dt = new Date(Date.UTC(y, m-1, d));
  if(Number.isNaN(dt.getTime())) return null;
  // validate
  if(dt.getUTCFullYear() !== y || (dt.getUTCMonth()+1) !== m || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export function addDaysISO(isoDate, days){
  const [y,m,d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth()+1).padStart(2,"0");
  const dd = String(dt.getUTCDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}

export function eachDayInclusive(startISO, endISO){
  const out = [];
  let cur = startISO;
  while(cur <= endISO){
    out.push(cur);
    cur = addDaysISO(cur, 1);
    if(out.length > 400) break; // sanity
  }
  return out;
}

export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

export function getLocalJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{ return fallback; }
}
export function setLocalJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function downloadText(filename, text){
  const blob = new Blob([text], { type: "application/xml;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export async function sha256Hex(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2,"0")).join("");
}
