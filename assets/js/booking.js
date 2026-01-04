const KEY = "demo_reservations_v1";

const form = document.getElementById("form");
const errBox = document.getElementById("error");
const tbody = document.querySelector("#tbl tbody");
const count = document.getElementById("count");

const editId = document.getElementById("editId");
const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");
const partyEl = document.getElementById("party");
const notesEl = document.getElementById("notes");

const cancelBtn = document.getElementById("cancelEdit");
const formTitle = document.getElementById("formTitle");

function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function saveAll(list){
  localStorage.setItem(KEY, JSON.stringify(list));
}
function showError(msg){
  errBox.style.display = msg ? "block" : "none";
  errBox.textContent = msg || "";
}
function uid(){
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

function validate(){
  if (!nameEl.value.trim()) return "Vārds ir obligāts.";
  if (!emailEl.value.trim()) return "E-pasts ir obligāts.";
  if (!dateEl.value) return "Datums ir obligāts.";
  if (!timeEl.value) return "Laiks ir obligāts.";
  const p = Number(partyEl.value);
  if (!Number.isFinite(p) || p <= 0) return "Personu skaitam jābūt > 0.";
  return "";
}

function render(){
  const all = loadAll()
    .slice()
    .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

  count.textContent = String(all.length);
  tbody.innerHTML = "";

  for (const r of all){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.time}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${r.party}</td>
      <td class="right">
        <button class="btn ghost" data-edit="${r.id}">Labot</button>
        <button class="btn danger" data-del="${r.id}">Dzēst</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function resetForm(){
  editId.value = "";
  formTitle.textContent = "Jauna rezervācija";
  cancelBtn.hidden = true;
  form.reset();
  partyEl.value = "1";
  showError("");
}

cancelBtn.addEventListener("click", resetForm);

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const all = loadAll();
  const del = btn.getAttribute("data-del");
  const edit = btn.getAttribute("data-edit");

  if (del){
    saveAll(all.filter(x => x.id !== del));
    render();
    if (editId.value === del) resetForm();
  }

  if (edit){
    const r = all.find(x => x.id === edit);
    if (!r) return;
    editId.value = r.id;
    nameEl.value = r.name;
    emailEl.value = r.email;
    dateEl.value = r.date;
    timeEl.value = r.time;
    partyEl.value = r.party;
    notesEl.value = r.notes || "";
    formTitle.textContent = "Labot rezervāciju";
    cancelBtn.hidden = false;
    showError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = validate();
  if (msg) return showError(msg);

  const all = loadAll();
  const id = editId.value || uid();

  // clash: date+time unique
  const clash = all.some(x => x.id !== id && x.date === dateEl.value && x.time === timeEl.value);
  if (clash) return showError("Šis laiks jau ir aizņemts.");

  const item = {
    id,
    name: nameEl.value.trim(),
    email: emailEl.value.trim(),
    date: dateEl.value,
    time: timeEl.value,
    party: Number(partyEl.value),
    notes: notesEl.value.trim()
  };

  const idx = all.findIndex(x => x.id === id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);

  saveAll(all);
  render();
  resetForm();
});

render();
resetForm();
