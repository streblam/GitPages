// script.js
const grid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Start: current month
let viewDate = new Date();

function lvMonthName(date) {
  const months = [
    "Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs",
    "Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// random dataset: A,B,C noslodze 0..100 katrai dienai
function buildRandomData(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = {};
  for (let d = 1; d <= daysInMonth; d++) {
    // salīdzinoši “reālistiskāk” - nedaudz lielāka iespēja uz noslogotiem brīvdienās
    const date = new Date(year, month, d);
    const weekday = (date.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    const weekendBoost = (weekday >= 5) ? 18 : 0;

    const a = clamp(Math.round(rand(10, 85) + weekendBoost), 0, 100);
    const b = clamp(Math.round(rand(5, 75) + weekendBoost / 2), 0, 100);
    const c = clamp(Math.round(rand(0, 65) + weekendBoost / 3), 0, 100);

    data[d] = { a, b, c };
  }
  return data;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function renderCalendar() {
  grid.innerHTML = "";

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();

  monthLabel.textContent = lvMonthName(viewDate);

  const data = buildRandomData(y, m);

  const firstDay = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // convert to Monday-first index (0..6)
  const startIndex = (firstDay.getDay() + 6) % 7;

  // fill leading blanks
  for (let i = 0; i < startIndex; i++) {
    const blank = document.createElement("div");
    blank.className = "day is-muted";
    grid.appendChild(blank);
  }

  // create day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const { a, b, c } = data[day];

    const cell = document.createElement("div");
    cell.className = "day";

    cell.innerHTML = `
      <div class="day-top">
        <div class="day-num">${day}</div>
      </div>

      <div class="rings-wrap">
        <div class="rings">
          <div class="ring outer a" data-target="${a}"></div>
          <div class="ring mid b"   data-target="${b}"></div>
          <div class="ring inner c" data-target="${c}"></div>
        </div>
      </div>

      <div class="tooltip">
        <b>${day}. ${lvMonthName(viewDate)}</b>
        <div class="row"><span class="label"><span class="badge a"></span>Inventārs A</span><span>${a}%</span></div>
        <div class="row"><span class="label"><span class="badge b"></span>Inventārs B</span><span>${b}%</span></div>
        <div class="row"><span class="label"><span class="badge c"></span>Inventārs C</span><span>${c}%</span></div>
      </div>
    `;

    // initial state: show values (uzreiz)
    const rings = [...cell.querySelectorAll(".ring")];
    rings.forEach(r => r.style.setProperty("--p", r.dataset.target));

    // hover animation: fill from 0 -> target
    cell.addEventListener("mouseenter", () => {
      rings.forEach(r => r.style.setProperty("--p", "0"));
      requestAnimationFrame(() => {
        rings.forEach(r => r.style.setProperty("--p", r.dataset.target));
      });
    });

    grid.appendChild(cell);
  }
}

prevBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  renderCalendar();
});

renderCalendar();
