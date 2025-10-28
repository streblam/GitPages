mapboxgl.accessToken = 'pk.eyJ1IjoibGFic3NsaWt0YWlzIiwiYSI6ImNtaDN1emw1bDFqajQya3I0eHExZXc3ZjQifQ.PPp7glCUko7555V_-6ei3A';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [27.05, 57.21],
    zoom: 11
});

map.on('load', () => {
    const routes = window._ROUTES_GEOJSON;

    // --- Sākotnējās robežas ---
    const initialBounds = new mapboxgl.LngLatBounds();
    Object.values(routes).forEach(geojson => {
        geojson.features.forEach(f => {
            const coords = f.geometry.type === 'LineString'
                ? f.geometry.coordinates
                : [f.geometry.coordinates];
            coords.forEach(c => initialBounds.extend(c));
        });
    });

    // --- Pievieno visus maršrutus ---
    for (const [name, geojson] of Object.entries(routes)) {
        map.addSource(name, { type: 'geojson', data: geojson });

        map.addLayer({
            id: name + '-line',
            type: 'line',
            source: name,
            paint: {
                'line-color': '#888',
                'line-width': 4
            }
        });

        map.addLayer({
            id: name + '-points',
            type: 'circle',
            source: name,
            paint: {
                'circle-radius': 4,
                'circle-color': '#888'
            },
            filter: ['==', '$type', 'Point']
        });
    }

    // --- Izvēlnes loģika ---
    const listItems = document.querySelectorAll('#routeList li');
    let activeRoutes = []; // pašlaik klikšķinātie maršruti
    let lastViewBounds = initialBounds; // lai atceras pēdējo kartes skatījumu

    listItems.forEach(li => {
        const routeNames = li.getAttribute('data-routes').split(',');

        // --- Hover efekts ---
        li.addEventListener('mouseenter', () => {
            // iekrāso hover maršrutu
            routeNames.forEach(name => {
                map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                map.setLayoutProperty(name + '-points', 'visibility', 'visible');
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
            });

            // Pietuvina hover maršrutam
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });
            lastViewBounds = map.getBounds(); // saglabā pirms-zoom skatījumu
            map.fitBounds(bounds, { padding: 80, duration: 600 });
        });

        // --- Kad noņem kursoru ---
        li.addEventListener('mouseleave', () => {
            // ja šis maršruts nav aktīvais, atgriež krāsu
            routeNames.forEach(name => {
                if (!activeRoutes.includes(name)) {
                    map.setPaintProperty(name + '-line', 'line-color', '#888');
                }
            });

            // Atgriež karti iepriekšējā skatā (nepaslēpj neko)
            map.fitBounds(lastViewBounds, { padding: 80, duration: 600 });
        });

        // --- Klikšķis uz izvēlnes ---
        li.addEventListener('click', () => {
            listItems.forEach(x => x.classList.remove('active'));
            li.classList.add('active');
            activeRoutes = routeNames;

            // Visus pārējos pelēkus
            Object.keys(routes).forEach(routeName => {
                map.setPaintProperty(routeName + '-line', 'line-color', '#888');
            });

            // Aktīvos — sarkanus un redzamus
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                map.setLayoutProperty(name + '-points', 'visibility', 'visible');
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');

                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });

            lastViewBounds = bounds;
            map.fitBounds(bounds, { padding: 80, duration: 800 });
        });
    });
});
