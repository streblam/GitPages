
(function(){
    let map;
    let activeRoute = 'guldupe';
    const polylines = {};

    function init(){
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat:57.17,lng:27},
            zoom:10,
            mapTypeId:'terrain'
        });
        const globals = window._ROUTES_GEOJSON || {};
        const defaultColors = { guldupe:'#FF0000', tilts:'#0000FF', baze:'#00FF00' };

        // Create polylines from routes (dummy coordinates)
        polylines.guldupe = new google.maps.Polyline({path:[{lat:57.17,lng:27},{lat:57.18,lng:27.01}], strokeColor: defaultColors.guldupe, strokeWeight:5, map:map});
        polylines.tilts = new google.maps.Polyline({path:[{lat:57.17,lng:27},{lat:57.16,lng:27.02}], strokeColor: defaultColors.tilts, strokeWeight:5, map:map});
        polylines.baze = new google.maps.Polyline({path:[{lat:57.17,lng:27},{lat:57.15,lng:27.01}], strokeColor: defaultColors.baze, strokeWeight:5, map:map});

        document.querySelectorAll('.route-item').forEach(item=>{
            const key=item.dataset.route;
            item.addEventListener('click',()=>{
                activeRoute=key;
                for(const k in polylines){ polylines[k].setMap(null); }
                polylines[activeRoute].setMap(map);
            });
        });
    }
    window.addEventListener('load',init);
})();
