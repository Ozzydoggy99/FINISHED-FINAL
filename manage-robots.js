const RobotMapManager = require('./robot-map-manager');

// Create a manager with 30-second update interval
const manager = new RobotMapManager(30000);

// Example robot configurations
const robotConfigs = [
    {
        serialNumber: 'L382502104987ir',
        publicIp: '47.180.91.99',
        localIp: '192.168.4.31',
        secret: '667a51a4d948433081a272c78d10a8a4'
    }
    // Add more robots here as needed
];

// Add all robots to the manager
robotConfigs.forEach(config => {
    manager.addRobot(
        config.serialNumber,
        config.publicIp,
        config.localIp,
        config.secret
    );
});

// Start automatic updates
console.log('Starting robot map manager...');
manager.startUpdates();

// Function to display robot status
function displayRobotStatus() {
    const status = manager.getRobotsStatus();
    console.log('\nRobot Status:');
    console.log('=============');
    status.forEach(robot => {
        console.log(`\nRobot: ${robot.serialNumber}`);
        console.log(`Last Update: ${robot.lastUpdate}`);
        console.log(`Error: ${robot.error || 'None'}`);
        console.log(`Map Count: ${robot.mapCount}`);
        if (robot.currentMap) {
            console.log(`Current Map: ${robot.currentMap.name} (ID: ${robot.currentMap.id})`);
        }
    });
}

// Function to display map points
async function displayMapPoints(serialNumber, mapId) {
    try {
        const points = manager.getRobotMapPoints(serialNumber, mapId);
        console.log(`\nPoints for Robot ${serialNumber}, Map ${mapId}:`);
        console.log('=====================================');
        points.forEach(point => {
            console.log(`\nPoint: ${point.name || 'Unnamed'}`);
            console.log(`ID: ${point.id}`);
            console.log(`Type: ${point.type}`);
            if (point.coordinates) {
                const [x, y, z = 0] = point.coordinates;
                console.log(`Coordinates: x=${x.toFixed(3)}, y=${y.toFixed(3)}, z=${z.toFixed(3)}`);
            }
            if (point.properties) {
                console.log('Properties:');
                Object.entries(point.properties).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        console.log(`  ${key}: ${value}`);
                    }
                });
            }
        });
    } catch (error) {
        console.error(`Error displaying points: ${error.message}`);
    }
}

// Display initial status
displayRobotStatus();

// Set up periodic status display
setInterval(() => {
    displayRobotStatus();
}, 60000); // Display status every minute

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nStopping robot map manager...');
    manager.stopUpdates();
    process.exit(0);
});

// Example of how to get specific point information
setTimeout(async () => {
    try {
        const robot = robotConfigs[0];
        const maps = manager.getRobotMaps(robot.serialNumber);
        if (maps.length > 0) {
            const currentMap = maps.find(map => map.isCurrent);
            if (currentMap) {
                await displayMapPoints(robot.serialNumber, currentMap.id);
            }
        }
    } catch (error) {
        console.error('Error in example point display:', error);
    }
}, 5000); // Wait 5 seconds for initial data to load 