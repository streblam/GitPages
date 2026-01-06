
import { fetchXml, toast, sha256Hex, getLocalJson, setLocalJson, addDaysISO, eachDayInclusive, downloadText, escapeHtml } from "../app.js";

const LS_KEY = "rezervacija_local_reservations_v1";
const SESSION_KEY = "rezervacija_admin_session_v1";

let config, rivers;

function showInline(elId, msg){
  const el = document.querySelector(elId);
  el.textContent = msg;
  el.classList.add("show");
}
function clearInline(elId){
  const el = document.querySelector(elId);
  el.textContent = "";
  el.classList.remove("show");
}

function uuid(){
  return "A" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function calcEndDate(startDate, days){
  return addDaysISO(startDate, Number(days)-1);
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
    items: { vista: num("items > vista"), kanoe: num("items > kanoe"), sup: num("items > sup") },
    customer: { name: get("customer > name"), phone: get("customer > phone"), email: get("customer > email") },
    notes: get("notes"),
    source: "xml"
  };
}

async function loadAllReservations(){
  const doc = await fetchXml("./data/reservations.xml");
  const base = Array.from(doc.querySelectorAll("reservation")).map(r => xmlReservationToObj(r));
  const local = getLocalJson(LS_KEY, []);
  return base.concat(local);
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

function matchesQuery(r, q){
  if(!q) return true;
  const s = `${r.id} ${r.status} ${r.startDate} ${r.endDate} ${r.river} ${r.customer.name} ${r.customer.phone} ${r.customer.email} ${r.notes}`.toLowerCase();
  return s.includes(q.toLowerCase());
}

function renderTable(reservations){
  const rows = reservations.slice(0, 250).map(r => `
    <tr>
      <td><div style="font-weight:650;">${escapeHtml(r.id)}</div><div class="small">${escapeHtml(r.startDate)} → ${escapeHtml(r.endDate)}</div></td>
      <td><span class="chip">${escapeHtml(r.status)}</span></td>
      <td class="small">
        VISTA: <b>${r.items.vista}</b><br/>
        KANOE: <b>${r.items.kanoe}</b><br/>
        SUP: <b>${r.items.sup}</b>
      </td>
      <td class="small">
        <div><b>${escapeHtml(r.customer.name)}</b></div>
        <div>${escapeHtml(r.customer.phone)}</div>
        <div>${escapeHtml(r.customer.email)}</div>
      </td>
      <td class="small">${escapeHtml(r.river)}</td>
    </tr>
  `).join("");

  document.querySelector("#tableWrap").innerHTML = `
    <div class="small muted">Rāda līdz 250 ierakstiem (ātrdarbībai). Kopā: <b>${reservations.length}</b></div>
    <div style="height:10px"></div>
    <table class="table">
      <thead>
        <tr>
          <th>ID / Datumi</th>
          <th>Statuss</th>
          <th>Inventārs</th>
          <th>Klients</th>
          <th>Upe</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setLoggedIn(v){
  if(v) localStorage.setItem(SESSION_KEY, "1");
  else localStorage.removeItem(SESSION_KEY);

  document.querySelector("#dashboard").style.display = v ? "block" : "none";
  document.querySelector("#logoutBtn").style.display = v ? "inline-flex" : "none";
}

async function main(){
  try{
    config = await fetchXml("./data/config.xml");
    const name = config.querySelector("brand > name")?.textContent?.trim() || "Pēddzes Laivas";
    document.querySelector("#brandName").textContent = name;

    rivers = Array.from(config.querySelectorAll("rivers > river")).map(x => x.textContent.trim()).filter(Boolean);
    document.querySelector("#nRiver").innerHTML = rivers.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

    // Session restore
    const logged = localStorage.getItem(SESSION_KEY) === "1";
    setLoggedIn(logged);

    const users = await fetchXml("./data/users.xml");
    const adminUser = users.querySelector("user");
    const adminEmail = adminUser?.querySelector("email")?.textContent?.trim() || "";
    const adminHash = adminUser?.querySelector("passwordSha256")?.textContent?.trim() || "";

    document.querySelector("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearInline("#loginError");

      const email = document.querySelector("#loginEmail").value.trim();
      const pass = document.querySelector("#loginPass").value;

      // Inline error - NOT background/blurred
      if(email !== adminEmail){
        showInline("#loginError", "Nepareizs e-pasts.");
        toast("Neizdevās pieslēgties", "Nepareizs e-pasts vai parole.");
        return;
      }
      const h = await sha256Hex(pass);
      if(h !== adminHash){
        showInline("#loginError", "Nepareiza parole.");
        toast("Neizdevās pieslēgties", "Nepareizs e-pasts vai parole.");
        return;
      }

      setLoggedIn(true);
      toast("Sveiki!", "Tu esi pieslēdzies admin zonai.");
      await refreshTable();
    });

    document.querySelector("#logoutBtn").addEventListener("click", () => {
      setLoggedIn(false);
      toast("Izgāji", "Sesija beigusies.");
    });

    async function refreshTable(){
      const all = await loadAllReservations();
      const q = document.querySelector("#q").value.trim();
      const status = document.querySelector("#filterStatus").value;
      const filtered = all
        .filter(r => matchesQuery(r, q))
        .filter(r => status ? r.status === status : true)
        .sort((a,b) => (b.startDate||"").localeCompare(a.startDate||""));
      renderTable(filtered);
    }

    document.querySelector("#refreshBtn").addEventListener("click", refreshTable);
    document.querySelector("#q").addEventListener("input", refreshTable);
    document.querySelector("#filterStatus").addEventListener("change", refreshTable);

    document.querySelector("#exportBtn").addEventListener("click", async () => {
      const reservations = await loadAllReservations();
      const xml = buildReservationsXml(reservations);
      downloadText("reservations.export.xml", xml);
      toast("Eksports gatavs", "Lejupielādēts reservations.export.xml");
    });

    document.querySelector("#newForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearInline("#newError");

      const payload = {
        id: uuid(),
        status: document.querySelector("#nStatus").value,
        startDate: document.querySelector("#nStart").value,
        days: Number(document.querySelector("#nDays").value),
        endDate: "",
        river: document.querySelector("#nRiver").value,
        items: {
          vista: Number(document.querySelector("#nVista").value || 0),
          kanoe: Number(document.querySelector("#nKanoe").value || 0),
          sup: Number(document.querySelector("#nSup").value || 0),
        },
        customer: {
          name: document.querySelector("#nName").value,
          phone: document.querySelector("#nPhone").value,
          email: document.querySelector("#nEmail").value,
        },
        notes: document.querySelector("#nNotes").value,
        source: "local"
      };

      if(!payload.startDate) { showInline("#newError", "Norādi sākuma datumu."); return; }
      if(!(payload.days>=1 && payload.days<=14)) { showInline("#newError", "Dienu skaits jābūt 1–14."); return; }
      if(payload.items.vista + payload.items.kanoe + payload.items.sup <= 0) { showInline("#newError", "Izvēlies vismaz 1 inventāru."); return; }
      if(!payload.customer.name.trim()) { showInline("#newError", "Norādi klienta vārdu."); return; }
      if(!payload.customer.phone.trim()) { showInline("#newError", "Norādi telefonu."); return; }

      payload.endDate = calcEndDate(payload.startDate, payload.days);

      const local = getLocalJson(LS_KEY, []);
      local.push(payload);
      setLocalJson(LS_KEY, local);

      toast("Pievienots", "Rezervācija saglabāta lokāli. Neaizmirsti eksportēt XML.");
      document.querySelector("#newForm").reset();
      document.querySelector("#nDays").value = "1";
      document.querySelector("#nVista").value = "0";
      document.querySelector("#nKanoe").value = "0";
      document.querySelector("#nSup").value = "0";
      await refreshTable();
    });

    if(logged){
      await refreshTable();
    }

  }catch(err){
    toast("Kļūda", err?.message || "Nezināma kļūda");
    console.error(err);
  }
}

main();
