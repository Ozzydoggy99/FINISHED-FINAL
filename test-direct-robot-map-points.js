const http = require('http');

const robot = {
    name: 'Rancho Mirage',
    publicIP: '47.180.91.99',
    privateIP: '192.168.4.31',
    serialNumber: 'L382502104987ir',
    secretKey: '667a51a4d948433081a272c78d10a8a4',
};

function get(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: robot.publicIP,
            port: 8090,
            path,
            method: 'GET',
            headers: {
                'APPCODE': robot.secretKey,
                'X-Public-IP': robot.publicIP,
                'X-Private-IP': robot.privateIP,
                'X-Serial-Number': robot.serialNumber,
                'X-Secret-Key': robot.secretKey
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Failed to parse JSON: ' + data));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

(async () => {
    try {
        const maps = await get('/maps/');
        console.log('Maps:', maps);
        for (const map of maps) {
            const mapDetail = await get(`/maps/${map.id}`);
            console.log(`\nMap: ${map.map_name} (id: ${map.id})`);
            if (mapDetail.overlays) {
                let overlays;
                try {
                    overlays = typeof mapDetail.overlays === 'string' ? JSON.parse(mapDetail.overlays) : mapDetail.overlays;
                } catch (e) {
                    console.error('Failed to parse overlays:', mapDetail.overlays);
                    continue;
                }
                if (overlays.features && overlays.features.length > 0) {
                    for (const feature of overlays.features) {
                        console.log('Feature:', feature.id || '[unnamed]');
                        console.log('  Name:', feature.properties?.name || '[unnamed]');
                        console.log('  Raw Properties:', JSON.stringify(feature.properties));
                        console.log('  Type:', feature.geometry.type);
                        console.log('  Coordinates:', JSON.stringify(feature.geometry.coordinates));
                    }
                } else {
                    console.log('  No features found in overlays.');
                }
            } else {
                console.log('  No overlays found for this map.');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
})(); 