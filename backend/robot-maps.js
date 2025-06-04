const http = require('http');
const db = require('../db');

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
    try {
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
            try {
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
            } catch (err) {
                console.error(`Error fetching details for map ${map.id}:`, err);
            }
    }
    return mapDetails;
    } catch (err) {
        console.error(`Error fetching maps for robot ${robot.serialNumber}:`, err);
        return [];
    }
}

// Example usage
let robotMapsData = null;

async function updateRobotMaps() {
    try {
        console.log('Updating robot maps...');
        robotMapsData = await fetchAllRobotMaps();
        console.log('Robot maps updated successfully:', new Date().toISOString());
        console.log('Current robotMapsData:', JSON.stringify(robotMapsData, null, 2));

        // Store maps in the database
        for (const robot of robotMapsData) {
            const serialNumber = robot.robot.serialNumber;
            // Delete existing maps for this robot
            await db.query('DELETE FROM maps WHERE robot_serial_number = $1', [serialNumber]);
            for (const map of robot.maps) {
                await db.query(
                    `INSERT INTO maps (
                        robot_serial_number, map_name, features, uid, create_time, map_version, overlays_version, thumbnail_url, image_url, url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        serialNumber,
                        map.map_name,
                        JSON.stringify(map.features),
                        map.uid,
                        map.create_time,
                        map.map_version,
                        map.overlays_version,
                        map.thumbnail_url,
                        map.image_url,
                        map.url
                    ]
                );
            }
        }
    } catch (err) {
        console.error('Error updating robot maps:', err);
    }
}

// Initial fetch
updateRobotMaps();

// Fetch every 30 seconds
setInterval(updateRobotMaps, 30000);

module.exports = {
    getRobotMaps
}; 