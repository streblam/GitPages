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
    let activeRoutes = []; // aktīvie (klikšķinātie) maršruti

    listItems.forEach(li => {
        const routeNames = li.getAttribute('data-routes').split(',');

        // --- Hover efekts ---
        li.addEventListener('mouseenter', () => {
            // ja šis nav aktīvs vienums, parāda pagaidu efektu
            if (!li.classList.contains('active')) {
                routeNames.forEach(name => {
                    map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                    map.setLayoutProperty(name + '-points', 'visibility', 'visible');
                    map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
                });

                // Aprēķina robežas un pietuvina
                const bounds = new mapboxgl.LngLatBounds();
                routeNames.forEach(name => {
                    const coords = routes[name].features
                        .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                    coords.forEach(c => bounds.extend(c));
                });
                map.fitBounds(bounds, { padding: 80, duration: 600 });
            }
        });

        // --- Kad pele tiek noņemta ---
        li.addEventListener('mouseleave', () => {
            // tikai ja šis nav aktīvais vienums
            if (!li.classList.contains('active')) {
                routeNames.forEach(name => {
                    // tikai noņem hover efektu, bet neatceļ aktīvos
                    if (!activeRoutes.includes(name)) {
                        map.setPaintProperty(name + '-line', 'line-color', '#888');
                        map.setLayoutProperty(name + '-line', 'visibility', 'none');
                        map.setLayoutProperty(name + '-points', 'visibility', 'none');
                    }
                });

                // ja ir aktīvi maršruti — atgriež skatījumu uz tiem,
                // ja nav — atgriežas sākuma skatā
                if (activeRoutes.length > 0) {
                    const bounds = new mapboxgl.LngLatBounds();
                    activeRoutes.forEach(name => {
                        const coords = routes[name].features
                            .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                        coords.forEach(c => bounds.extend(c));
                    });
                    map.fitBounds(bounds, { padding: 80, duration: 600 });
                } else {
                    map.fitBounds(initialBounds, { padding: 80, duration: 600 });
                }
            }
        });

        // --- Klikšķis uz izvēlnes ---
        li.addEventListener('click', () => {
            listItems.forEach(x => x.classList.remove('active'));
            li.classList.add('active');
            activeRoutes = routeNames;

            // Paslēpj visus
            Object.keys(routes).forEach(routeName => {
                map.setLayoutProperty(routeName + '-line', 'visibility', 'none');
                map.setLayoutProperty(routeName + '-points', 'visibility', 'none');
                map.setPaintProperty(routeName + '-line', 'line-color', '#888');
            });

            // Parāda aktīvos maršrutus
            const bounds = new mapboxgl.LngLatBounds();
            routeNames.forEach(name => {
                map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                map.setLayoutProperty(name + '-points', 'visibility', 'visible');
                map.setPaintProperty(name + '-line', 'line-color', '#ff0000');

                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });

            map.fitBounds(bounds, { padding: 80, duration: 800 });
        });
    });
});
