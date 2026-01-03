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

function pad2(n){ return String(n).padStart(2,"0"); }

// Random dataset: vienam mēnesim, katrai dienai 0..100 noslodze
function buildRandomLoadForMonth(year, month){
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const loads = {};

  for (let day = 1; day <= daysInMonth; day++){
    // mazliet “smukāks” random: vairāk vidējo vērtību
    const r = Math.random();
    const val = Math.round(Math.pow(r, 0.65) * 100);
    loads[day] = val;
  }

  // kā bildē: pirmās dienas pelēcīgas (0..10)
  if (loads[1] !== undefined) loads[1] = 0;
  if (loads[2] !== undefined) loads[2] = 10;

  return loads;
}

function classByLoad(p){
  if (p <= 0) return "free";
  if (p <= 50) return "half";
  if (p <= 80) return "mid";
  return "full";
}

function render(){
  titleEl.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;
  gridEl.innerHTML = "";

  const loads = buildRandomLoadForMonth(viewYear, viewMonth);

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Sv=0..Se=6; mums kalendārā Sv ir pirmais -> der tieši
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // empty cells
  for (let i = 0; i < startWeekday; i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    gridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++){
    const load = loads[day]; // 0..100
    const cls = classByLoad(load);

    const cell = document.createElement("div");
    cell.className = "day";

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerHTML = `<b>${day}. ${monthNamesLv[viewMonth]}</b><div>Noslodze: <b>${load}%</b></div>`;

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = day;

    const pill = document.createElement("div");
    pill.className = "pill";

    const fill = document.createElement("div");
    fill.className = `fill ${cls}`;
    fill.style.width = "0%";
    pill.appendChild(fill);

    cell.appendChild(tooltip);
    cell.appendChild(num);
    cell.appendChild(pill);

    // animācija ielādei
    requestAnimationFrame(() => {
      fill.style.width = `${load}%`;
    });

    // hover: pārspēlē animāciju (skaisti)
    cell.addEventListener("mouseenter", () => {
      fill.style.width = "0%";
      requestAnimationFrame(() => {
        fill.style.width = `${load}%`;
      });
    });

    gridEl.appendChild(cell);
  }
}

render();
