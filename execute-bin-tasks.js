const RobotConfig = require('./robot-config.js');
const AutoXingRobot = require('./robot-interface.js');
const RobotMapManager = require('./robot-map-manager.js');
const TaskTemplate = require('./robot-task-templates.js');

// Create robot configuration with correct serial number
const config = new RobotConfig({
    serialNumber: 'L382502104987ir'
});

// Create robot and managers
const robot = new AutoXingRobot(config);
const mapManager = new RobotMapManager();
const taskTemplate = new TaskTemplate(robot, mapManager);

// Add robot to map manager
mapManager.addRobot(robot);

async function setupRobot() {
    try {
        // Connect to robot - this will automatically use the correct IPs and authentication
        await robot.connect();
        console.log('Connected to robot:', robot.config.serialNumber);
        console.log('Using IPs:', {
            publicIp: robot.config.publicIp,
            localIp: robot.config.localIp
        });

        // Start map updates
        await mapManager.startUpdates();
        console.log('Started map updates');

        // Set up WebSocket message handling
        robot.onWebSocketMessage((data) => {
            if (data.topic === 'robot_state') {
                console.log('Robot state:', data.message);
            }
        });
    } catch (error) {
        console.error('Error setting up robot:', error);
        throw error;
    }
}

async function displayAvailablePoints() {
    try {
        // Get available central points
        const centralPoints = await taskTemplate.getAvailableCentralPoints();
        console.log('\nAvailable Central Points:');
        console.log('Dropoff Points (001-049):', centralPoints.dropoff.map(p => p.name).join(', '));
        console.log('Pickup Points (050-099):', centralPoints.pickup.map(p => p.name).join(', '));

        // Get available shelf points for each floor
        for (let floor = 1; floor <= 9; floor++) {
            try {
                const shelfPoints = await taskTemplate.getAvailableShelfPoints(floor);
                if (shelfPoints.length > 0) {
                    console.log(`\nFloor ${floor} Shelf Points:`, shelfPoints.map(p => p.name).join(', '));
                }
            } catch (error) {
                // Skip floors that don't exist
                continue;
            }
        }
    } catch (error) {
        console.error('Error displaying available points:', error);
    }
}

async function executeBinPickupTask(shelfPoint, centralDropoff) {
    try {
        console.log(`\nExecuting bin pickup task:`);
        console.log(`From shelf point: ${shelfPoint}`);
        console.log(`To central dropoff: ${centralDropoff}`);

        // Create and execute the task
        const task = await taskTemplate.createBinPickupTask(shelfPoint, centralDropoff);
        const result = await task.execute(robot);
        
        console.log('Task completed:', result);
    } catch (error) {
        console.error('Error executing bin pickup task:', error);
    }
}

async function executeBinDeliveryTask(centralPickup, shelfPoint) {
    try {
        console.log(`\nExecuting bin delivery task:`);
        console.log(`From central pickup: ${centralPickup}`);
        console.log(`To shelf point: ${shelfPoint}`);

        // Create and execute the task
        const task = await taskTemplate.createBinDeliveryTask(centralPickup, shelfPoint);
        const result = await task.execute(robot);
        
        console.log('Task completed:', result);
    } catch (error) {
        console.error('Error executing bin delivery task:', error);
    }
}

async function main() {
    try {
        // Set up robot and display available points
        await setupRobot();
        await displayAvailablePoints();

        // Example: Execute a bin pickup task
        await executeBinPickupTask(110, 1); // From shelf 110 to central dropoff 001

        // Example: Execute a bin delivery task
        await executeBinDeliveryTask(50, 120); // From central pickup 050 to shelf 120

    } catch (error) {
        console.error('Error in main:', error);
    } finally {
        // Cleanup
        mapManager.stopUpdates();
        await robot.disconnect();
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nStopping robot tasks...');
    mapManager.stopUpdates();
    await robot.disconnect();
    process.exit(0);
});

// Run the main function
main(); 