function mustGetToken(){
  const t = window.APP_CONFIG?.MAPBOX_TOKEN || "";
  if (!t || t.includes("PASTE_")) return "";
  return t;
}

export function initMapMini(){
  const el = document.getElementById("mapMini");
  if (!el) return;

  mapboxgl.accessToken = mustGetToken();
  const routes = window.ROUTES_GEOJSON || {};

  const mapMini = new mapboxgl.Map({
    container: "mapMini",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [27.05, 57.21],
    zoom: 10.2,
    interactive: true
  });

  mapMini.on("load", () => {
    const bounds = new mapboxgl.LngLatBounds();

    for (const [name, geojson] of Object.entries(routes)){
      mapMini.addSource(name, { type: "geojson", data: geojson });
      mapMini.addLayer({
        id: name + "-line",
        type: "line",
        source: name,
        paint: { "line-color": "#ff0000", "line-width": 3 }
      });

      geojson.features.forEach(f => {
        const coords = f.geometry.type === "LineString"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
        coords.forEach(c => bounds.extend(c));
      });
    }

    if (!bounds.isEmpty()){
      mapMini.fitBounds(bounds, { padding: 60, duration: 0 });
    }
  });
}
