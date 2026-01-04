function mustGetToken(){
  const t = window.APP_CONFIG?.MAPBOX_TOKEN || "";
  if (!t || t.includes("PASTE_")) {
    console.warn("Nav ielikts Mapbox token. Atver assets/js/config.js un ieliec savu public token.");
  }
  return t;
}

export function initMap(){
  const el = document.getElementById("map");
  if (!el) return;

  mapboxgl.accessToken = mustGetToken();

  const routes = window.ROUTES_GEOJSON || {};
  const listItems = document.querySelectorAll("#routeList li");

  const mapMain = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [27.05, 57.21],
    zoom: 10.5
  });

  mapMain.addControl(new mapboxgl.NavigationControl(), "top-right");

  mapMain.on("load", () => {
    const initialBounds = new mapboxgl.LngLatBounds();

    Object.values(routes).forEach(geojson => {
      geojson.features.forEach(f => {
        const coords = f.geometry.type === "LineString"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
        coords.forEach(c => initialBounds.extend(c));
      });
    });

    for (const [name, geojson] of Object.entries(routes)){
      mapMain.addSource(name, { type: "geojson", data: geojson });

      mapMain.addLayer({
        id: name + "-line",
        type: "line",
        source: name,
        paint: { "line-color": "#888", "line-width": 4 }
      });
    }

    if (!initialBounds.isEmpty()){
      mapMain.fitBounds(initialBounds, { padding: 80, duration: 0 });
    }

    let activeRoutes = [];

    function paintDefault(){
      Object.keys(routes).forEach(name => {
        if (!activeRoutes.includes(name)){
          mapMain.setPaintProperty(name + "-line", "line-color", "#888");
        }
      });
    }

    function focusRoutes(routeNames){
      const b = new mapboxgl.LngLatBounds();
      routeNames.forEach(name => {
        const geo = routes[name];
        if (!geo) return;
        geo.features.forEach(f => {
          const coords = f.geometry.type === "LineString"
            ? f.geometry.coordinates
            : [f.geometry.coordinates];
          coords.forEach(c => b.extend(c));
        });
      });
      if (!b.isEmpty()){
        mapMain.fitBounds(b, { padding: 80, duration: 700 });
      }
    }

    listItems.forEach(li => {
      const routeNames = li.getAttribute("data-routes").split(",").map(s => s.trim()).filter(Boolean);

      li.addEventListener("mouseenter", () => {
        if (li.classList.contains("active")) return;
        routeNames.forEach(name => {
          if (routes[name]) mapMain.setPaintProperty(name + "-line", "line-color", "#ff0000");
        });
        focusRoutes(routeNames);
      });

      li.addEventListener("mouseleave", () => {
        paintDefault();
        if (activeRoutes.length){
          focusRoutes(activeRoutes);
        } else if (!initialBounds.isEmpty()){
          mapMain.fitBounds(initialBounds, { padding: 80, duration: 700 });
        }
      });

      li.addEventListener("click", () => {
        listItems.forEach(x => x.classList.remove("active"));
        li.classList.add("active");
        activeRoutes = routeNames;

        Object.keys(routes).forEach(name => {
          mapMain.setPaintProperty(name + "-line", "line-color", "#888");
        });
        activeRoutes.forEach(name => {
          if (routes[name]) mapMain.setPaintProperty(name + "-line", "line-color", "#ff0000");
        });

        focusRoutes(activeRoutes);
      });
    });
  });
}
