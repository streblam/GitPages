import {
  fetchXml,
  toast,
  sha256Hex,
  getLocalJson,
  setLocalJson,
  addDaysISO,
  eachDayInclusive,
  downloadText,
  escapeHtml,
  formatDate,
  isValidEmail,
  isValidPhone,
  formatPhone,
  generateId,
  debounce,
  setLoading
} from "../app.js";

const LS_KEY = "rezervacija_local_reservations_v1";
const SESSION_KEY = "rezervacija_admin_session_v1";

let config, rivers;
let allReservations = [];

// Error display helpers
function showInline(elId, msg) {
  const el = document.querySelector(elId);
  el.textContent = msg;
  el.classList.add("show");
}

function clearInline(elId) {
  const el = document.querySelector(elId);
  el.textContent = "";
  el.classList.remove("show");
}

// Generate unique ID for admin-created reservations
function uuid() {
  return generateId("ADMIN");
}

// Calculate end date
function calcEndDate(startDate, days) {
  return addDaysISO(startDate, Number(days) - 1);
}

// Convert XML reservation to object
function xmlReservationToObj(r) {
  const get = sel => r.querySelector(sel)?.textContent?.trim() || "";
  const num = sel => Number(get(sel) || 0);

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
      sup: num("items > sup")
    },
    customer: {
      name: get("customer > name"),
      phone: get("customer > phone"),
      email: get("customer > email")
    },
    notes: get("notes"),
    source: "xml"
  };
}

// Load all reservations
async function loadAllReservations() {
  try {
    const doc = await fetchXml("./data/reservations.xml");
    const base = Array.from(doc.querySelectorAll("reservation")).map(r =>
      xmlReservationToObj(r)
    );
    const local = getLocalJson(LS_KEY, []);
    return base.concat(local);
  } catch (error) {
    console.error("Error loading reservations:", error);
    toast("Brīdinājums", "Neizdevās ielādēt XML rezervācijas", "warning");
    return getLocalJson(LS_KEY, []);
  }
}

