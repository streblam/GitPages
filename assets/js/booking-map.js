(function(){
  const el = document.getElementById("bookingMap");
  if (!el) return;

  const token = window.APP_CONFIG?.MAPBOX_TOKEN || "";
  if (!token || token.includes("PASTE_")) {
    console.warn("Nav Mapbox token. Ieliec assets/js/config.js");
    // Karte nestrādās bez token, bet nekrītam ar error.
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "bookingMap",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [27.05, 57.21],
    zoom: 10.5
  });

  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  const routes = window.ROUTES_GEOJSON || {};
  const riverSelect = document.getElementById("river");
  const hint = document.getElementById("mapHint");
  const resetBtn = document.getElementById("resetMapBtn");

  // piesaistes tabula: upes nosaukums -> geojson key
  // (pielāgo pēc saviem datiem)
  const riverToRouteKey = {
    "Pededze": "pededze",
    "Aiviekste": "aiviekste",
    "Gauja": "gauja"
  };

  function setHint(text){
    if (hint) hint.textContent = text;
  }

  function fitGeo(geojson){
    const bounds = new mapboxgl.LngLatBounds();
    geojson.features.forEach(f => {
      if (!f.geometry) return;
      const coords = (f.geometry.type === "LineString")
        ? f.geometry.coordinates
        : (f.geometry.type === "Point")
          ? [f.geometry.coordinates]
          : [];
      coords.forEach(c => bounds.extend(c));
    });
    if (!bounds.isEmpty()){
      map.fitBounds(bounds, { padding: 70, duration: 700 });
    }
  }

  function clearRoute(){
    if (map.getLayer("river-line")) map.removeLayer("river-line");
    if (map.getSource("river-src")) map.removeSource("river-src");
  }

  function drawRoute(routeKey, label){
    clearRoute();

    const geo = routes[routeKey];
    if (!geo){
      setHint(`Maršruts "${label}" vēl nav pievienots (nav GeoJSON).`);
      return;
    }

    map.addSource("river-src", { type: "geojson", data: geo });

    map.addLayer({
      id: "river-line",
      type: "line",
      source: "river-src",
      paint: {
        "line-color": "#ff0000",
        "line-width": 4
      }
    });

    setHint(`Iezīmēts maršruts: ${label}`);
    fitGeo(geo);
  }

  function resetView(){
    clearRoute();
    setHint("Izvēlies upi, lai iezīmētu maršrutu.");
    map.flyTo({ center: [27.05, 57.21], zoom: 10.5, essential: true });
  }

  map.on("load", () => {
    // ja jau izvēlēta upe (piem. no URL prefill)
    const v = riverSelect?.value || "";
    if (v && riverToRouteKey[v]) drawRoute(riverToRouteKey[v], v);
    else setHint("Izvēlies upi, lai iezīmētu maršrutu.");
  });

  riverSelect?.addEventListener("change", () => {
    const v = riverSelect.value;
    if (riverToRouteKey[v]) drawRoute(riverToRouteKey[v], v);
    else resetView(); // "Other" vai tukšs
  });

  resetBtn?.addEventListener("click", resetView);
})();
