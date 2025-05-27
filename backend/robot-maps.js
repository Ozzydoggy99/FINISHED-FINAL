const http = require('http');

const robots = [
    {
        name: 'Rancho Mirage',
        publicIP: '47.180.91.99',
        privateIP: '192.168.4.31',
        serialNumber: 'L382502104987ir',
        secretKey: '667a51a4d948433081a272c78d10a8a4'
    }
    // Add more robots here
];

function get(path, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: headers.hostname,
            port: 8090,
            path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'APPCODE': headers['APPCODE'],
                'X-Public-IP': headers['X-Public-IP'],
                'X-Private-IP': headers['X-Private-IP'],
                'X-Serial-Number': headers['X-Serial-Number'],
                'X-Secret-Key': headers['X-Secret-Key']
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

async function getRobotMaps(robot) {
    console.log(`Fetching maps for robot ${robot.serialNumber}...`);
    const maps = await get('/maps/', {
        hostname: robot.publicIP,
        'APPCODE': robot.secretKey,
        'X-Public-IP': robot.publicIP,
        'X-Private-IP': robot.privateIP,
        'X-Serial-Number': robot.serialNumber,
        'X-Secret-Key': robot.secretKey
    });
    console.log(`Found ${maps.length} maps for robot ${robot.serialNumber}`);
    const mapDetails = [];
    for (const map of maps) {
        console.log(`Fetching details for map ${map.id} (${map.map_name})...`);
        const mapDetail = await get(`/maps/${map.id}`, {
            hostname: robot.publicIP,
            'APPCODE': robot.secretKey,
            'X-Public-IP': robot.publicIP,
            'X-Private-IP': robot.privateIP,
            'X-Serial-Number': robot.serialNumber,
            'X-Secret-Key': robot.secretKey
        });
        let overlays;
        try {
            overlays = typeof mapDetail.overlays === 'string' ? JSON.parse(mapDetail.overlays) : mapDetail.overlays;
            console.log(`Successfully parsed overlays for map ${map.id}`);
        } catch (e) {
            console.error(`Failed to parse overlays for map ${map.id}:`, mapDetail.overlays);
            continue;
        }
        const features = overlays.features || [];
        console.log(`Found ${features.length} features in map ${map.id}`);
        mapDetails.push({
            id: map.id,
            uid: map.uid,
            map_name: map.map_name,
            create_time: map.create_time,
            map_version: map.map_version,
            overlays_version: map.overlays_version,
            thumbnail_url: map.thumbnail_url,
            image_url: map.image_url,
            url: map.url,
            features: features.map(feature => ({
                id: feature.id || '[unnamed]',
                name: feature.properties?.name || '[unnamed]',
                raw_properties: feature.properties,
                type: feature.geometry.type,
                coordinates: feature.geometry.coordinates
            }))
        });
    }
    return mapDetails;
}

async function fetchAllRobotMaps() {
    console.log('Starting to fetch all robot maps...');
    const robotMaps = [];
    for (const robot of robots) {
        console.log(`Processing robot ${robot.serialNumber}...`);
        const maps = await getRobotMaps(robot);
        robotMaps.push({
            robot: {
                name: robot.name,
                publicIP: robot.publicIP,
                privateIP: robot.privateIP,
                serialNumber: robot.serialNumber
            },
            maps: maps
        });
    }
    console.log(`Completed fetching maps for ${robotMaps.length} robots`);
    return robotMaps;
}

// Example usage
let robotMapsData = null;

async function updateRobotMaps() {
    try {
        console.log('Updating robot maps...');
        robotMapsData = await fetchAllRobotMaps();
        console.log('Robot maps updated successfully:', new Date().toISOString());
        console.log('Current robotMapsData:', JSON.stringify(robotMapsData, null, 2));
    } catch (err) {
        console.error('Error updating robot maps:', err);
    }
}

// Initial fetch
updateRobotMaps();

// Fetch every 30 seconds
setInterval(updateRobotMaps, 30000);

module.exports = {
    getRobotMapsData: () => robotMapsData
}; 