// ======= Vienkāršs prototips ar “random” datiem (1 mēnesim) =======

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

// Random dataset: { "YYYY-MM-DD": { a: %, b: %, c: % } }
let data = {};

function pad2(n){ return String(n).padStart(2,"0"); }

function buildRandomDataForMonth(year, month){
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const d = {};
  for (let day = 1; day <= daysInMonth; day++){
    const key = `${year}-${pad2(month+1)}-${pad2(day)}`;

    // random, bet “ticamāk” lai nav vienmēr 0/100:
    const a = Math.floor(10 + Math.random() * 90);
    const b = Math.floor(10 + Math.random() * 90);
    const c = Math.floor(10 + Math.random() * 90);

    d[key] = { a, b, c };
  }

  // Piemēram: pirmās 2 dienas “pelēkākas” (kā tavā bildē 1-2)
  const k1 = `${year}-${pad2(month+1)}-01`;
  const k2 = `${year}-${pad2(month+1)}-02`;
  if (d[k1]) d[k1] = { a: 0, b: 0, c: 0 };
  if (d[k2]) d[k2] = { a: 5, b: 10, c: 0 };

  return d;
}

function render(){
  titleEl.textContent = `${monthNamesLv[viewMonth]} ${viewYear}`;
  gridEl.innerHTML = "";

  // ģenerējam data šim mēnesim
  data = buildRandomDataForMonth(viewYear, viewMonth);

  const firstDay = new Date(viewYear, viewMonth, 1);
  // JS: 0=Sv ... 6=Se, mums tas sakrīt ar kolonnu secību (Sv pirmais)
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // tukšās šūnas pirms 1. datuma
  for (let i = 0; i < startWeekday; i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    gridEl.appendChild(empty);
  }

  // dienas
  for (let day = 1; day <= daysInMonth; day++){
    const key = `${viewYear}-${pad2(viewMonth+1)}-${pad2(day)}`;
    const { a, b, c } = data[key];

    const cell = document.createElement("div");
    cell.className = "day";

    // Tooltip
    const tip = document.createElement("div");
    tip.className = "tooltip";
    tip.innerHTML = `
      <div class="tip-title">${day}. ${monthNamesLv[viewMonth]} — noslodze</div>
      <div class="tip-row">
        <span class="tip-chip"><span class="chip-dot" style="background:#22c55e"></span>Inventārs A</span>
        <strong>${a}%</strong>
      </div>
      <div class="tip-row">
        <span class="tip-chip"><span class="chip-dot" style="background:#f59e0b"></span>Inventārs B</span>
        <strong>${b}%</strong>
      </div>
      <div class="tip-row">
        <span class="tip-chip"><span class="chip-dot" style="background:#ef4444"></span>Inventārs C</span>
        <strong>${c}%</strong>
      </div>
    `;

    // dienas numurs
    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = day;

    // 3 joslas
    const bars = document.createElement("div");
    bars.className = "bars";

    const pillA = makePill("inv-a-fill", a);
    const pillB = makePill("inv-b-fill", b);
    const pillC = makePill("inv-c-fill", c);

    bars.appendChild(pillA.wrap);
    bars.appendChild(pillB.wrap);
    bars.appendChild(pillC.wrap);

    cell.appendChild(tip);
    cell.appendChild(num);
    cell.appendChild(bars);

    // animācija: sākumā “0”, pēc tam ielādējas
    requestAnimationFrame(() => {
      pillA.fill.style.width = `${a}%`;
      pillB.fill.style.width = `${b}%`;
      pillC.fill.style.width = `${c}%`;
    });

    // uz hover “pārspēlē” aizpildījumu (skaists efekts)
    cell.addEventListener("mouseenter", () => {
      pillA.fill.style.width = "0%";
      pillB.fill.style.width = "0%";
      pillC.fill.style.width = "0%";
      requestAnimationFrame(() => {
        pillA.fill.style.width = `${a}%`;
        pillB.fill.style.width = `${b}%`;
        pillC.fill.style.width = `${c}%`;
      });
    });

    gridEl.appendChild(cell);
  }
}

function makePill(fillClass, percent){
  const wrap = document.createElement("div");
  wrap.className = "pill";
  const fill = document.createElement("div");
  fill.className = `fill ${fillClass}`;
  fill.style.width = "0%";
  wrap.appendChild(fill);
  return { wrap, fill, percent };
}

render();
