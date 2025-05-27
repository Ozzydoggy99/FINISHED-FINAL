const WebSocket = require('ws');
const MapManager = require('../core/MapManager');

// Initialize the map manager
const mapManager = new MapManager();

// Set up event listeners
mapManager.on('mapUpdated', ({ robotId, mapData }) => {
    console.log('\n=== Map Update ===');
    console.log(`Robot ID: ${robotId}`);
    console.log('Map Details:', {
        resolution: mapData.resolution,
        size: mapData.size,
        origin: mapData.origin
    });
});

mapManager.on('pointsUpdated', ({ robotId, points }) => {
    console.log('\n=== Points Update ===');
    console.log(`Robot ID: ${robotId}`);
    console.log('Points:', points.map(point => ({
        name: point.name,
        type: point.type,
        coordinates: point.coordinates,
        orientation: point.orientation
    })));
});

mapManager.on('pointAdded', ({ robotId, point }) => {
    console.log(`Point added for robot ${robotId}:`, point);
});

mapManager.on('pointRemoved', ({ robotId, pointId }) => {
    console.log(`Point removed for robot ${robotId}: ${pointId}`);
});

// Example WebSocket connection
function connectToRobot(robotId, ip, port) {
    console.log(`\nAttempting to connect to robot at ws://${ip}:${port}/ws/v2/topics`);
    
    const ws = new WebSocket(`ws://${ip}:${port}/ws/v2/topics`, {
        handshakeTimeout: 10000, // 10 second timeout
        timeout: 10000
    });

    ws.on('open', () => {
        console.log(`\nConnected to robot ${robotId}`);
        
        // Subscribe to map updates
        const subscribeMessage = {
            enable_topic: ['/map']
        };
        console.log('Sending subscription message:', JSON.stringify(subscribeMessage));
        ws.send(JSON.stringify(subscribeMessage));

        // Request map data
        const mapRequest = {
            type: 'get_map_data',
            id: Date.now().toString()
        };
        console.log('Sending map data request:', JSON.stringify(mapRequest));
        ws.send(JSON.stringify(mapRequest));
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('\nReceived message:', JSON.stringify(message, null, 2));
            
            if (message.topic === '/map') {
                console.log('Processing map data...');
                mapManager.handleMapData(robotId, message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            console.error('Raw message data:', data.toString());
        }
    });

    ws.on('error', (error) => {
        console.error(`\nWebSocket error for robot ${robotId}:`, error.message);
        console.error('Error details:', error);
    });

    ws.on('close', (code, reason) => {
        console.log(`\nConnection closed for robot ${robotId}`);
        console.log('Close code:', code);
        console.log('Close reason:', reason.toString());
    });

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
            console.error('\nConnection timeout - could not establish WebSocket connection');
            ws.terminate();
        }
    }, 15000);

    ws.on('open', () => {
        clearTimeout(connectionTimeout);
    });

    return ws;
}

// Example usage
async function main() {
    try {
        // Connect to a robot
        const robotId = 'L382502104987ir';
        const ws = connectToRobot(robotId, '192.168.4.31', 8090);

        // Wait for map data to be available with timeout
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for map data'));
            }, 30000);

            const checkMapData = () => {
                const mapData = mapManager.getRobotMapData(robotId);
                if (mapData) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkMapData, 1000);
                }
            };
            checkMapData();
        });

        // Get all points for the robot
        const points = mapManager.getRobotPoints(robotId);
        console.log('\n=== Current Points ===');
        console.log('Points:', points.map(point => ({
            name: point.name,
            type: point.type,
            coordinates: point.coordinates,
            orientation: point.orientation
        })));

        // Print map ID, map name, and each point's numeric string ID and name
        const mapData = mapManager.getRobotMapData(robotId);
        if (mapData) {
            console.log('\n--- MAP AND POINT IDS AND NAMES ---');
            console.log('Map ID:', mapData.id || robotId);
            console.log('Map Name:', mapData.name);
            points.forEach(point => {
                console.log(`Point Numeric String ID: ${point.id}, Name: ${point.name}`);
            });
        } else {
            console.log('No map data found for robot', robotId);
        }

    } catch (error) {
        console.error('\nError in main:', error);
        process.exit(1);
    }
}

// Run the example
console.log('Starting map data retrieval...');
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 