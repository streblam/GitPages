import { clamp, ymd, colorByAvailability, parseCSV, parseDateLocalNoon, toInt } from "./util.js";

const CSV_URL = "./data/rezervacijas.csv?v=20260104";

// MAX_TOTAL = inventāra kopējais skaits (pielāgo!)
const MAX_TOTAL = 24 + 8 + 4;

const monthNamesLv = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];

function isBeforeMonth(y, m0, minY, minM){
  return y < minY || (y === minY && m0 < minM);
}

async function loadLoadMap(){
  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Neizdevās ielādēt data/rezervacijas.csv");

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

    const start = parseDateLocalNoon(row[iStart]);
    const end   = parseDateLocalNoon(row[iEnd]);
    if (!start || !end) continue;

    const units = toInt(row[iVista]) + toInt(row[iKanoe]) + toInt(row[iSup]);
    if (units <= 0) continue;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)){
      const key = ymd(d.getFullYear(), d.getMonth(), d.getDate());
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

function renderMonth({
  targetGrid,
  year,
  month0,
  loadMap,
  withTooltip,
  todayNoon,
  clickable,
}){
  targetGrid.innerHTML = "";

  const first = new Date(year, month0, 1, 12, 0, 0);
  const startWeekday = first.getDay(); // Sv=0
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
    const isPastDay = cellDate < todayNoon;

    const load = key in loadMap ? clamp(loadMap[key]) : 0;
    const avail = 100 - load;

    const cell = document.createElement("div");
    cell.className = "day";
    if (isPastDay) cell.classList.add("past");

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

    if (clickable && !isPastDay){
      cell.style.cursor = "pointer";
      cell.title = "Rezervēt šo dienu";
      cell.addEventListener("click", () => {
        window.location.href = `booking.html?date=${encodeURIComponent(key)}`;
      });
    }

    targetGrid.appendChild(cell);
  }
}

export async function initCalendar(root){
  // required
  const gridMain = root.querySelector("[data-cal-grid='main']");
  const titleMain = root.querySelector("[data-cal-title='main']");
  const prevBtn = root.querySelector("[data-cal-prev]");
  const nextBtn = root.querySelector("[data-cal-next]");

  if (!gridMain || !titleMain || !prevBtn || !nextBtn) return;

  // optional mini
  const gridMini = root.querySelector("[data-cal-grid='mini']");
  const titleMini = root.querySelector("[data-cal-title='mini']");

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();

  const todayNoon = new Date();
  todayNoon.setHours(12,0,0,0);

  const minYear = todayNoon.getFullYear();
  const minMonth = todayNoon.getMonth();

  let loadMap = {};
  try {
    loadMap = await loadLoadMap();
  } catch (e){
    console.error(e);
    titleMain.textContent = "Kļūda ielādējot CSV";
  }

  async function render(){
    titleMain.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;

    renderMonth({
      targetGrid: gridMain,
      year: viewYear,
      month0: viewMonth,
      loadMap,
      withTooltip: true,
      todayNoon,
      clickable: true
    });

    if (gridMini && titleMini){
      const next = new Date(viewYear, viewMonth + 1, 1, 12, 0, 0);
      titleMini.textContent = `${monthNamesLv[next.getMonth()]} ${next.getFullYear()}`;

      renderMonth({
        targetGrid: gridMini,
        year: next.getFullYear(),
        month0: next.getMonth(),
        loadMap,
        withTooltip: false,
        todayNoon,
        clickable: false
      });
    }

    // disable prev if min month
    prevBtn.disabled = (viewYear === minYear && viewMonth === minMonth);
  }

  prevBtn.addEventListener("click", () => {
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 0) { m = 11; y--; }
    if (isBeforeMonth(y, m, minYear, minMonth)) return;
    viewYear = y; viewMonth = m;
    render();
  });

  nextBtn.addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  render();
}
