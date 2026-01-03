// Pieejamības kalendārs: 1 stabiņš (pieejamība %) + pakāpeniska krāsa

const monthNamesLv = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];

let viewYear = 2026;
let viewMonth = 0; // 0 = Janvāris

const gridEl = document.getElementById("calendarGrid");
const titleEl = document.getElementById("monthTitle");

document.getElementById("prevBtn").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
});

// ---------- Helpers ----------
function pad2(n){ return String(n).padStart(2,"0"); }
function clamp(n, min=0, max=100){ return Math.max(min, Math.min(max, n)); }

// “Smukāks” random noslodzei (0..100), ar tendenci uz vidu
function randomLoad(){
  const r = Math.random();
  return Math.round(Math.pow(r, 0.65) * 100);
}

// Mēs rādām PIEEJAMĪBU (%), nevis noslodzi
// availability = 100 - load
function buildRandomAvailabilityForMonth(year, month){
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availability = {};

  for (let day = 1; day <= daysInMonth; day++){
    const load = randomLoad();
    availability[day] = 100 - load;
  }

  // Demo: pirmās dienas “mazāk pieejamas / pelēkākas” ja gribi
  if (availability[1] !== undefined) availability[1] = 10;
  if (availability[2] !== undefined) availability[2] = 25;

  return availability;
}

/**
 * Pakāpeniska krāsa pēc pieejamības (%):
 * 0% => sarkans, 100% => zaļš
 * Izmantojam HSL: 0 (red) -> 120 (green)
 */
function colorByAvailability(pct){
  const p = clamp(pct) / 100;
  const hue = 120 * p;               // 0..120
  const sat = 85;                    // piesātinājums
  const light = 48;                  // gaišums
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function render(){
  titleEl.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;
  gridEl.innerHTML = "";

  const availability = buildRandomAvailabilityForMonth(viewYear, viewMonth);

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Sv=0..Se=6 (mums kalendārā Sv ir pirmais)
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // tukšās šūnas
  for (let i = 0; i < startWeekday; i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    gridEl.appendChild(empty);
  }

  // dienas
  for (let day = 1; day <= daysInMonth; day++){
    const avail = availability[day]; // 0..100 (pieejamība)
    const load = 100 - avail;

    const cell = document.createElement("div");
    cell.className = "day";

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerHTML = `
      <b>${day}. ${monthNamesLv[viewMonth]}</b>
      <div>Pieejams: <b>${avail}%</b></div>
      <div>Noslodze: <b>${load}%</b></div>
    `;

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = day;

    const vbar = document.createElement("div");
    vbar.className = "vbar";

    const vfill = document.createElement("div");
    vfill.className = "vfill";
    vfill.style.height = "0%";
    vfill.style.backgroundColor = colorByAvailability(avail);

    vbar.appendChild(vfill);

    cell.appendChild(tooltip);
    cell.appendChild(num);
    cell.appendChild(vbar);

    // ielādes animācija
    requestAnimationFrame(() => {
      vfill.style.height = `${avail}%`;
    });

    // hover animācija (pārspēlē)
    cell.addEventListener("mouseenter", () => {
      vfill.style.height = "0%";
      vfill.style.backgroundColor = colorByAvailability(avail);
      requestAnimationFrame(() => {
        vfill.style.height = `${avail}%`;
      });
    });

    gridEl.appendChild(cell);
  }
}

render();
