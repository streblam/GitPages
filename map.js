mapboxgl.accessToken = 'pk.eyJ1IjoibGFic3NsaWt0YWlzIiwiYSI6ImNtaDN1emw1bDFqajQya3I0eHExZXc3ZjQifQ.PPp7glCUko7555V_-6ei3A';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [27.05, 57.21],
    zoom: 11
});

map.on('load', () => {
    const routes = window._ROUTES_GEOJSON;

    // --- Pievieno visus maršrutus vienlaicīgi ---
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
    let activeRoutes = []; // pašlaik izvēlētie maršruti
    let lastViewBounds = new mapboxgl.LngLatBounds();

    listItems.forEach(li => {
        const routeNames = li.getAttribute('data-routes').split(',');

        // --- Hover efekts ---
        li.addEventListener('mouseenter', () => {
            routeNames.forEach(name => {
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
            });

            // Zoom tikai uz hoverētajiem
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });
            lastViewBounds = map.getBounds(); // saglabā iepriekšējo skatījumu
            map.fitBounds(bounds, { padding: 80, duration: 600 });
        });

        // --- Noņem kursoru ---
        li.addEventListener('mouseleave', () => {
            // tikai ja nav aktīvs — atgriež pelēku
            routeNames.forEach(name => {
                if (!activeRoutes.includes(name)) {
                    map.setPaintProperty(name + '-line', 'line-color', '#888');
                }
            });
            // atgriež skatījumu
            map.fitBounds(lastViewBounds, { padding: 80, duration: 600 });
        });

        // --- Klikšķis (fiksē maršrutu) ---
        li.addEventListener('click', () => {
            // notīra aktīvos maršrutus
            listItems.forEach(x => x.classList.remove('active'));
            li.classList.add('active');
            activeRoutes = routeNames;

            // visi pelēki
            Object.keys(routes).forEach(name => {
                map.setPaintProperty(name + '-line', 'line-color', '#888');
            });

            // izvēlētie sarkani
            routeNames.forEach(name => {
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
            });

            // pietuvina izvēlētajiem
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });
            map.fitBounds(bounds, { padding: 80, duration: 800 });
        });
    });
});
