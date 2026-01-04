mapboxgl.accessToken = window.APP_CONFIG?.MAPBOX_TOKEN || "";

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [27.05, 57.21],
  zoom: 11
});

map.on('load', () => {
  const routes = window._ROUTES_GEOJSON;

  const initialBounds = new mapboxgl.LngLatBounds();
  Object.values(routes).forEach(geojson => {
    geojson.features.forEach(f => {
      const coords = f.geometry.type === 'LineString'
        ? f.geometry.coordinates
        : [f.geometry.coordinates];
      coords.forEach(c => initialBounds.extend(c));
    });
  });

  for (const [name, geojson] of Object.entries(routes)) {
    map.addSource(name, { type: 'geojson', data: geojson });

    map.addLayer({
      id: name + '-line',
      type: 'line',
      source: name,
      paint: { 'line-color': '#888', 'line-width': 4 }
    });

    map.addLayer({
      id: name + '-points',
      type: 'circle',
      source: name,
      paint: { 'circle-radius': 4, 'circle-color': '#888' },
      filter: ['==', '$type', 'Point']
    });
  }

  const listItems = document.querySelectorAll('#routeList li');
  let activeRoutes = [];

  map.fitBounds(initialBounds, { padding: 80 });

  listItems.forEach(li => {
    const routeNames = li.getAttribute('data-routes').split(',');

    li.addEventListener('mouseenter', () => {
      if (!li.classList.contains('active')) {
        routeNames.forEach(name => map.setPaintProperty(name + '-line', 'line-color', '#ff0000'));

        const bounds = new mapboxgl.LngLatBounds();
        routeNames.forEach(name => {
          const coords = routes[name].features
            .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
          coords.forEach(c => bounds.extend(c));
        });

        map.fitBounds(bounds, { padding: 80, duration: 700 });
      }
    });

    li.addEventListener('mouseleave', () => {
      routeNames.forEach(name => {
        if (!activeRoutes.includes(name)) map.setPaintProperty(name + '-line', 'line-color', '#888');
      });

      if (activeRoutes.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        activeRoutes.forEach(name => {
          const coords = routes[name].features
            .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
          coords.forEach(c => bounds.extend(c));
        });
        map.fitBounds(bounds, { padding: 80, duration: 700 });
      } else {
        map.fitBounds(initialBounds, { padding: 80, duration: 700 });
      }
    });

    li.addEventListener('click', () => {
      listItems.forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      activeRoutes = routeNames;

      Object.keys(routes).forEach(name => map.setPaintProperty(name + '-line', 'line-color', '#888'));

      const bounds = new mapboxgl.LngLatBounds();
      routeNames.forEach(name => {
        map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
        const coords = routes[name].features
          .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
        coords.forEach(c => bounds.extend(c));
      });

      map.fitBounds(bounds, { padding: 80, duration: 700 });
    });
  });
});
