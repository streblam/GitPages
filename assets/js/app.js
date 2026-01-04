import { initCalendar } from "./calendar.js";
import { initBooking } from "./booking.js";
import { initMap } from "./map.js";
import { initMapMini } from "./map-mini.js";

function run(){
  // Calendar roots
  document.querySelectorAll("[data-calendar-root]").forEach(root => {
    initCalendar(root);
  });

  // Booking
  initBooking();

  // Maps
  initMap();
  initMapMini();
}

run();
