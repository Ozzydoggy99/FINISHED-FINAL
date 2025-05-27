const { RobotConfig, AutoXingRobot } = require('./robot-interface.js');
const RobotTaskManager = require('./robot-task-manager.js');

// Create robot configuration
const robotConfig = new RobotConfig(
    'L382502104987ir',
    '47.180.91.99',
    '192.168.4.31',
    '667a51a4d948433081a272c78d10a8a4'
);

// Create robot instance
const robot = new AutoXingRobot(robotConfig);

// Create task manager
const taskManager = new RobotTaskManager(robot);

// Connect to robot and set up task monitoring
async function setupRobot() {
    try {
        await robot.connect();
        console.log('Connected to robot');

        // Set up WebSocket message handling
        robot.handleWebSocketMessage = (data) => {
            taskManager.handleWebSocketMessage(data);
        };

        return true;
    } catch (error) {
        console.error('Error setting up robot:', error);
        return false;
    }
}

// Example task execution
async function executeTasks() {
    try {
        // Get current map
        const currentMap = await robot.getCurrentMap();
        console.log(`Current map: ${currentMap.map_name} (ID: ${currentMap.id})`);

        // Example 1: Move to a specific point
        console.log('\nMoving to point "Charging Station"...');
        const moveTaskId = await taskManager.moveToPoint(currentMap.id, 'Charging Station');
        
        // Set up task monitoring
        taskManager.onTaskUpdate(moveTaskId, (task) => {
            console.log(`Task ${task.id} status: ${task.status}`);
            if (task.status === 'completed' || task.status === 'failed') {
                console.log(`Task ${task.id} ${task.status} in ${task.duration}ms`);
            }
        });

        // Wait for task completion
        await new Promise(resolve => {
            const checkTask = setInterval(() => {
                const task = taskManager.getTaskStatus(moveTaskId);
                if (!task || task.status === 'completed' || task.status === 'failed') {
                    clearInterval(checkTask);
                    resolve();
                }
            }, 1000);
        });

        // Example 2: Move to charger
        console.log('\nMoving to charger...');
        const chargerTaskId = await taskManager.moveToCharger();
        
        // Set up task monitoring
        taskManager.onTaskUpdate(chargerTaskId, (task) => {
            console.log(`Task ${task.id} status: ${task.status}`);
            if (task.status === 'completed' || task.status === 'failed') {
                console.log(`Task ${task.id} ${task.status} in ${task.duration}ms`);
            }
        });

        // Wait for task completion
        await new Promise(resolve => {
            const checkTask = setInterval(() => {
                const task = taskManager.getTaskStatus(chargerTaskId);
                if (!task || task.status === 'completed' || task.status === 'failed') {
                    clearInterval(checkTask);
                    resolve();
                }
            }, 1000);
        });

    } catch (error) {
        console.error('Error executing tasks:', error);
    }
}

// Main execution
async function main() {
    if (await setupRobot()) {
        await executeTasks();
    }
    
    // Clean up
    robot.disconnect();
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nStopping robot tasks...');
    robot.disconnect();
    process.exit(0);
});

main(); 