const CSV_PATH = "./rezervacijas.csv";

// Inventārs
const MAX_TOTAL = 24 + 8 + 4;

const monthNames = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];

const grid = document.getElementById("calendarGrid");
const title = document.getElementById("monthTitle");

let date = new Date();
let year = date.getFullYear();
let month = date.getMonth();

document.getElementById("prevBtn").onclick = async () => {
  month--; if (month < 0) { month = 11; year--; }
  await render();
};
document.getElementById("nextBtn").onclick = async () => {
  month++; if (month > 11) { month = 0; year++; }
  await render();
};

function parseDate(s) {
  const [y,m,d] = s.split(".").map(Number);
  return new Date(y, m-1, d);
}

function color(avail) {
  return `hsl(${avail * 1.2}, 85%, 45%)`;
}

async function loadCSV() {
  const res = await fetch(CSV_PATH);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(","));

  const h = rows.shift();
  const idx = name => h.indexOf(name);

  const used = {};

  rows.forEach(r => {
    if (r[idx("Statuss")] !== "APSTIPRINĀTS") return;

    const start = parseDate(r[idx("Sākuma datums")]);
    const end   = parseDate(r[idx("Beigu datums")]);

    const units =
      Number(r[idx("VISTA")]) +
      Number(r[idx("KANOE")]) +
      Number(r[idx("SUP")]);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      const key = d.toISOString().slice(0,10);
      used[key] = (used[key] || 0) + units;
    }
  });

  const load = {};
  for (const k in used) {
    load[k] = Math.round(Math.min(used[k], MAX_TOTAL) / MAX_TOTAL * 100);
  }
  return load;
}

let cache = null;

async function render() {
  if (!cache) cache = await loadCSV();

  title.textContent = `${monthNames[month]} ${year}`;
  grid.innerHTML = "";

  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();

  for (let i=0;i<first;i++) grid.innerHTML += `<div class="day empty"></div>`;

  for (let d=1; d<=days; d++) {
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const load = cache[key] || 0;
    const avail = 100 - load;

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `
      <div class="day-num">${d}</div>
      <div class="vbar"><div class="vfill"></div></div>
    `;

    const fill = cell.querySelector(".vfill");
    fill.style.background = color(avail);
    setTimeout(() => fill.style.height = avail + "%", 20);

    grid.appendChild(cell);
  }
}

render();
