
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [27,57.17],
    zoom: 10
});

const routes = {
    guldupe: [[27,57.17],[27.01,57.18]],
    tilts: [[27,57.17],[27.02,57.16]],
    baze: [[27,57.17],[27.01,57.15]]
};

let activeRoute = 'guldupe';
function drawRoute(routeName){
    if(window.currentLine) window.currentLine.remove();
    const coords = routes[routeName].map(c=>[c[0],c[1]]);
    window.currentLine = new mapboxgl.LineString({coordinates:coords});
    // Simple GeoJSON layer
    map.addSource('route', { type:'geojson', data:{type:'Feature', geometry:{type:'LineString', coordinates:coords}} });
    if(map.getLayer('routeLayer')) map.removeLayer('routeLayer');
    map.addLayer({id:'routeLayer', type:'line', source:'route', layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#FF0000','line-width':4}});
}

document.querySelectorAll('.route-item').forEach(item=>{
    item.addEventListener('click',()=>{
        activeRoute=item.dataset.route;
        drawRoute(activeRoute);
    });
});

// Init first routes
drawRoute(activeRoute);
