const CSV_URL = "./data/rezervacijas.csv?v=20260104";
const MAX_TOTAL = 24 + 8 + 4;

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

// --- min mēnesis = tekošais mēnesis (pagātni nerādām) ---
const today = new Date();
today.setHours(12, 0, 0, 0); // stabils pret DST
const minYear = today.getFullYear();
const minMonth = today.getMonth();

function isBeforeMinMonth(y, m0){
  return y < minYear || (y === minYear && m0 < minMonth);
}

document.getElementById("prevBtn").addEventListener("click", async () => {
  // mēģinam pāriet uz iepriekšējo mēnesi
  let y = viewYear;
  let m = viewMonth - 1;
  if (m < 0) { m = 11; y--; }

  // ja tas ir pirms tekošā mēneša -> neko nedaram
  if (isBeforeMinMonth(y, m)) return;

  viewYear = y;
  viewMonth = m;
  await renderAll();
});

document.getElementById("nextBtn").addEventListener("click", async () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  await renderAll();
});

function clamp(n, min = 0, max = 100){ return Math.max(min, Math.min(max, n)); }
function ymd(y, m0, d){
  return `${y}-${String(m0+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
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
  const d = Number(parts[1]);
  const m = Number(parts[2]);

  if (![y, m, d].every(Number.isFinite)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return new Date(y, m - 1, d, 12, 0, 0);
}

function toInt(v){
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

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

function renderMonth(targetGrid, year, month0, loadMap, withTooltip){
  targetGrid.innerHTML = "";

  const first = new Date(year, month0, 1, 12, 0, 0);
  const startWeekday = first.getDay();
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
    const cellDate = new Date(year, month0, dayNum, 12, 0, 0);
    const isPastDay = cellDate < today;

    const load = key in loadMap ? clamp(loadMap[key]) : 0;
    const avail = 100 - load;

    const cell = document.createElement("div");
    cell.className = "day";
    if (isPastDay) cell.classList.add("past");

    // tooltip tikai nākotnes/šodienas dienām
    if (withTooltip && !isPastDay){
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
  titleMini.textContent = `${monthNamesLv[next.getMonth()]} ${next.getFullYear()}`;
  renderMonth(gridMini, next.getFullYear(), next.getMonth(), loadMap, false);

  // prev poga disabled, ja esam tekošajā mēnesī
  const prevBtn = document.getElementById("prevBtn");
  prevBtn.disabled = (viewYear === minYear && viewMonth === minMonth);
}

renderAll().catch(err => {
  console.error(err);
  titleMain.textContent = "Kļūda ielādējot datus";
});