// Build XML export
function buildReservationsXml(reservations) {
  const esc = s =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="utf-8"?>`);
  lines.push(`<reservations version="1.0">`);

  for (const r of reservations) {
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

// Search/filter reservations
function matchesQuery(r, q) {
  if (!q) return true;
  const searchStr = `
    ${r.id} 
    ${r.status} 
    ${r.startDate} 
    ${r.endDate} 
    ${r.river} 
    ${r.customer.name} 
    ${r.customer.phone} 
    ${r.customer.email} 
    ${r.notes}
  `.toLowerCase();
  return searchStr.includes(q.toLowerCase());
}

// Render reservations table
function renderTable(reservations) {
  const wrap = document.querySelector("#tableWrap");

  if (reservations.length === 0) {
    wrap.innerHTML = `
      <div class="small muted" style="text-align: center; padding: 40px 20px;">
        📋 Nav atrasta neviena rezervācija
      </div>
    `;
    return;
  }

  const limited = reservations.slice(0, 250);
  const statusColors = {
    JAUNA: "rgba(59, 130, 246, 0.8)",
    "GAIDA APMAKSU": "rgba(251, 191, 36, 0.8)",
    "APSTIPRINĀTS": "rgba(34, 197, 94, 0.8)"
  };

  const rows = limited
    .map((r, index) => {
      const statusColor = statusColors[r.status] || "rgba(255, 255, 255, 0.6)";
      const sourceIcon = r.source === "local" ? "💾" : "📄";
      const totalItems = r.items.vista + r.items.kanoe + r.items.sup;

      return `
      <tr style="animation: fadeIn 0.3s ease ${index * 0.02}s both;">
        <td>
          <div style="font-weight:650; display: flex; align-items: center; gap: 6px;">
            ${sourceIcon}
            <span>${escapeHtml(r.id)}</span>
          </div>
          <div class="small muted" style="margin-top: 4px;">
            ${formatDate(r.startDate)} → ${formatDate(r.endDate)}
            <span style="color: var(--muted2);">(${r.days} ${r.days === 1 ? "diena" : "dienas"})</span>
          </div>
        </td>
        <td>
          <span class="chip" style="background: ${statusColor}20; border-color: ${statusColor}; color: ${statusColor};">
            ${escapeHtml(r.status)}
          </span>
        </td>
        <td class="small">
          ${
            r.items.vista
              ? `<div>🛶 VISTA: <strong>${r.items.vista}</strong></div>`
              : ""
          }
          ${
            r.items.kanoe
              ? `<div>🚣 KANOE: <strong>${r.items.kanoe}</strong></div>`
              : ""
          }
          ${
            r.items.sup
              ? `<div>🏄 SUP: <strong>${r.items.sup}</strong></div>`
              : ""
          }
          <div class="muted" style="margin-top: 4px;">Kopā: ${totalItems}</div>
        </td>
        <td class="small">
          <div style="font-weight: 600; margin-bottom: 3px;">
            ${escapeHtml(r.customer.name)}
          </div>
          <div>${escapeHtml(r.customer.phone)}</div>
          ${
            r.customer.email
              ? `<div class="muted">${escapeHtml(r.customer.email)}</div>`
              : ""
          }
        </td>
        <td class="small">
          <div style="font-weight: 550;">🌊 ${escapeHtml(r.river)}</div>
          ${
            r.notes
              ? `<div class="muted" style="margin-top: 4px; font-style: italic;">${escapeHtml(r.notes)}</div>`
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");

  wrap.innerHTML = `
    <div class="small muted" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <span>
        Rāda <strong>${limited.length}</strong> no <strong>${reservations.length}</strong> rezervācijām
      </span>
      ${
        reservations.length > 250
          ? '<span style="color: rgba(251, 191, 36, 0.8);">⚠ Ierobežots līdz 250</span>'
          : ""
      }
    </div>
    <div style="overflow-x: auto;">
      <table class="table">
        <thead>
          <tr>
            <th>ID / Datumi</th>
            <th>Statuss</th>
            <th>Inventārs</th>
            <th>Klients</th>
            <th>Upe / Piezīmes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  // Add fade-in animation if not exists
  if (!document.querySelector("#fadeInStyles")) {
    const style = document.createElement("style");
    style.id = "fadeInStyles";
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Set logged-in state
function setLoggedIn(v) {
  if (v) {
    localStorage.setItem(SESSION_KEY, "1");
  } else {
    localStorage.removeItem(SESSION_KEY);
  }

  document.querySelector("#dashboard").style.display = v ? "block" : "none";
  document.querySelector("#logoutBtn").style.display = v
    ? "inline-flex"
    : "none";
  document.querySelector("#loginCard").style.display = v ? "none" : "block";
}

// Main initialization
async function main() {
  try {
    // Load config
    config = await fetchXml("./data/config.xml");
    const name =
      config.querySelector("brand > name")?.textContent?.trim() ||
      "Pēddzes Laivas";
    document.querySelector("#brandName").textContent = name;

    // Load rivers
    rivers = Array.from(config.querySelectorAll("rivers > river"))
      .map(x => x.textContent.trim())
      .filter(Boolean);

    document.querySelector("#nRiver").innerHTML = rivers
      .map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`)
      .join("");

    // Check session
    const logged = localStorage.getItem(SESSION_KEY) === "1";
    setLoggedIn(logged);

    // Load users
    const users = await fetchXml("./data/users.xml");
    const adminUser = users.querySelector("user");
    const adminEmail = adminUser?.querySelector("email")?.textContent?.trim() || "";
    const adminHash =
      adminUser?.querySelector("passwordSha256")?.textContent?.trim() || "";

    // Login form handler
    document.querySelector("#loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      clearInline("#loginError");

      const form = e.target;
      setLoading(form, true);

      try {
        const email = document.querySelector("#loginEmail").value.trim();
        const pass = document.querySelector("#loginPass").value;

        if (!email || !pass) {
          showInline("#loginError", "Lūdzu, aizpildi visus laukus.");
          toast("Kļūda", "Aizpildi visus laukus", "error");
          return;
        }

        if (email !== adminEmail) {
          showInline("#loginError", "Nepareizs e-pasts.");
          toast("Pieslēgšanās neizdevās", "Nepareizi pieslēgšanās dati", "error");
          return;
        }

        const h = await sha256Hex(pass);
        if (h !== adminHash) {
          showInline("#loginError", "Nepareiza parole.");
          toast("Pieslēgšanās neizdevās", "Nepareizi pieslēgšanās dati", "error");
          return;
        }

        setLoggedIn(true);
        toast("Sveicināts! 👋", "Tu esi pieslēdzies admin zonai", "success");
        await refreshTable();
      } finally {
        setLoading(form, false);
      }
    });

    // Logout handler
    document.querySelector("#logoutBtn").addEventListener("click", () => {
      setLoggedIn(false);
      toast("Izrakstījies", "Sesija ir beigusies", "info");
    });

    // Refresh table function
    const refreshTable = debounce(async () => {
      const tableWrap = document.querySelector("#tableWrap");
      setLoading(tableWrap, true);

      try {
        allReservations = await loadAllReservations();

        const q = document.querySelector("#q").value.trim();
        const status = document.querySelector("#filterStatus").value;

        const filtered = allReservations
          .filter(r => matchesQuery(r, q))
          .filter(r => (status ? r.status === status : true))
          .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

        renderTable(filtered);
      } catch (error) {
        console.error("Refresh error:", error);
        toast("Kļūda", "Neizdevās atjaunot tabulu", "error");
      } finally {
        setLoading(tableWrap, false);
      }
    }, 300);

    // Table controls
    document.querySelector("#refreshBtn").addEventListener("click", refreshTable);
    document.querySelector("#q").addEventListener("input", refreshTable);
    document
      .querySelector("#filterStatus")
      .addEventListener("change", refreshTable);

    // Export button
    document.querySelector("#exportBtn").addEventListener("click", async () => {
      try {
        const reservations = await loadAllReservations();
        const xml = buildReservationsXml(reservations);
        const timestamp = new Date().toISOString().split("T")[0];
        downloadText(`reservations_export_${timestamp}.xml`, xml);
        toast("Eksports pabeigts ✓", "Fails ir lejupielādēts", "success");
      } catch (error) {
        console.error("Export error:", error);
        toast("Kļūda", "Neizdevās eksportēt rezervācijas", "error");
      }
    });

    // New reservation form
    document.querySelector("#newForm").addEventListener("submit", async e => {
      e.preventDefault();
      clearInline("#newError");

      const form = e.target;
      setLoading(form, true);

      try {
        const startDate = document.querySelector("#nStart").value;
        const days = Number(document.querySelector("#nDays").value);

        const payload = {
          id: uuid(),
          status: document.querySelector("#nStatus").value,
          startDate,
          days,
          endDate: calcEndDate(startDate, days),
          river: document.querySelector("#nRiver").value,
          items: {
            vista: Number(document.querySelector("#nVista").value || 0),
            kanoe: Number(document.querySelector("#nKanoe").value || 0),
            sup: Number(document.querySelector("#nSup").value || 0)
          },
          customer: {
            name: document.querySelector("#nName").value.trim(),
            phone: formatPhone(document.querySelector("#nPhone").value.trim()),
            email: document.querySelector("#nEmail").value.trim()
          },
          notes: document.querySelector("#nNotes").value.trim(),
          source: "local",
          createdAt: new Date().toISOString()
        };

        // Validation
        if (!payload.startDate) {
          showInline("#newError", "Norādi sākuma datumu.");
          return;
        }
        if (!(payload.days >= 1 && payload.days <= 14)) {
          showInline("#newError", "Dienu skaits jābūt 1–14.");
          return;
        }
        if (
          payload.items.vista + payload.items.kanoe + payload.items.sup <=
          0
        ) {
          showInline("#newError", "Izvēlies vismaz 1 inventāru.");
          return;
        }
        if (!payload.customer.name.trim()) {
          showInline("#newError", "Norādi klienta vārdu.");
          return;
        }
        if (!payload.customer.phone.trim()) {
          showInline("#newError", "Norādi telefonu.");
          return;
        }
        if (!isValidPhone(payload.customer.phone)) {
          showInline("#newError", "Norādi derīgu telefona numuru.");
          return;
        }

        // Save
        const local = getLocalJson(LS_KEY, []);
        local.push(payload);
        const saved = setLocalJson(LS_KEY, local);

        if (!saved) {
          showInline("#newError", "Neizdevās saglabāt. Pārbaudi pārlūka atmiņu.");
          return;
        }

        toast(
          "Rezervācija pievienota ✓",
          "Neaizmirsti eksportēt XML failu",
          "success"
        );

        // Reset form
        form.reset();
        document.querySelector("#nDays").value = "1";
        document.querySelector("#nVista").value = "0";
        document.querySelector("#nKanoe").value = "0";
        document.querySelector("#nSup").value = "0";

        await refreshTable();
      } catch (error) {
        console.error("New reservation error:", error);
        showInline("#newError", "Radās tehniska kļūda.");
        toast("Kļūda", "Neizdevās pievienot rezervāciju", "error");
      } finally {
        setLoading(form, false);
      }
    });

    // Load initial data if logged in
    if (logged) {
      await refreshTable();
    }
  } catch (err) {
    console.error("Admin initialization error:", err);
    toast(
      "Kļūda",
      err?.message || "Neizdevās inicializēt admin zonu",
      "error"
    );
  }
}

// Initialize
main();