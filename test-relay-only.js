const ESP32ElevatorController = require('./backend/core/ESP32ElevatorController');

// ESP32 configuration (using defaults)
const esp32Config = {
    ip: '192.168.1.200',
    port: 81
};

async function testRelays(currentFloor, targetFloor) {
    console.log(`Starting relay test sequence (Floor ${currentFloor} → Floor ${targetFloor})...`);
    
    try {
        // Initialize elevator controller
        const elevatorController = new ESP32ElevatorController(esp32Config);
        await elevatorController.connect();
        console.log('Elevator controller connected successfully\n');

        // Full sequence test with specified floors
        console.log(`=== Testing Floor ${currentFloor} to Floor ${targetFloor} Sequence ===`);
        
        // 1. Open door at current floor
        console.log(`1. Opening door at floor ${currentFloor}...`);
        await elevatorController.openDoor();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        // 2. Close door
        console.log('2. Closing door...');
        await elevatorController.closeDoor();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Select target floor
        console.log(`3. Selecting floor ${targetFloor}...`);
        await elevatorController.selectFloor(targetFloor);
        
        // 4. Wait for simulated travel time
        const SECONDS_PER_FLOOR = 5;
        const floorsToTravel = Math.abs(targetFloor - currentFloor);
        const travelTime = floorsToTravel * SECONDS_PER_FLOOR * 1000;
        console.log(`4. Traveling ${floorsToTravel} floors... (${SECONDS_PER_FLOOR * floorsToTravel} seconds)`);
        await new Promise(resolve => setTimeout(resolve, travelTime));

        // 5. Open door at destination
        console.log(`5. Opening door at floor ${targetFloor}...`);
        await elevatorController.openDoor();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 6. Close door
        console.log('6. Closing door...');
        await elevatorController.closeDoor();

        console.log('\n✅ Elevator sequence completed successfully!');
        return true;

    } catch (error) {
        console.error('Error during relay test:', error);
        return false;
    }
}

// Parse command line arguments for current floor and target floor
const args = process.argv.slice(2);
const currentFloor = parseInt(args[0]) || 1;
const targetFloor = parseInt(args[1]) || 2;

// Validate floor numbers
if (currentFloor < 1 || currentFloor > 4 || targetFloor < 1 || targetFloor > 4) {
    console.error('Error: Floor numbers must be between 1 and 4');
    process.exit(1);
}

if (currentFloor === targetFloor) {
    console.error('Error: Current floor and target floor must be different');
    process.exit(1);
}

// Run the test
testRelays(currentFloor, targetFloor)
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