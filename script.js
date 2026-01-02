// ======== Config ========
const monthNamesLv = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];

// Gredzenu radiusi + stroke platumi
// (Ar šiem parametriem panākam, ka tie IR gredzeni un viens otrā.)
const RINGS = [
  { key: "a", r: 24, w: 6 }, // ārējais
  { key: "b", r: 17, w: 6 }, // vidējais
  { key: "c", r: 10, w: 6 }  // iekšējais
];

const grid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");

const tooltip = document.getElementById("tooltip");
const ttDate = document.getElementById("ttDate");
const ttA = document.getElementById("ttA");
const ttB = document.getElementById("ttB");
const ttC = document.getElementById("ttC");

const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");

// ======== State ========
let viewDate = new Date(); // šodiena
viewDate.setDate(1);

// Dataset: Map "YYYY-MM-DD" -> {a,b,c} (0..100)
let dataset = new Map();

function pad2(n){ return String(n).padStart(2,"0"); }
function keyOf(date){
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}

// Random dataset vienam mēnesim
function generateRandomDatasetForMonth(year, monthIndex){
  const map = new Map();
  const daysInMonth = new Date(year, monthIndex+1, 0).getDate();

  for (let d=1; d<=daysInMonth; d++){
    // “Smukāks” random (nevis pilnīgi haotisks):
    // neliels viļņveida pamats + random troksnis
    const base = Math.round(50 + 35 * Math.sin((d / daysInMonth) * Math.PI * 2));
    const clamp = (x)=> Math.max(0, Math.min(100, x));

    const a = clamp(base + randInt(-18, 18));
    const b = clamp(base + randInt(-25, 25));
    const c = clamp(base + randInt(-12, 30));

    const dt = new Date(year, monthIndex, d);
    map.set(keyOf(dt), { a, b, c });
  }
  return map;
}

function randInt(min, max){
  return Math.floor(Math.random()*(max-min+1)) + min;
}

// ======== SVG Rings ========
function ringsSvg(values, animateFromZero = false){
  // SVG viewBox 0..64, centrs 32,32
  // Stroke-dasharray izmantojam pēc apkārtmēra.
  const size = 64;
  const cx = 32, cy = 32;

  const circles = RINGS.map(ring => {
    const r = ring.r;
    const circumference = 2 * Math.PI * r;
    const pct = values[ring.key]; // 0..100
    const filled = (pct / 100) * circumference;
    const dashArray = `${filled} ${circumference - filled}`;
    const dashOffset = animateFromZero ? circumference : 0;

    return `
      <circle class="ring-track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${ring.w}"></circle>
      <circle
        class="ring ${ring.key} ${ring.key}"
        data-ring="${ring.key}"
        cx="${cx}" cy="${cy}" r="${r}"
        stroke-width="${ring.w}"
        stroke-dasharray="${dashArray}"
        stroke-dashoffset="${dashOffset}"
      ></circle>
    `;
  }).join("");

  return `
    <svg class="rings" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      ${circles}
    </svg>
  `;
}

function animateRingsIn(dayEl){
  // Mazs “ielādes” efekts hover brīdī (stroke-dashoffset -> 0)
  const rings = dayEl.querySelectorAll(".ring");
  rings.forEach(r => {
    const rAttr = r.getAttribute("r");
    const circumference = 2 * Math.PI * Number(rAttr);
    r.style.strokeDashoffset = circumference; // start
    // nākamajā frame uz 0
    requestAnimationFrame(() => {
      r.style.strokeDashoffset = "0";
    });
  });
}

// ======== Calendar render ========
function render(){
  grid.innerHTML = "";

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();

  // ja nav datu šim mēnesim — uzģenerē
  dataset = generateRandomDatasetForMonth(y, m);

  monthLabel.textContent = `${monthNamesLv[m]} ${y}`;

  // Pirmās dienas nedēļas diena (LV: P=1..Sv=7)
  // JS: 0=Sv,1=Pr,...6=Se
  const first = new Date(y, m, 1);
  const jsDow = first.getDay(); // 0..6
  // Mēs gribam kolonnas: P,O,T,C,P,S,Sv
  // Pirmdienai jābūt 0. Tātad:
  const offset = (jsDow === 0) ? 6 : jsDow - 1;

  // Iepriekšējā mēneša dienas, lai aizpildītu sākumu
  const prevMonthDays = new Date(y, m, 0).getDate();
  for (let i=0; i<offset; i++){
    const dayNum = prevMonthDays - offset + 1 + i;
    const cell = document.createElement("div");
    cell.className = "day muted";
    cell.innerHTML = `<div class="day-number">${dayNum}</div>`;
    grid.appendChild(cell);
  }

  // Šī mēneša dienas
  const daysInMonth = new Date(y, m+1, 0).getDate();
  for (let d=1; d<=daysInMonth; d++){
    const dt = new Date(y, m, d);
    const key = keyOf(dt);
    const values = dataset.get(key);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.dataset.date = key;

    cell.innerHTML = `
      <div class="day-number">${d}</div>
      ${ringsSvg(values, true)}
    `;

    // Hover tooltip + animācija
    cell.addEventListener("mouseenter", (e) => {
      showTooltip(cell, values);
      animateRingsIn(cell);
    });

    cell.addEventListener("mousemove", (e) => {
      moveTooltip(e.clientX, e.clientY);
    });

    cell.addEventListener("mouseleave", () => {
      hideTooltip();
    });

    grid.appendChild(cell);
  }

  // Aizpildi līdz pilnai rindai (neobligāti, bet vizuāli glīti)
  const totalCells = offset + daysInMonth;
  const remainder = totalCells % 7;
  if (remainder !== 0){
    const add = 7 - remainder;
    for (let i=1; i<=add; i++){
      const cell = document.createElement("div");
      cell.className = "day muted";
      cell.innerHTML = `<div class="day-number">${i}</div>`;
      grid.appendChild(cell);
    }
  }
}

// ======== Tooltip ========
function showTooltip(dayEl, values){
  const dateStr = dayEl.dataset.date; // YYYY-MM-DD
  ttDate.textContent = dateStr;
  ttA.textContent = `${values.a}%`;
  ttB.textContent = `${values.b}%`;
  ttC.textContent = `${values.c}%`;

  tooltip.classList.add("show");
  tooltip.setAttribute("aria-hidden", "false");
}

function hideTooltip(){
  tooltip.classList.remove("show");
  tooltip.setAttribute("aria-hidden", "true");
}

function moveTooltip(x, y){
  const pad = 14;
  const rect = tooltip.getBoundingClientRect();
  let left = x + pad;
  let top = y + pad;

  // lai neiziet ārpus ekrāna
  const maxLeft = window.innerWidth - rect.width - 10;
  const maxTop = window.innerHeight - rect.height - 10;

  if (left > maxLeft) left = x - rect.width - pad;
  if (top > maxTop) top = y - rect.height - pad;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// ======== Controls ========
prevBtn.addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  viewDate.setDate(1);
  render();
});

nextBtn.addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  viewDate.setDate(1);
  render();
});

// Start
render();
