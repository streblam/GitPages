import { toInt } from "./util.js";

const KEY = "bookings_v2";

function qs(name){
  return document.getElementById(name);
}

function showError(box, msg){
  box.style.display = msg ? "block" : "none";
  box.textContent = msg || "";
}

function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function saveAll(list){
  localStorage.setItem(KEY, JSON.stringify(list));
}

function getParams(){
  const p = new URLSearchParams(location.search);
  return {
    date: p.get("date") || "",
    name: p.get("name") || "",
    email: p.get("email") || "",
    time: p.get("time") || "",
    party: p.get("party") || ""
  };
}

export function initBooking(){
  const form = qs("bookingForm");
  if (!form) return;

  const errBox = qs("error");
  const pill = qs("pickedDatePill");

  const emailEl = qs("email");
  const nameEl = qs("fullName");
  const phoneEl = qs("phone");

  const vistaEl = qs("vista");
  const kanoeEl = qs("kanoe");
  const supEl = qs("sup");
  const invHint = qs("invHint");

  const pickupEl = qs("pickup");
  const returnEl = qs("returnDate");

  const riverEl = qs("river");
  const riverOtherWrap = qs("riverOtherWrap");
  const riverOtherEl = qs("riverOther");
  const notesEl = qs("notes");

  const params = getParams();

  // Defaults from URL
  if (params.name) nameEl.value = params.name;
  if (params.email) emailEl.value = params.email;

  if (params.date){
    pill.textContent = params.date;
    pickupEl.value = `${params.date}T${params.time || "10:00"}`;
    returnEl.value = params.date;
  } else {
    pill.textContent = "Izvēlies datumu kalendārā";
  }

  function validate(){
    if (!emailEl.value.trim()) return "Email ir obligāts.";
    if (!nameEl.value.trim()) return "Vārds, Uzvārds ir obligāts.";
    if (!phoneEl.value.trim()) return "Tālruņa numurs ir obligāts.";

    const vista = toInt(vistaEl.value);
    const kanoe = toInt(kanoeEl.value);
    const sup = toInt(supEl.value);
    if (vista + kanoe + sup <= 0) return "Izvēlies vismaz 1 inventāra vienību.";

    if (!pickupEl.value) return "Saņemšanas laiks ir obligāts.";
    if (!returnEl.value) return "Nodošanas datums ir obligāts.";

    if (!riverEl.value) return "Izvēlētā upe ir obligāta.";
    if (riverEl.value === "Other" && !riverOtherEl.value.trim()) return "Lūdzu, norādi citu upi.";

    const pickupDate = pickupEl.value.slice(0,10);
    if (returnEl.value < pickupDate) return "Nodošanas datums nevar būt pirms saņemšanas datuma.";

    return "";
  }

  riverEl.addEventListener("change", () => {
    const isOther = riverEl.value === "Other";
    riverOtherWrap.style.display = isOther ? "block" : "none";
    if (!isOther) riverOtherEl.value = "";
  });

  [vistaEl, kanoeEl, supEl].forEach(el => {
    el.addEventListener("input", () => {
      const sum = toInt(vistaEl.value) + toInt(kanoeEl.value) + toInt(supEl.value);
      invHint.textContent = sum > 0 ? `Kopā: ${sum}` : "Izvēlies vismaz 1 vienību.";
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showError(errBox, "");

    const msg = validate();
    if (msg) return showError(errBox, msg);

    const booking = {
      id: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      email: emailEl.value.trim(),
      fullName: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      inventory: {
        vista: toInt(vistaEl.value),
        kanoe: toInt(kanoeEl.value),
        sup: toInt(supEl.value)
      },
      pickup: pickupEl.value,
      returnDate: returnEl.value,
      river: riverEl.value === "Other" ? riverOtherEl.value.trim() : riverEl.value,
      notes: notesEl.value.trim(),
      createdAt: new Date().toISOString()
    };

    const all = loadAll();
    all.push(booking);
    saveAll(all);

    alert("Rezervācija saglabāta (demo: LocalStorage).");
    window.location.href = `calendar.html`;
  });
}
