mapboxgl.accessToken = 'pk.eyJ1IjoibGFic3NsaWt0YWlzIiwiYSI6ImNtaDN1emw1bDFqajQya3I0eHExZXc3ZjQifQ.PPp7glCUko7555V_-6ei3A'; // ← Ievieto savu Mapbox API token

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [27.05, 57.21],
    zoom: 11
});

// Kad karte ir ielādēta
map.on('load', () => {
    const routes = window._ROUTES_GEOJSON;

    // Pievieno katru maršrutu kā slāni
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

    // Hover efekts
    Object.keys(routes).forEach((routeName) => {
        const lineId = routeName + '-line';

        map.on('mouseenter', lineId, () => {
            map.setPaintProperty(lineId, 'line-color', '#ff0000');
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', lineId, () => {
            map.setPaintProperty(lineId, 'line-color', '#888');
            map.getCanvas().style.cursor = '';
        });
    });

    // Izvēlnes funkcionalitāte
    const listItems = document.querySelectorAll('#routeList li');
    listItems.forEach(li => {
        li.addEventListener('click', () => {
            const selected = li.getAttribute('data-routes').split(',');
            const bounds = new mapboxgl.LngLatBounds();

            // Slēpj visus maršrutus
            Object.keys(routes).forEach(routeName => {
                map.setLayoutProperty(routeName + '-line', 'visibility', 'none');
                map.setLayoutProperty(routeName + '-points', 'visibility', 'none');
            });

            // Rāda atlasītos
            selected.forEach(name => {
                map.setLayoutProperty(name + '-line', 'visibility', 'visible');
                map.setLayoutProperty(name + '-points', 'visibility', 'visible');

                // Atjauno robežas
                const coords = routes[name].features
                    .flatMap(f => (f.geometry.type === 'LineString' ? f.geometry.coordinates : [f.geometry.coordinates]));
                coords.forEach(c => bounds.extend(c));
            });

            map.fitBounds(bounds, { padding: 80, duration: 1000 });
        });
    });
});
