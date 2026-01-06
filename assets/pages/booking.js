
import { fetchXml, toast, getLocalJson, setLocalJson, addDaysISO, eachDayInclusive, downloadText, escapeHtml } from "../app.js";

const LS_KEY = "rezervacija_local_reservations_v1";

let config, inventoryTotals, rivers;

function showError(msg){
  const el = document.querySelector("#formError");
  el.textContent = msg;
  el.classList.add("show");
}
function clearError(){
  const el = document.querySelector("#formError");
  el.textContent = "";
  el.classList.remove("show");
}

function uuid(){
  return "L" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

async function loadAllReservations(){
  const doc = await fetchXml("./data/reservations.xml");
  const base = Array.from(doc.querySelectorAll("reservation")).map(r => xmlReservationToObj(r));
  const local = getLocalJson(LS_KEY, []);
  return base.concat(local);
}

function xmlReservationToObj(r){
  const get = (sel) => r.querySelector(sel)?.textContent?.trim() || "";
  const num = (sel) => Number(get(sel) || 0);
  return {
    id: r.getAttribute("id") || "",
    status: get("status"),
    startDate: get("startDate"),
    endDate: get("endDate"),
    days: Number(get("days") || 0),
    river: get("river"),
    items: {
      vista: num("items > vista"),
      kanoe: num("items > kanoe"),
      sup: num("items > sup"),
    },
    customer: {
      name: get("customer > name"),
      phone: get("customer > phone"),
      email: get("customer > email"),
    },
    notes: get("notes"),
    source: "xml"
  };
}

function validateForm(payload){
  if(!payload.startDate) return "Norādi sākuma datumu.";
  if(!(payload.days >= 1 && payload.days <= 14)) return "Dienu skaits jābūt 1–14.";
  if(payload.items.vista + payload.items.kanoe + payload.items.sup <= 0) return "Izvēlies vismaz 1 inventāru (VISTA/KANOE/SUP).";
  if(!payload.customer.name.trim()) return "Norādi vārdu.";
  if(!payload.customer.phone.trim()) return "Norādi telefonu.";
  return null;
}

function calcEndDate(startDate, days){
  // inclusive end: start + (days-1)
  return addDaysISO(startDate, Number(days)-1);
}

function computeUsageByDay(reservations){
  const map = new Map(); // date -> {vista,kanoe,sup}
  for(const r of reservations){
    if(!r.startDate || !r.endDate) continue;
    for(const d of eachDayInclusive(r.startDate, r.endDate)){
      const cur = map.get(d) || { vista:0, kanoe:0, sup:0 };
      cur.vista += Number(r.items.vista||0);
      cur.kanoe += Number(r.items.kanoe||0);
      cur.sup += Number(r.items.sup||0);
      map.set(d, cur);
    }
  }
  return map;
}

function renderAvailability(rangeDays, usageByDay){
  if(rangeDays.length === 0){
    document.querySelector("#availabilityBox").innerHTML = "Izvēlies datumus un daudzumu, lai redzētu atlikumu.";
    return;
  }
  const rows = rangeDays.map(d => {
    const used = usageByDay.get(d) || {vista:0,kanoe:0,sup:0};
    const rem = {
      vista: inventoryTotals.vista - used.vista,
      kanoe: inventoryTotals.kanoe - used.kanoe,
      sup: inventoryTotals.sup - used.sup,
    };
    return `
      <tr>
        <td>${escapeHtml(d)}</td>
        <td>${rem.vista}</td>
        <td>${rem.kanoe}</td>
        <td>${rem.sup}</td>
      </tr>
    `;
  }).join("");

  document.querySelector("#availabilityBox").innerHTML = `
    <div class="chip">Inventārs kopā: VISTA ${inventoryTotals.vista}, KANOE ${inventoryTotals.kanoe}, SUP ${inventoryTotals.sup}</div>
    <div style="height:10px"></div>
    <table class="table" aria-label="Pieejamība">
      <thead>
        <tr><th>Datums</th><th>VISTA</th><th>KANOE</th><th>SUP</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildReservationsXml(reservations){
  const esc = (s) => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="utf-8"?>`);
  lines.push(`<reservations version="1.0">`);
  for(const r of reservations){
    lines.push(`  <reservation id="${esc(r.id)}">`);
    lines.push(`    <status>${esc(r.status)}</status>`);
    lines.push(`    <startDate>${esc(r.startDate)}</startDate>`);
    lines.push(`    <endDate>${esc(r.endDate)}</endDate>`);
    lines.push(`    <days>${esc(r.days)}</days>`);
    lines.push(`    <items>`);
    lines.push(`      <vista>${esc(r.items.vista)}</vista>`);
    lines.push(`      <kanoe>${esc(r.items.kanoe)}</kanoe>`);
    lines.push(`      <sup>${esc(r.items.sup)}</sup>`);
    lines.push(`    </items>`);
    lines.push(`    <river>${esc(r.river)}</river>`);
    lines.push(`    <customer>`);
    lines.push(`      <name>${esc(r.customer.name)}</name>`);
    lines.push(`      <phone>${esc(r.customer.phone)}</phone>`);
    lines.push(`      <email>${esc(r.customer.email)}</email>`);
    lines.push(`    </customer>`);
    lines.push(`    <notes>${esc(r.notes)}</notes>`);
    lines.push(`  </reservation>`);
  }
  lines.push(`</reservations>`);
  return lines.join("\n");
}

