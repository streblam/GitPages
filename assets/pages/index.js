
import { fetchXml, toast, escapeHtml } from "../app.js";

async function main(){
  try{
    const cfg = await fetchXml("./data/config.xml");
    const name = cfg.querySelector("brand > name")?.textContent?.trim() || "Pēddzes Laivas";
    const tagline = cfg.querySelector("brand > tagline")?.textContent?.trim() || "";
    const phone = cfg.querySelector("brand > phone")?.textContent?.trim() || "";
    const email = cfg.querySelector("brand > email")?.textContent?.trim() || "";
    const notice = cfg.querySelector("businessRules > notice")?.textContent?.trim() || "";

    document.querySelector("#brandName").textContent = name;
    document.querySelector("#brandName2").textContent = name;
    document.querySelector("#brandTagline").textContent = tagline;
    document.querySelector("#noticeText").textContent = notice;

    const phoneLink = document.querySelector("#phoneLink");
    phoneLink.textContent = phone;
    phoneLink.href = `tel:${phone.replaceAll(" ","")}`;

    const emailLink = document.querySelector("#emailLink");
    emailLink.textContent = email;
    emailLink.href = `mailto:${email}`;

    document.querySelector("#year").textContent = new Date().getFullYear();

    const services = await fetchXml("./data/services.xml");
    const cards = Array.from(services.querySelectorAll("service")).map(s => {
      const title = s.querySelector("name")?.textContent?.trim() || "";
      const short = s.querySelector("short")?.textContent?.trim() || "";
      const price = s.querySelector("fromPriceEur")?.textContent?.trim() || "";
      return `
        <div class="card pad">
          <h3 style="margin-top:0;">${escapeHtml(title)}</h3>
          <p class="muted">${escapeHtml(short)}</p>
          <div class="hr"></div>
          <div class="badge">Sākot no ${escapeHtml(price)} € / dienā</div>
          <div style="margin-top:12px;">
            <a class="btn primary" href="./booking.html">Rezervēt</a>
          </div>
        </div>
      `;
    }).join("");

    document.querySelector("#servicesGrid").innerHTML = cards;
  }catch(err){
    toast("Kļūda", err?.message || "Nezināma kļūda");
    console.error(err);
  }
}

main();
