const { RobotConfig, AutoXingRobot } = require('./robot-interface.js');

const robotConfig = new RobotConfig(
    'L382502104987ir',
    '47.180.91.99',
    '192.168.4.31',
    '667a51a4d948433081a272c78d10a8a4'
);

const robot = new AutoXingRobot(robotConfig);

async function getRobotMapInfo() {
    try {
        // Connect to robot
        console.log('Connecting to robot...');
        await robot.connect();
        
        // Get all maps
        console.log('\nFetching available maps...');
        const maps = await robot.getMaps();
        console.log('\nAvailable Maps:');
        console.log('---------------');
        if (maps && maps.length > 0) {
            maps.forEach(map => {
                console.log(`Map ID: ${map.id}`);
                console.log(`Map Name: ${map.map_name}`);
                console.log(`Map UID: ${map.uid}`);
                console.log('---------------');
            });
        } else {
            console.log('No maps found');
        }

        // Get current map
        console.log('\nFetching current map...');
        const currentMap = await robot.getCurrentMap();
        console.log('\nCurrent Map:');
        console.log('------------');
        if (currentMap) {
            console.log(`Map ID: ${currentMap.id}`);
            console.log(`Map Name: ${currentMap.map_name}`);
            console.log(`Map UID: ${currentMap.uid}`);
            console.log('------------');

            // Get points for current map
            console.log('\nFetching map points...');
            try {
                const points = await robot.getMapPoints(currentMap.id);
                console.log('\nMap Points:');
                console.log('------------');
                if (points && points.length > 0) {
                    points.forEach(point => {
                        console.log(`Point ID: ${point.id}`);
                        console.log(`Point Type: ${point.type}`);
                        if (point.name) console.log(`Name: ${point.name}`);
                        
                        // Display coordinates
                        if (point.coordinates && Array.isArray(point.coordinates)) {
                            const [x, y, z = 0] = point.coordinates;
                            console.log(`Coordinates: x=${x.toFixed(3)}, y=${y.toFixed(3)}, z=${z.toFixed(3)}`);
                        }

                        // Display type-specific properties
                        if (point.properties) {
                            console.log('Properties:');
                            if (point.properties.landmarkId) console.log(`  Landmark ID: ${point.properties.landmarkId}`);
                            if (point.properties.yaw) console.log(`  Yaw: ${point.properties.yaw}`);
                            if (point.properties.deviceIds) console.log(`  Device IDs: ${point.properties.deviceIds.join(', ')}`);
                            if (point.properties.dockingPointId) console.log(`  Docking Point ID: ${point.properties.dockingPointId}`);
                            if (point.properties.barcodeId) console.log(`  Barcode ID: ${point.properties.barcodeId}`);
                            
                            // Display any other properties
                            Object.entries(point.properties).forEach(([key, value]) => {
                                if (!['name', 'type', 'landmarkId', 'yaw', 'deviceIds', 'dockingPointId', 'barcodeId'].includes(key)) {
                                    console.log(`  ${key}: ${value}`);
                                }
                            });
                        }
                        
                        console.log('------------');
                    });
                } else {
                    console.log('No points found in current map');
                }
            } catch (error) {
                console.error('Error fetching points:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    response: error.response ? {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        headers: error.response.headers,
                        data: error.response.data
                    } : 'No response object'
                });
            }
        } else {
            console.log('No current map set');
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data
            } : 'No response object'
        });
    }
}

getRobotMapInfo(); 