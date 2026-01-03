// ===== CONFIG =====
const CSV_URL = "./rezervacijas.csv?v=20260104"; // CSV tajā pašā mapē
const MAX_TOTAL = 24 + 8 + 4; // 36 vienības

const monthNamesLv = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];


const gridMain = document.getElementById("gridMain");
const gridMini = document.getElementById("gridMini");
const titleMain = document.getElementById("monthTitle");
const titleMini = document.getElementById("monthTitleMini");

const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth();

document.getElementById("prevBtn").addEventListener("click", async () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  await renderAll();
});

document.getElementById("nextBtn").addEventListener("click", async () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  await renderAll();
});

// ---- helpers ----
function clamp(n, min = 0, max = 100){ return Math.max(min, Math.min(max, n)); }

function ymd(y, m0, d){
  return `${y}-${String(m0+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// 0% pieejams => sarkans, 100% => zaļš
function colorByAvailability(availPct){
  const p = clamp(availPct) / 100;
  const hue = 120 * p;
  return `hsl(${hue} 85% 48%)`;
}

function parseLvDateLocalNoon(v){
  const s = String(v ?? "").trim();
  const parts = s.split(".");
  if (parts.length < 3) return null;

  const y = Number(parts[0]);
  const d = Number(parts[1]); // DIENA
  const m = Number(parts[2]); // MĒNESIS

  if (![y, m, d].every(Number.isFinite)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  // 12:00 vietējā laikā, lai DST nekad nenobīda dienu
  return new Date(y, m - 1, d, 12, 0, 0);
}

function toInt(v){
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

// Robusts CSV parseris ar pēdiņām (ja tekstos ir komati)
function parseCSV(text){
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++){
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (c === "," || c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell.trim());
      cell = "";
      if (c === "\n" || c === "\r") {
        if (row.some(x => x !== "")) rows.push(row);
        row = [];
      }
      continue;
    }

    cell += c;
  }

  row.push(cell.trim());
  if (row.some(x => x !== "")) rows.push(row);
  return rows;
}

// YYYY-MM-DD -> load%
let loadCache = null;

async function getLoadMap(){
  if (loadCache) return loadCache;

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Neizdevās ielādēt rezervacijas.csv");

  const text = await res.text();
  const table = parseCSV(text);
  if (table.length < 2) return {};

  const header = table[0];
  const idx = (name) => header.indexOf(name);

  const iStart  = idx("Sākuma datums");
  const iEnd    = idx("Beigu datums");
  const iVista  = idx("VISTA");
  const iKanoe  = idx("KANOE");
  const iSup    = idx("SUP");
  const iStatus = idx("Statuss");

  const missing = [];
  if (iStart < 0) missing.push("Sākuma datums");
  if (iEnd < 0) missing.push("Beigu datums");
  if (iVista < 0) missing.push("VISTA");
  if (iKanoe < 0) missing.push("KANOE");
  if (iSup < 0) missing.push("SUP");
  if (iStatus < 0) missing.push("Statuss");
  if (missing.length) throw new Error("CSV trūkst kolonnas: " + missing.join(", "));

  const usedByDay = Object.create(null);

  for (let r = 1; r < table.length; r++){
    const row = table[r];

    const status = String(row[iStatus] ?? "").trim().toUpperCase();
    if (status !== "APSTIPRINĀTS") continue;

    const start = parseLvDateLocalNoon(row[iStart]);
    const end   = parseLvDateLocalNoon(row[iEnd]);
    if (!start || !end) continue;

    const units = toInt(row[iVista]) + toInt(row[iKanoe]) + toInt(row[iSup]);
    if (units <= 0) continue;

    // ieskaitot beigu datumu
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = ymd(d.getFullYear(), d.getMonth(), d.getDate());
      usedByDay[key] = (usedByDay[key] || 0) + units;
    }
  }

  const loadPct = {};
  for (const day in usedByDay){
    const used = Math.min(usedByDay[day], MAX_TOTAL);
    loadPct[day] = Math.round((used / MAX_TOTAL) * 100);
  }

  loadCache = loadPct;
  return loadCache;
}

// Vienmēr 42 šūnas (6 nedēļas) => izmērs nemainās
function renderMonth(targetGrid, year, month0, loadMap, withTooltip){
  targetGrid.innerHTML = "";

  const first = new Date(year, month0, 1, 12, 0, 0);
  const startWeekday = first.getDay(); // Sv=0..Se=6
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  for (let i = 0; i < 42; i++){
    const dayNum = i - startWeekday + 1;

    if (dayNum < 1 || dayNum > daysInMonth){
      const empty = document.createElement("div");
      empty.className = "day empty";
      targetGrid.appendChild(empty);
      continue;
    }

    const key = ymd(year, month0, dayNum);
    const load = key in loadMap ? clamp(loadMap[key]) : 0;
    const avail = 100 - load;

    const cell = document.createElement("div");
    cell.className = "day";

    if (withTooltip){
      const tip = document.createElement("div");
      tip.className = "tip";
      tip.innerHTML = `
        <b>${dayNum}. ${monthNamesLv[month0]}</b>
        <div>Pieejams: <b>${avail}%</b></div>
        <div>Noslodze: <b>${load}%</b></div>
      `;
      cell.appendChild(tip);
    }

    const num = document.createElement("div");
    num.className = "daynum";
    num.textContent = dayNum;

    const vbar = document.createElement("div");
    vbar.className = "vbar";

    const vfill = document.createElement("div");
    vfill.className = "vfill";
    vfill.style.backgroundColor = colorByAvailability(avail);

    vbar.appendChild(vfill);
    cell.appendChild(num);
    cell.appendChild(vbar);

    requestAnimationFrame(() => { vfill.style.height = `${avail}%`; });

    targetGrid.appendChild(cell);
  }
}

async function renderAll(){
  const loadMap = await getLoadMap();

  titleMain.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;
  renderMonth(gridMain, viewYear, viewMonth, loadMap, true);

  const next = new Date(viewYear, viewMonth + 1, 1, 12, 0, 0);
  const ny = next.getFullYear();
  const nm = next.getMonth();

  titleMini.textContent = `${monthNamesLv[nm]} ${ny}`;
  renderMonth(gridMini, ny, nm, loadMap, false);
}

renderAll().catch(err => {
  console.error(err);
  titleMain.textContent = "Kļūda ielādējot datus";
});
