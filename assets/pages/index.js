import { fetchXml, toast, escapeHtml } from "../app.js";

async function main() {
  try {
    // Load configuration
    const cfg = await fetchXml("./data/config.xml");

    const name =
      cfg.querySelector("brand > name")?.textContent?.trim() || "Pēddzes Laivas";
    const tagline =
      cfg.querySelector("brand > tagline")?.textContent?.trim() || "";
    const phone = cfg.querySelector("brand > phone")?.textContent?.trim() || "";
    const email = cfg.querySelector("brand > email")?.textContent?.trim() || "";
    const notice =
      cfg.querySelector("businessRules > notice")?.textContent?.trim() || "";

    // Update brand information
    document.querySelectorAll("#brandName, #brandName2").forEach(el => {
      el.textContent = name;
    });
    
    const taglineEl = document.querySelector("#brandTagline");
    if (taglineEl) taglineEl.textContent = tagline;

    const noticeTextEl = document.querySelector("#noticeText");
    if (noticeTextEl) noticeTextEl.textContent = notice;

    // Set up phone link
    const phoneLink = document.querySelector("#phoneLink");
    if (phoneLink) {
      phoneLink.textContent = phone;
      phoneLink.href = `tel:${phone.replaceAll(/\s+/g, "")}`;
      phoneLink.title = `Zvanīt: ${phone}`;
    }

    // Set up email link
    const emailLink = document.querySelector("#emailLink");
    if (emailLink) {
      emailLink.textContent = email;
      emailLink.href = `mailto:${email}`;
      emailLink.title = `Rakstīt: ${email}`;
    }

    // Set current year
    const yearEl = document.querySelector("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Load and render services
    await loadServices();

    // Add smooth scroll behavior to navigation links
    setupSmoothScroll();

    // Add subtle animations on scroll
    setupScrollAnimations();
  } catch (err) {
    console.error("Initialization error:", err);
    toast(
      "Kļūda",
      err?.message || "Neizdevās ielādēt lapu. Lūdzu, pārlādē lapu.",
      "error"
    );
  }
}

// Load and render service cards
async function loadServices() {
  try {
    const services = await fetchXml("./data/services.xml");
    const serviceNodes = services.querySelectorAll("service");

    if (serviceNodes.length === 0) {
      throw new Error("Nav atrasts neviens pakalpojums");
    }

    const cards = Array.from(serviceNodes)
      .map((s, index) => {
        const title = s.querySelector("name")?.textContent?.trim() || "";
        const short = s.querySelector("short")?.textContent?.trim() || "";
        const price = s.querySelector("fromPriceEur")?.textContent?.trim() || "";

        // Add animation delay for staggered effect
        const delay = index * 0.1;

        return `
        <div class="card pad" style="animation: fadeInUp 0.6s ease ${delay}s both;">
          <h3 style="margin-top:0; display: flex; align-items: center; gap: 10px;">
            ${getServiceIcon(title)}
            ${escapeHtml(title)}
          </h3>
          <p class="muted">${escapeHtml(short)}</p>
          <div class="hr"></div>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div class="badge">
              Sākot no <strong>${escapeHtml(price)} €</strong> / dienā
            </div>
            <a class="btn primary" href="./booking.html" aria-label="Rezervēt ${escapeHtml(title)}">
              Rezervēt
            </a>
          </div>
        </div>
      `;
      })
      .join("");

    const servicesGrid = document.querySelector("#servicesGrid");
    if (servicesGrid) {
      servicesGrid.innerHTML = cards;

      // Add fade-in animation CSS if not exists
      if (!document.querySelector("#fadeInUpStyles")) {
        const style = document.createElement("style");
        style.id = "fadeInUpStyles";
        style.textContent = `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  } catch (err) {
    console.error("Error loading services:", err);
    const servicesGrid = document.querySelector("#servicesGrid");
    if (servicesGrid) {
      servicesGrid.innerHTML = `
        <div class="card pad" style="grid-column: 1 / -1;">
          <p class="muted" style="text-align: center;">
            ⚠ Neizdevās ielādēt pakalpojumus. Lūdzu, pārlādē lapu vai sazinies ar mums.
          </p>
        </div>
      `;
    }
  }
}

// Get appropriate icon for service type
function getServiceIcon(serviceName) {
  const name = serviceName.toLowerCase();
  if (name.includes("vista")) return "🛶";
  if (name.includes("kanoe")) return "🚣";
  if (name.includes("sup")) return "🏄";
  return "🌊";
}

// Setup smooth scrolling for anchor links
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#" || href.length <= 1) return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        const offsetTop = target.offsetTop - 80; // Account for fixed header
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth"
        });

        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

// Setup scroll-triggered animations
function setupScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe sections for fade-in effect
  document.querySelectorAll(".section").forEach(section => {
    section.style.opacity = "0";
    section.style.transform = "translateY(20px)";
    section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(section);
  });

  // Add visible class CSS
  if (!document.querySelector("#scrollAnimStyles")) {
    const style = document.createElement("style");
    style.id = "scrollAnimStyles";
    style.textContent = `
      .section.visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Add interactive hover effects to contact cards
function enhanceContactInteractivity() {
  const contactLinks = document.querySelectorAll("#phoneLink, #emailLink");
  
  contactLinks.forEach(link => {
    link.addEventListener("mouseenter", function() {
      this.style.transform = "translateX(3px)";
      this.style.transition = "transform 0.2s ease";
    });
    
    link.addEventListener("mouseleave", function() {
      this.style.transform = "translateX(0)";
    });
  });
}

// Initialize the page
main().then(() => {
  enhanceContactInteractivity();
});