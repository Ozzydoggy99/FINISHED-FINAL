const { RobotConfig, AutoXingRobot } = require('./robot-interface.js');
const {
    MoveToPointAction,
    MoveToCoordinatesAction,
    MoveToChargerAction,
    WaitAction,
    CheckPointAction,
    SequentialAction,
    ParallelAction,
    ConditionalAction
} = require('./robot-actions.js');

// Create robot configuration
const robotConfig = new RobotConfig(
    'L382502104987ir',
    '47.180.91.99',
    '192.168.4.31',
    '667a51a4d948433081a272c78d10a8a4'
);

// Create robot instance
const robot = new AutoXingRobot(robotConfig);

// Example 1: Simple sequential task
async function createPatrolTask(mapId, points) {
    const actions = points.map(pointName => 
        new MoveToPointAction(pointName, mapId)
    );
    return new SequentialAction(actions);
}

// Example 2: Complex task with conditions and parallel actions
async function createChargingTask(mapId) {
    // Check if we need to charge
    const checkBatteryCondition = async (robot) => {
        // This is a placeholder - implement actual battery check
        return true; // For demonstration
    };

    // Create the charging sequence
    const chargingSequence = new SequentialAction([
        new MoveToChargerAction(),
        new WaitAction(5000), // Wait for connection
        new WaitAction(300000) // Charge for 5 minutes
    ]);

    // Create the patrol sequence
    const patrolSequence = new SequentialAction([
        new MoveToPointAction('Point1', mapId),
        new WaitAction(2000),
        new MoveToPointAction('Point2', mapId),
        new WaitAction(2000)
    ]);

    // Combine into conditional task
    return new ConditionalAction(
        checkBatteryCondition,
        chargingSequence,
        patrolSequence
    );
}

// Example 3: Multi-robot coordination task
async function createMultiRobotTask(mapId, robot2) {
    // Create parallel actions for two robots
    return new ParallelAction([
        new SequentialAction([
            new MoveToPointAction('Point1', mapId),
            new WaitAction(2000),
            new MoveToPointAction('Point2', mapId)
        ]),
        new SequentialAction([
            new MoveToPointAction('Point3', mapId),
            new WaitAction(2000),
            new MoveToPointAction('Point4', mapId)
        ])
    ]);
}

// Example 4: Error handling and recovery task
async function createRobustTask(mapId) {
    const checkPointExists = async (robot) => {
        try {
            const point = await robot.getPointByName(mapId, 'RecoveryPoint');
            return !!point;
        } catch {
            return false;
        }
    };

    const mainTask = new SequentialAction([
        new MoveToPointAction('StartPoint', mapId),
        new WaitAction(1000),
        new MoveToPointAction('WorkPoint', mapId)
    ]);

    const recoveryTask = new SequentialAction([
        new MoveToPointAction('RecoveryPoint', mapId),
        new WaitAction(5000),
        new MoveToChargerAction()
    ]);

    return new ConditionalAction(
        checkPointExists,
        mainTask,
        recoveryTask
    );
}

// Execute a complex task
async function executeComplexTask() {
    try {
        await robot.connect();
        console.log('Connected to robot');

        // Get current map
        const currentMap = await robot.getCurrentMap();
        console.log(`Current map: ${currentMap.map_name} (ID: ${currentMap.id})`);

        // Create and execute a patrol task
        console.log('\nExecuting patrol task...');
        const patrolTask = await createPatrolTask(currentMap.id, ['Point1', 'Point2', 'Point3']);
        await patrolTask.execute(robot);
        console.log('Patrol task completed');

        // Create and execute a charging task
        console.log('\nExecuting charging task...');
        const chargingTask = await createChargingTask(currentMap.id);
        await chargingTask.execute(robot);
        console.log('Charging task completed');

        // Create and execute a robust task
        console.log('\nExecuting robust task...');
        const robustTask = await createRobustTask(currentMap.id);
        await robustTask.execute(robot);
        console.log('Robust task completed');

    } catch (error) {
        console.error('Error executing complex task:', error);
    } finally {
        robot.disconnect();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nStopping robot tasks...');
    robot.disconnect();
    process.exit(0);
});

// Run the example
executeComplexTask(); 