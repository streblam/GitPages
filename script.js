const CSV_PATH = "./rezervacijas.csv?v=20260104";

// Inventārs
const MAX_TOTAL = 24 + 8 + 4;

const monthNamesLv = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];

const gridEl = document.getElementById("calendarGrid");
const titleEl = document.getElementById("monthTitle");

const gridMiniEl = document.getElementById("calendarGridMini");
const titleMiniEl = document.getElementById("monthTitleMini");

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

// ---------- Helpers ----------
function clamp(n, min=0, max=100){ return Math.max(min, Math.min(max, n)); }

function ymdLocal(y, m0, d){
  return `${y}-${String(m0+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// HSL: 0% pieejams = sarkans, 100% = zaļš
function colorByAvailability(pct){
  const p = clamp(pct) / 100;
  const hue = 120 * p;
  return `hsl(${hue} 85% 48%)`;
}

// Datumu parsējam “droši”: liekam pusdienlaikā, lai DST nepabīda dienu
function parseLvDateToLocalNoon(v){
  const s = String(v ?? "").trim();
  const parts = s.split(".");
  if (parts.length < 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (![y,m,d].every(Number.isFinite)) return null;
  return new Date(y, m - 1, d, 12, 0, 0); // 12:00 local
}

function toInt(v){
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

// CSV parseris ar pēdiņām (ja ir komati tekstos)
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
      row.push(cell);
      cell = "";
      if (c === "\n" || c === "\r") {
        if (row.some(x => x.trim() !== "")) rows.push(row.map(x => x.trim()));
        row = [];
      }
      continue;
    }

    cell += c;
  }

  row.push(cell);
  if (row.some(x => x.trim() !== "")) rows.push(row.map(x => x.trim()));
  return rows;
}

// Aprēķina: YYYY-MM-DD -> load%
async function computeLoadMapFromCSV(){
  const res = await fetch(CSV_PATH, { cache: "no-store" });
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

    const start = parseLvDateToLocalNoon(row[iStart]);
    const end   = parseLvDateToLocalNoon(row[iEnd]);
    if (!start || !end) continue;

    const units = toInt(row[iVista]) + toInt(row[iKanoe]) + toInt(row[iSup]);
    if (units <= 0) continue;

    // ieskaitot beigu datumu
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = ymdLocal(d.getFullYear(), d.getMonth(), d.getDate());
      usedByDay[key] = (usedByDay[key] || 0) + units;
    }
  }

  const loadPct = {};
  for (const day in usedByDay){
    const used = Math.min(usedByDay[day], MAX_TOTAL);
    loadPct[day] = Math.round((used / MAX_TOTAL) * 100);
  }

  return loadPct;
}

let loadCache = null;
async function getLoadMap(){
  if (loadCache) return loadCache;
  loadCache = await computeLoadMapFromCSV();
  return loadCache;
}

// Vienmēr renderē 42 šūnas (6 nedēļas)
function renderMonthGrid(targetGridEl, year, month0, loadMap, showTooltip){
  targetGridEl.innerHTML = "";

  const first = new Date(year, month0, 1, 12, 0, 0);
  const startWeekday = first.getDay(); // Sv=0..Se=6
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const totalCells = 42;
  for (let i = 0; i < totalCells; i++){
    const dayNum = i - startWeekday + 1;

    if (dayNum < 1 || dayNum > daysInMonth){
      const empty = document.createElement("div");
      empty.className = "day empty";
      targetGridEl.appendChild(empty);
      continue;
    }

    const key = ymdLocal(year, month0, dayNum);
    const load = key in loadMap ? clamp(loadMap[key]) : 0;
    const avail = 100 - load;

    const cell = document.createElement("div");
    cell.className = "day";

    if (showTooltip){
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.innerHTML = `
        <b>${dayNum}. ${monthNamesLv[month0]}</b>
        <div>Pieejams: <b>${avail}%</b></div>
        <div>Noslodze: <b>${load}%</b></div>
      `;
      cell.appendChild(tooltip);
    }

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = dayNum;

    const vbar = document.createElement("div");
    vbar.className = "vbar";

    const vfill = document.createElement("div");
    vfill.className = "vfill";
    vfill.style.height = "0%";
    vfill.style.backgroundColor = colorByAvailability(avail);

    vbar.appendChild(vfill);
    cell.appendChild(num);
    cell.appendChild(vbar);

    requestAnimationFrame(() => { vfill.style.height = `${avail}%`; });

    // hover “pārspēlē” tikai galvenajā kalendārā
    if (showTooltip){
      cell.addEventListener("mouseenter", () => {
        vfill.style.height = "0%";
        vfill.style.backgroundColor = colorByAvailability(avail);
        requestAnimationFrame(() => { vfill.style.height = `${avail}%`; });
      });
    }

    targetGridEl.appendChild(cell);
  }
}

async function renderAll(){
  const loadMap = await getLoadMap();

  // Galvenais mēnesis
  titleEl.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;
  renderMonthGrid(gridEl, viewYear, viewMonth, loadMap, true);

  // Nākamais mēnesis (mini)
  const next = new Date(viewYear, viewMonth + 1, 1, 12, 0, 0);
  const ny = next.getFullYear();
  const nm = next.getMonth();
  titleMiniEl.textContent = `${monthNamesLv[nm]} ${ny}`;
  renderMonthGrid(gridMiniEl, ny, nm, loadMap, false);
}

renderAll().catch(err => {
  console.error(err);
  titleEl.textContent = "Kļūda ielādējot datus";
});
