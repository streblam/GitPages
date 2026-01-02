// ====== Prototips: random dataset vienam mēnesim + hover tooltip ar animāciju ======

const grid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const tooltip = document.getElementById("tooltip");
const ttDate = document.getElementById("ttDate");
const ttA = document.getElementById("ttA");
const ttB = document.getElementById("ttB");
const ttC = document.getElementById("ttC");

const ttFillA = tooltip.querySelector('[data-fill="a"]');
const ttFillB = tooltip.querySelector('[data-fill="b"]');
const ttFillC = tooltip.querySelector('[data-fill="c"]');

let current = new Date();
current.setDate(1);

// ---- Palīgfunkcijas ----
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

// Pirmdiena=0 ... Svētdiena=6
function mondayFirstIndex(date) {
  const js = date.getDay(); // 0=sv,1=pr...
  return (js + 6) % 7;
}

// Random, bet “loģisks”: katram tipam 0..100, ar tendenci ne vienmēr būt max
function randomPct() {
  // bias uz vidējiem skaitļiem
  const r = Math.random();
  return Math.round(Math.pow(r, 0.55) * 100);
}

function monthNameLV(m) {
  const names = [
    "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
    "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
  ];
  return names[m];
}

// Dataset: Map ar key "YYYY-MM-DD" -> {a,b,c}
function generateMonthData(year, month) {
  const total = daysInMonth(year, month);
  const map = new Map();
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    map.set(key, { a: randomPct(), b: randomPct(), c: randomPct() });
  }
  return map;
}

let data = generateMonthData(current.getFullYear(), current.getMonth());

// ---- Render ----
function render() {
  grid.innerHTML = "";

  const y = current.getFullYear();
  const m = current.getMonth();

  monthLabel.textContent = `${monthNameLV(m)} ${y}`;

  data = generateMonthData(y, m);

  // lai kalendārs sāktos ar pirmdienu
  const first = new Date(y, m, 1);
  const startOffset = mondayFirstIndex(first);

  // iepriekšējā mēneša dienas (muted)
  const prevMonth = new Date(y, m, 0);
  const prevDays = prevMonth.getDate();

  for (let i = 0; i < startOffset; i++) {
    const dayNum = prevDays - startOffset + 1 + i;
    grid.appendChild(dayCellMuted(dayNum));
  }

  // šī mēneša dienas
  const total = daysInMonth(y, m);
  for (let d = 1; d <= total; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const v = data.get(key);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.dataset.key = key;

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = d;

    const mini = document.createElement("div");
    mini.className = "mini";

    mini.appendChild(miniBar("a", v.a));
    mini.appendChild(miniBar("b", v.b));
    mini.appendChild(miniBar("c", v.c));

    cell.appendChild(num);
    cell.appendChild(mini);

    // Hover: tooltip + animācija
    cell.addEventListener("mouseenter", (e) => showTooltip(e, key, v));
    cell.addEventListener("mousemove", (e) => moveTooltip(e));
    cell.addEventListener("mouseleave", hideTooltip);

    grid.appendChild(cell);

    // ielādējot, animē mini joslas līdz savam % (neliels delay)
    requestAnimationFrame(() => {
      mini.querySelectorAll(".mini-fill").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
    });
  }

  // pēc mēneša beigām - aizpildām līdz pilnai rindai
  const cellsNow = grid.children.length;
  const remainder = cellsNow % 7;
  if (remainder !== 0) {
    const add = 7 - remainder;
    for (let i = 1; i <= add; i++) {
      grid.appendChild(dayCellMuted(i));
    }
  }
}

function dayCellMuted(dayNum) {
  const cell = document.createElement("div");
  cell.className = "day muted";
  const num = document.createElement("div");
  num.className = "day-num";
  num.textContent = dayNum;
  cell.appendChild(num);
  return cell;
}

function miniBar(type, pct) {
  const line = document.createElement("div");
  line.className = "mini-line";

  const fill = document.createElement("div");
  fill.className = `mini-fill ${type}`;
  fill.dataset.w = pct;
  fill.style.width = "0%"; // start 0 => animācija uz render
  line.appendChild(fill);
  return line;
}

// ---- Tooltip ar animāciju ----
let raf = null;

function showTooltip(e, key, v) {
  tooltip.classList.add("show");
  tooltip.setAttribute("aria-hidden", "false");

  const [yy, mm, dd] = key.split("-");
  ttDate.textContent = `${dd}.${mm}.${yy}`;

  ttA.textContent = `${v.a}%`;
  ttB.textContent = `${v.b}%`;
  ttC.textContent = `${v.c}%`;

  // animē tooltip progressus no 0 uz vērtību
  animateFill(ttFillA, v.a);
  animateFill(ttFillB, v.b);
  animateFill(ttFillC, v.c);

  moveTooltip(e);
}

function hideTooltip() {
  tooltip.classList.remove("show");
  tooltip.setAttribute("aria-hidden", "true");
  // reset uz 0, lai nākamreiz ir “skaists start”
  ttFillA.style.width = "0%";
  ttFillB.style.width = "0%";
  ttFillC.style.width = "0%";
  if (raf) cancelAnimationFrame(raf);
}

function moveTooltip(e) {
  const pad = 14;
  const rect = tooltip.getBoundingClientRect();

  let x = e.clientX + pad;
  let y = e.clientY + pad;

  // lai neiziet ārpus ekrāna
  if (x + rect.width > window.innerWidth - 10) x = e.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 10) y = e.clientY - rect.height - pad;

  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function animateFill(el, targetPct) {
  const duration = 260; // ms
  const start = performance.now();
  const from = 0;

  function tick(t) {
    const p = Math.min(1, (t - start) / duration);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - p, 3);
    const val = from + (targetPct - from) * eased;
    el.style.width = val.toFixed(1) + "%";
    if (p < 1) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}

// ---- Mēneša pārslēgšana ----
prevBtn.addEventListener("click", () => {
  current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  render();
});

nextBtn.addEventListener("click", () => {
  current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  render();
});

// Start
render();
