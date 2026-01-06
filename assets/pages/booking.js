const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Toast notification system with different types
export function toast(title, message, type = "info", timeoutMs = 5000) {
  const host = ensureToastHost();
  const el = document.createElement("div");
  el.className = "toast";
  
  // Add type-specific styling
  const icon = getToastIcon(type);
  const typeColor = getToastColor(type);
  
  el.innerHTML = `
    <div class="tRow">
      <div>
        <div class="tTitle" style="color: ${typeColor}">
          ${icon} ${escapeHtml(title)}
        </div>
        <div class="tMsg">${escapeHtml(message)}</div>
      </div>
      <button aria-label="Aizvērt" title="Aizvērt (Esc)">✕</button>
    </div>
  `;
  
  const closeBtn = $("button", el);
  const closeToast = () => {
    el.style.animation = "toastSlideOut 0.3s ease";
    setTimeout(() => el.remove(), 300);
  };
  
  closeBtn.addEventListener("click", closeToast);
  
  // Keyboard support
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape" && el.isConnected) {
      closeToast();
      document.removeEventListener("keydown", escapeHandler);
    }
  });
  
  host.appendChild(el);
  
  if (timeoutMs) {
    setTimeout(() => {
      if (el.isConnected) closeToast();
    }, timeoutMs);
  }
  
  return el;
}

function getToastIcon(type) {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ"
  };
  return icons[type] || icons.info;
}

function getToastColor(type) {
  const colors = {
    success: "rgba(34, 197, 94, 1)",
    error: "rgba(239, 68, 68, 1)",
    warning: "rgba(251, 191, 36, 1)",
    info: "rgba(59, 130, 246, 1)"
  };
  return colors[type] || colors.info;
}

function ensureToastHost() {
  let host = $(".toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    document.body.appendChild(host);
    
    // Add toast slide-out animation
    if (!document.querySelector("#toastStyles")) {
      const style = document.createElement("style");
      style.id = "toastStyles";
      style.textContent = `
        @keyframes toastSlideOut {
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  return host;
}

// Enhanced XML fetching with better error messages
export async function fetchXml(url) {
  try {
    const res = await fetch(url, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/xml, text/xml'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Neizdevās ielādēt failu: ${url} (${res.status} ${res.statusText})`);
    }
    
    const text = await res.text();
    
    if (!text || text.trim() === "") {
      throw new Error(`Fails ir tukšs: ${url}`);
    }
    
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const parseErr = doc.querySelector("parsererror");
    
    if (parseErr) {
      throw new Error(`XML parsēšanas kļūda failā ${url}: ${parseErr.textContent}`);
    }
    
    return doc;
  } catch (error) {
    console.error("fetchXml error:", error);
    throw error;
  }
}

// Smart date parser supporting multiple formats
export function parseLvDateSmart(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  
  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(str + "T00:00:00Z");
    if (!isNaN(date.getTime())) return str;
    return null;
  }
  
  // Dot format: YYYY.DD.M or DD.MM.YYYY
  const parts = str.split(".");
  if (parts.length < 3) return null;
  
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  
  let y, m, d;
  
  // Determine format
  if (nums[0] > 31) {
    // YYYY.?.?
    y = nums[0];
    if (nums[1] > 12 && nums[2] <= 12) {
      d = nums[1];
      m = nums[2];
    } else if (nums[2] > 12 && nums[1] <= 12) {
      d = nums[2];
      m = nums[1];
    } else {
      d = nums[1];
      m = nums[2];
    }
  } else if (nums[2] > 31) {
    // DD.MM.YYYY
    d = nums[0];
    m = nums[1];
    y = nums[2];
  } else {
    // Ambiguous - assume DD.MM.YYYY
    d = nums[0];
    m = nums[1];
    y = nums[2];
  }
  
  // Validate
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return null;
  
  // Verify the date is valid
  if (dt.getUTCFullYear() !== y || (dt.getUTCMonth() + 1) !== m || dt.getUTCDate() !== d) {
    return null;
  }
  
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Add days to ISO date
export function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days));
  
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  
  return `${yy}-${mm}-${dd}`;
}

// Generate array of dates between start and end (inclusive)
export function eachDayInclusive(startISO, endISO) {
  const out = [];
  let cur = startISO;
  
  while (cur <= endISO) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
    if (out.length > 400) break; // Sanity check
  }
  
  return out;
}

// Format date for display (ISO to readable)
export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// Escape HTML to prevent XSS
export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Local storage helpers with error handling
export function getLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
}

export function setLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing localStorage key "${key}":`, error);
    toast("Brīdinājums", "Neizdevās saglabāt datus lokāli. Pārlūks var būt pilns.", "warning");
    return false;
  }
}

// Download text as file
export function downloadText(filename, text) {
  try {
    const blob = new Blob([text], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    toast("Kļūda", "Neizdevās lejupielādēt failu", "error");
  }
}

// SHA-256 hash
export async function sha256Hex(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.error("SHA-256 error:", error);
    throw new Error("Neizdevās izveidot hash");
  }
}

// Debounce function for performance
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show loading state on element
export function setLoading(element, isLoading) {
  if (isLoading) {
    element.classList.add("loading");
    element.setAttribute("aria-busy", "true");
  } else {
    element.classList.remove("loading");
    element.removeAttribute("aria-busy");
  }
}

// Validate email format
export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone format (Latvian)
export function isValidPhone(phone) {
  if (!phone) return false;
  // Accept various formats: +371 XXXXXXXX, 371XXXXXXXX, XXXXXXXX
  const cleaned = phone.replace(/\s+/g, "");
  const re = /^(\+371|371)?\d{8}$/;
  return re.test(cleaned);
}

// Format phone number
export function formatPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+371")) {
    return `+371 ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith("371")) {
    return `+371 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// Generate unique ID
export function generateId(prefix = "ID") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}