async function main(){
  try{
    config = await fetchXml("./data/config.xml");
    const name = config.querySelector("brand > name")?.textContent?.trim() || "Pēddzes Laivas";
    document.querySelector("#brandName").textContent = name;
    document.querySelector("#noticeText").textContent =
      config.querySelector("businessRules > notice")?.textContent?.trim() || "";

    inventoryTotals = {
      vista: Number(config.querySelector("inventory > vista")?.getAttribute("total") || 0),
      kanoe: Number(config.querySelector("inventory > kanoe")?.getAttribute("total") || 0),
      sup: Number(config.querySelector("inventory > sup")?.getAttribute("total") || 0),
    };

    rivers = Array.from(config.querySelectorAll("rivers > river")).map(x => x.textContent.trim()).filter(Boolean);
    const riverSel = document.querySelector("#river");
    riverSel.innerHTML = rivers.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

    const startInput = document.querySelector("#startDate");
    const daysInput = document.querySelector("#days");
    const updateAvail = async () => {
      const start = startInput.value;
      const days = Number(daysInput.value || 0);
      if(!start || !(days>=1)) { renderAvailability([], new Map()); return; }
      const end = calcEndDate(start, days);
      const range = eachDayInclusive(start, end);
      const reservations = await loadAllReservations();
      const usage = computeUsageByDay(reservations);
      renderAvailability(range, usage);
    };

    startInput.addEventListener("change", updateAvail);
    daysInput.addEventListener("input", updateAvail);
    ["vista","kanoe","sup"].forEach(id => document.querySelector("#"+id).addEventListener("input", updateAvail));

    await updateAvail();

    document.querySelector("#bookingForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const payload = {
        id: uuid(),
        status: document.querySelector("#status").value,
        startDate: startInput.value,
        days: Number(document.querySelector("#days").value),
        endDate: "",
        river: document.querySelector("#river").value,
        items: {
          vista: Number(document.querySelector("#vista").value || 0),
          kanoe: Number(document.querySelector("#kanoe").value || 0),
          sup: Number(document.querySelector("#sup").value || 0),
        },
        customer: {
          name: document.querySelector("#name").value,
          phone: document.querySelector("#phone").value,
          email: document.querySelector("#email").value,
        },
        notes: document.querySelector("#notes").value,
        source: "local"
      };

      payload.endDate = calcEndDate(payload.startDate, payload.days);

      const err = validateForm(payload);
      if(err){ showError(err); toast("Nepilnīgi dati", err); return; }

      // Availability check (soft)
      const reservations = await loadAllReservations();
      const usage = computeUsageByDay(reservations);
      const range = eachDayInclusive(payload.startDate, payload.endDate);
      let conflict = false;
      for(const d of range){
        const used = usage.get(d) || {vista:0,kanoe:0,sup:0};
        if(used.vista + payload.items.vista > inventoryTotals.vista) conflict = true;
        if(used.kanoe + payload.items.kanoe > inventoryTotals.kanoe) conflict = true;
        if(used.sup + payload.items.sup > inventoryTotals.sup) conflict = true;
      }

      const local = getLocalJson(LS_KEY, []);
      local.push(payload);
      setLocalJson(LS_KEY, local);

      toast("Rezervācija nosūtīta", conflict
        ? "Piezīme: iespējams, ka inventāra atlikums ir uz robežas — mēs apstiprināsim pēc pārbaudes."
        : "Paldies! Mēs sazināsimies, lai apstiprinātu detaļas.");

      document.querySelector("#bookingForm").reset();
      document.querySelector("#days").value = "1";
      document.querySelector("#vista").value = "0";
      document.querySelector("#kanoe").value = "0";
      document.querySelector("#sup").value = "0";
      await updateAvail();
    });

    document.querySelector("#exportBtn").addEventListener("click", async () => {
      const reservations = await loadAllReservations();
      const xml = buildReservationsXml(reservations);
      downloadText("reservations.export.xml", xml);
      toast("Eksports gatavs", "Lejupielādēts reservations.export.xml");
    });

    document.querySelector("#clearLocalBtn").addEventListener("click", async () => {
      setLocalJson(LS_KEY, []);
      toast("Notīrīts", "Lokālās rezervācijas notīrītas šajā pārlūkā.");
      await updateAvail();
    });

  }catch(err){
    toast("Kļūda", err?.message || "Nezināma kļūda");
    console.error(err);
  }
}

main();
