const grid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");

const tooltip = document.getElementById("tooltip");
const tipDate = document.getElementById("tipDate");
const fillA = document.getElementById("fillA");
const fillB = document.getElementById("fillB");
const fillC = document.getElementById("fillC");
const valA = document.getElementById("valA");
const valB = document.getElementById("valB");
const valC = document.getElementById("valC");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// startējam ar šodienas mēnesi
let view = new Date();
view.setDate(1);

// LV mēneši / dienas
const monthNames = [
  "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
  "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
];
const weekdays = ["P", "O", "T", "C", "P", "S", "Sv"]; // Pirmdiena..Svētdiena

// Random datu ģenerators: katrai dienai 3 inventāra procenti (0..100)
function makeMonthData(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const data = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const a = randInt(0, 100);
    const b = randInt(0, 100);
    const c = randInt(0, 100);
    data[d] = { a, b, c };
  }
  return data;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// palīgfunkcija: no % uz vizuālo “aplīša piepildījumu”
function percentToDotStyle(p) {
  // scale 0.35..1.05, opacity 0.35..1
  const s = 0.35 + (p / 100) * 0.70;
  const o = 0.35 + (p / 100) * 0.65;
  return { s: s.toFixed(2), o: o.toFixed(2) };
}

let monthData = makeMonthData(view.getFullYear(), view.getMonth());

function renderCalendar() {
  grid.innerHTML = "";

  const year = view.getFullYear();
  const month = view.getMonth();

  monthTitle.textContent = `${monthNames[month]} ${year}`;

  // weekday header
  for (const w of weekdays) {
    const el = document.createElement("div");
    el.className = "weekday";
    el.textContent = w;
    grid.appendChild(el);
  }

  const firstDay = new Date(year, month, 1);

  // JS: getDay() => Sv=0..S=6; gribam P=0..Sv=6
  const jsDay = firstDay.getDay(); // 0..6
  const offset = (jsDay + 6) % 7;  // Pirmdiena=0

  // iepriekšējā mēneša dienas, lai aizpildītu offset
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    grid.appendChild(makeDayCell(dayNum, null, true));
  }

  // šī mēneša dienas
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    grid.appendChild(makeDayCell(d, monthData[d], false));
  }

  // pēdējā rinda līdz 7
  const totalCells = 7 + offset + daysInMonth; // 7 weekday header + day cells
  const remainder = totalCells % 7;
  const need = remainder === 0 ? 0 : (7 - remainder);

  for (let d = 1; d <= need; d++) {
    grid.appendChild(makeDayCell(d, null, true));
  }
}

function makeDayCell(dayNumber, data, muted) {
  const cell = document.createElement("div");
  cell.className = "day" + (muted ? " muted" : "");

  const num = document.createElement("div");
  num.className = "day-number";
  num.textContent = dayNumber;
  cell.appendChild(num);

  // Te ir “smukie aplīši” (3 inventāri)
  const dots = document.createElement("div");
  dots.className = "dots";

  const dotA = document.createElement("span");
  dotA.className = "inv-dot a";

  const dotB = document.createElement("span");
  dotB.className = "inv-dot b";

  const dotC = document.createElement("span");
  dotC.className = "inv-dot c";

  // ja ir dati, pieliekam CSS mainīgos
  if (data) {
    const a = percentToDotStyle(data.a);
    const b = percentToDotStyle(data.b);
    const c = percentToDotStyle(data.c);

    dotA.style.setProperty("--s", a.s);
    dotA.style.setProperty("--o", a.o);

    dotB.style.setProperty("--s", b.s);
    dotB.style.setProperty("--o", b.o);

    dotC.style.setProperty("--s", c.s);
    dotC.style.setProperty("--o", c.o);

    // hover tooltip
    cell.addEventListener("mouseenter", (e) => showTip(e, dayNumber, data));
    cell.addEventListener("mousemove", (e) => moveTip(e));
    cell.addEventListener("mouseleave", hideTip);
  } else {
    // ārpus mēneša — paliek “mazāki”
    dotA.style.setProperty("--s", "0.25");
    dotA.style.setProperty("--o", "0.18");
    dotB.style.setProperty("--s", "0.25");
    dotB.style.setProperty("--o", "0.18");
    dotC.style.setProperty("--s", "0.25");
    dotC.style.setProperty("--o", "0.18");
  }

  dots.appendChild(dotA);
  dots.appendChild(dotB);
  dots.appendChild(dotC);
  cell.appendChild(dots);

  return cell;
}

function showTip(e, dayNumber, data) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const dateStr = `${dayNumber.toString().padStart(2, "0")}.${(month+1).toString().padStart(2,"0")}.${year}`;
  tipDate.textContent = dateStr;

  // iestata tekstus
  valA.textContent = `${data.a}%`;
  valB.textContent = `${data.b}%`;
  valC.textContent = `${data.c}%`;

  // lai animācija “pārzīmējas” skaisti:
  fillA.style.width = "0%";
  fillB.style.width = "0%";
  fillC.style.width = "0%";

  tooltip.classList.add("show");
  tooltip.setAttribute("aria-hidden", "false");

  // nākamajā kadrā iedodam īsto platumu
  requestAnimationFrame(() => {
    fillA.style.width = `${data.a}%`;
    fillB.style.width = `${data.b}%`;
    fillC.style.width = `${data.c}%`;
  });

  moveTip(e);
}

function moveTip(e) {
  const pad = 14;
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;

  let x = e.clientX + pad;
  let y = e.clientY + pad;

  // neiziet ārpus ekrāna
  const maxX = window.innerWidth - w - 10;
  const maxY = window.innerHeight - h - 10;

  if (x > maxX) x = e.clientX - w - pad;
  if (y > maxY) y = e.clientY - h - pad;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTip() {
  tooltip.classList.remove("show");
  tooltip.setAttribute("aria-hidden", "true");
}

// mēneša pārslēgšana
prevBtn.addEventListener("click", () => {
  view.setMonth(view.getMonth() - 1);
  monthData = makeMonthData(view.getFullYear(), view.getMonth());
  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  view.setMonth(view.getMonth() + 1);
  monthData = makeMonthData(view.getFullYear(), view.getMonth());
  renderCalendar();
});

// start
renderCalendar();
