mapboxgl.accessToken = 'pk.eyJ1IjoibGFic3NsaWt0YWlzIiwiYSI6ImNtaDN1emw1bDFqajQya3I0eHExZXc3ZjQifQ.PPp7glCUko7555V_-6ei3A';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [27.10, 57.31],
    zoom: 9
});

map.on('load', () => {
    const routes = window._ROUTES_GEOJSON;

    // --- Sākuma robežas ---
    const initialBounds = new mapboxgl.LngLatBounds();
    Object.values(routes).forEach(geojson => {
        geojson.features.forEach(f => {
            const coords = f.geometry.type === 'LineString'
                ? f.geometry.coordinates
                : [f.geometry.coordinates];
            coords.forEach(c => initialBounds.extend(c));
        });
    });

    // --- Izveido slāņus ---
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

    // --- Izvēlne ---
    const listItems = document.querySelectorAll('#routeList li');
    let activeRoutes = []; // pašlaik izvēlētie maršruti

    listItems.forEach(li => {
        const routeNames = li.getAttribute('data-routes').split(',');

        // --- Hover efekts uz izvēlnes ---
        li.addEventListener('mouseenter', () => {
            // Ja šī opcija nav klikšķināta, parāda to pagaidu režīmā
            if (!li.classList.contains('active')) {
                // Maršruti redzami un sarkani
                routeNames.forEach(name => {
                    map.setPaintProperty(name + '-line', 'line-color', '#ff0000');
                    map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                    map.setLayoutProperty(name + '-points', 'visibility', 'visible');
                });

                // Aprēķina robežas
                const bounds = new mapboxgl.LngLatBounds();
                routeNames.forEach(name => {
                    const coords = routes[name].features
                        .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                    coords.forEach(c => bounds.extend(c));
                });

                map.fitBounds(bounds, { padding: 80, duration: 600 });
            }
        });

        // --- Kad kursoru noņem no izvēlnes ---
        li.addEventListener('mouseleave', () => {
            if (!li.classList.contains('active')) {
                // Atgriež sākotnējo stāvokli
                routeNames.forEach(name => {
                    map.setPaintProperty(name + '-line', 'line-color', '#888');
                    map.setLayoutProperty(name + '-line', 'visibility', 'none');
                    map.setLayoutProperty(name + '-points', 'visibility', 'none');
                });
                map.fitBounds(initialBounds, { padding: 80, duration: 600 });
            }
        });

        // --- Klikšķis uz izvēlnes (fiksē maršrutu) ---
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

            // Parāda izvēlētos sarkanā krāsā
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
