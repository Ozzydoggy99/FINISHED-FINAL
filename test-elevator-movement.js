const { AutoXingRobot, RobotConfig } = require('./robot-interface');
const ESP32ElevatorController = require('./backend/core/ESP32ElevatorController');

// Robot configuration
const robotConfig = {
    serialNumber: 'L382502104987ir',
    publicIp: '47.180.91.99',
    localIp: '192.168.4.31',
    secret: '667a51a4d948433081a272c78d10a8a4'
};

// ESP32 configuration
const esp32Config = {
    ip: process.env.ESP32_IP || '192.168.1.200',
    port: process.env.ESP32_PORT || 81
};

// Floor coordinates (adjust these based on your building layout)
const floorCoordinates = {
    1: {
        approach: { x: -1.5, y: 0 },    // Point before elevator
        entrance: { x: 0, y: 0 },       // Elevator entrance
        exit: { x: 1.5, y: 0 }          // Point after elevator
    },
    2: {
        approach: { x: -1.5, y: 0 },
        entrance: { x: 0, y: 0 },
        exit: { x: 1.5, y: 0 }
    },
    3: {
        approach: { x: -1.5, y: 0 },
        entrance: { x: 0, y: 0 },
        exit: { x: 1.5, y: 0 }
    },
    4: {
        approach: { x: -1.5, y: 0 },
        entrance: { x: 0, y: 0 },
        exit: { x: 1.5, y: 0 }
    }
};

async function testElevatorMovement(currentFloor, targetFloor) {
    console.log(`Starting elevator movement test from floor ${currentFloor} to floor ${targetFloor}`);
    
    try {
        // Initialize robot
        const robot = new AutoXingRobot(robotConfig);
        await robot.connect();
        console.log('Robot connected successfully');

        // Initialize elevator controller
        const elevatorController = new ESP32ElevatorController(esp32Config);
        await elevatorController.connect();
        console.log('Elevator controller connected successfully');

        // 1. Move to elevator approach point on current floor
        console.log('Moving to elevator approach point...');
        const approachPoint = floorCoordinates[currentFloor].approach;
        await robot.moveTo(approachPoint);

        // 2. Move to elevator entrance
        console.log('Moving to elevator entrance...');
        const entrancePoint = floorCoordinates[currentFloor].entrance;
        await robot.moveTo(entrancePoint);

        // 3. Open elevator door
        console.log('Opening elevator door...');
        await elevatorController.openDoor();

        // 4. Move into elevator
        console.log('Moving into elevator...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for door to fully open

        // 5. Close elevator door
        console.log('Closing elevator door...');
        await elevatorController.closeDoor();

        // 6. Select target floor
        console.log(`Selecting floor ${targetFloor}...`);
        await elevatorController.selectFloor(targetFloor);

        // 7. Wait for elevator to reach target floor
        console.log('Waiting for elevator to reach target floor...');
        const FLOOR_TRAVEL_TIME = Math.abs(targetFloor - currentFloor) * 5000; // 5 seconds per floor
        await new Promise(resolve => setTimeout(resolve, FLOOR_TRAVEL_TIME));

        // 8. Open door at target floor
        console.log('Opening door at target floor...');
        await elevatorController.openDoor();

        // 9. Move out of elevator
        console.log('Moving out of elevator...');
        const exitPoint = floorCoordinates[targetFloor].exit;
        await robot.moveTo(exitPoint);

        // 10. Close elevator door
        console.log('Closing elevator door...');
        await elevatorController.closeDoor();

        console.log('Elevator movement test completed successfully');
        return true;

    } catch (error) {
        console.error('Error during elevator movement test:', error);
        return false;
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const currentFloor = parseInt(args[0]) || 1;
const targetFloor = parseInt(args[1]) || 2;

// Run the test
testElevatorMovement(currentFloor, targetFloor)
    .then(success => {
        if (success) {
            console.log('Test completed successfully');
            process.exit(0);
        } else {
            console.error('Test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    }); 