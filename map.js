/*
map.js
- Hover: glow tikai hoveram vai aktīvajam
- Click: saglabā aktīvo maršrutu un izceļ sarakstā
*/

(function(){
    let map;
    const polylines = {};
    let activeRoute = 'guldupe'; // noklusētais aktīvais

    function toLatLngArrayFromGeoJSON(geojson) {
        const coords = [];
        if(!geojson) return coords;
        const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
        features.forEach(f => {
            if(!f.geometry) return;
            if(f.geometry.type === 'LineString') {
                f.geometry.coordinates.forEach(c => coords.push({lat: c[1], lng: c[0]}));
            } else if(f.geometry.type === 'MultiLineString') {
                f.geometry.coordinates.forEach(line => line.forEach(c => coords.push({lat: c[1], lng: c[0]})));
            }
        });
        return coords;
    }

    function makePolyline(path, color) {
        const glow = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.3,
            strokeWeight: 10
        });

        const line = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 1,
            strokeWeight: 5
        });

        return { line, glow, color };
    }

    function concatPaths(...paths) {
        const out = [];
        paths.forEach(p => { if(p && p.length) out.push(...p); });
        return out;
    }

    function fitMapToPath(path) {
        if(!path || !path.length) return;
        const bounds = new google.maps.LatLngBounds();
        path.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds);
    }

    function init() {
        const globals = window._ROUTES_GEOJSON || {};
        const colors = globals.ROUTE_COLORS || {};

        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 57.17, lng: 27.00 },
            zoom: 10,
            mapTypeId: 'terrain'
        });

        const p1 = toLatLngArrayFromGeoJSON(globals.guldupeGeoJSON);
        const p2 = toLatLngArrayFromGeoJSON(globals.tiltsGeoJSON);
        const p3 = toLatLngArrayFromGeoJSON(globals.bazeGeoJSON);

        const defaultColors = {
            guldupe: '#FF0000',
            tilts: '#0000FF',
            baze: '#00FF00',
            comboA: '#FF4500',
            comboB: '#00CED1',
            comboC: '#FFD700'
        };

        // Polylines
        polylines.guldupe = makePolyline(p1, colors.guldupe || defaultColors.guldupe);
        polylines.tilts = makePolyline(p2, colors.tilts || defaultColors.tilts);
        polylines.baze = makePolyline(p3, colors.baze || defaultColors.baze);
        polylines.guldupe_tilts = makePolyline(concatPaths(p1,p2), colors.comboA || defaultColors.comboA);
        polylines.tilts_baze = makePolyline(concatPaths(p2,p3), colors.comboB || defaultColors.comboB);
        polylines.guldupe_tilts_baze = makePolyline(concatPaths(p1,p2,p3), colors.comboC || defaultColors.comboC);

        showOnly(activeRoute, false);
        updateActiveRouteUI(activeRoute);

        document.querySelectorAll('.route-item').forEach(item => {
            const key = item.dataset.route;

            item.addEventListener('mouseenter', () => showOnly(key, true));
            item.addEventListener('mouseleave', () => showOnly(activeRoute, false));
            item.addEventListener('click', () => {
                activeRoute = key;
                showOnly(activeRoute, false);
                updateActiveRouteUI(activeRoute);
            });
        });
    }

    function setPolylineShown(polyObj, shown, highlight) {
        if(!polyObj) return;

        if(shown) {
            polyObj.line.setMap(map);
            polyObj.glow.setMap(map);
            polyObj.line.setOptions({
                strokeOpacity: highlight ? 1 : 0.9,
                strokeWeight: highlight ? 8 : 5
            });
            polyObj.glow.setOptions({
                strokeOpacity: highlight ? 0.4 : 0.3,
                strokeWeight: highlight ? 14 : 10
            });
        } else {
            polyObj.line.setMap(map);
            polyObj.line.setOptions({
                strokeOpacity: 0.15,
                strokeWeight: 5
            });
            polyObj.glow.setMap(null);
        }
    }

    function showOnly(key, highlight) {
        for(const k in polylines) {
            if(k === key) {
                setPolylineShown(polylines[k], true, highlight);
            } else {
                setPolylineShown(polylines[k], false, false);
            }
        }

        if(polylines[key]) fitMapToPath(polylines[key].line.getPath().getArray());
    }

    function updateActiveRouteUI(key) {
        document.querySelectorAll('.route-item').forEach(item => {
            if(item.dataset.route === key) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    window.addEventListener('load', init);
})();
