export function clamp(n, min = 0, max = 100){
  return Math.max(min, Math.min(max, n));
}

export function ymd(y, m0, d){
  return `${y}-${String(m0+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export function colorByAvailability(availPct){
  const p = clamp(availPct) / 100;
  const hue = 120 * p; // 0=red, 120=green
  return `hsl(${hue} 85% 48%)`;
}

export function parseCSV(text){
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++){
    const c = text[i];
    const next = text[i+1];

    if (c === '"'){
      if (inQuotes && next === '"'){ cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (c === "," || c === "\n" || c === "\r")){
      if (c === "\r" && next === "\n") i++;
      row.push(cell.trim());
      cell = "";
      if (c === "\n" || c === "\r"){
        if (row.some(x => x !== "")) rows.push(row);
        row = [];
      }
      continue;
    }

    cell += c;
  }

  row.push(cell.trim());
  if (row.some(x => x !== "")) rows.push(row);
  return rows;
}

// Atbalsta: YYYY-MM-DD, DD.MM.YYYY, YYYY.DD.MM (ja tāds bija vecais)
export function parseDateLocalNoon(v){
  const s = String(v ?? "").trim();
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0);
  }

  // DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)){
    const [d, m, y] = s.split(".").map(Number);
    return new Date(y, m-1, d, 12, 0, 0);
  }

  // YYYY.DD.MM (fallback)
  if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(s)){
    const [y, d, m] = s.split(".").map(Number);
    return new Date(y, m-1, d, 12, 0, 0);
  }

  return null;
}

export function toInt(v){
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
