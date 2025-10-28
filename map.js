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

    // --- Pievieno visus maršrutus (vienmēr redzami, pelēki) ---
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
    let activeRoutes = []; // fiksēti (klikšķinātie maršruti)

    // Karte sākuma skatā
    map.fitBounds(initialBounds, { padding: 80 });

    listItems.forEach(li => {
        const routeNames = li.getAttribute('data-routes').split(',');

        // --- Hover efekts ---
        li.addEventListener('mouseenter', () => {
            // tikai ja nav aktīvs (klikšķināts)
            if (!li.classList.contains('active')) {
                routeNames.forEach(name => {
                    map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
                });

                // Pietuvina hover maršrutam
                const bounds = new mapboxgl.LngLatBounds();
                routeNames.forEach(name => {
                    const coords = routes[name].features
                        .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                    coords.forEach(c => bounds.extend(c));
                });

                map.fitBounds(bounds, { padding: 80, duration: 1000 });
            }
        });

        // --- Kad noņem kursoru ---
        li.addEventListener('mouseleave', () => {
            // ja maršruts nav aktīvais, atgriež krāsu uz pelēku
            routeNames.forEach(name => {
                if (!activeRoutes.includes(name)) {
                    map.setPaintProperty(name + '-line', 'line-color', '#888');
                }
            });

            // Ja ir aktīvs maršruts — atgriež skatījumu uz to
            if (activeRoutes.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                activeRoutes.forEach(name => {
                    const coords = routes[name].features
                        .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                    coords.forEach(c => bounds.extend(c));
                });
                map.fitBounds(bounds, { padding: 80, duration: 1000 });
            } else {
                // Ja nav neviena aktīva — atgriežas sākumā
                map.fitBounds(initialBounds, { padding: 80, duration: 1000 });
            }
        });

        // --- Klikšķis (fiksē maršrutu) ---
        li.addEventListener('click', () => {
            listItems.forEach(x => x.classList.remove('active'));
            li.classList.add('active');
            activeRoutes = routeNames;

            // Visi maršruti kļūst pelēki
            Object.keys(routes).forEach(name => {
                map.setPaintProperty(name + '-line', 'line-color', '#888');
            });

            // Aktīvie sarkani
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });

            // Pietuvina aktīvajam
            map.fitBounds(bounds, { padding: 80, duration: 1000 });
        });
    });
});
