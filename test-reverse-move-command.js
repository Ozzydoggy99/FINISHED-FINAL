const { AutoXingRobot, RobotConfig } = require('./robot-interface.js');
const RobotMapManager = require('./robot-map-manager.js');

console.log('Starting reverse workflow script...');

// Create robot configuration with correct serial number
const config = new RobotConfig({
    serialNumber: 'L382502104987ir',
    publicIp: '47.180.91.99',
    localIp: '192.168.1.100',
    secret: '667a51a4d948433081a272c78d10a8a4'
});

console.log('Created robot config:', {
    serialNumber: config.serialNumber,
    publicIp: config.publicIp,
    localIp: config.localIp,
    port: config.port
});

// Create robot and map manager
const robot = new AutoXingRobot(config);
const mapManager = new RobotMapManager();

console.log('Created robot and map manager instances');

// Add robot to map manager
mapManager.addRobot(robot);
console.log('Added robot to map manager');

// Helper function to check move status
async function checkMoveStatus(moveId) {
    try {
        const response = await fetch(`${robot.config.getBaseUrl()}/chassis/moves/${moveId}`, {
            headers: robot.config.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to check move status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.state || 'unknown';
    } catch (error) {
        console.error('Error checking move status:', error);
        return 'failed';
    }
}

// Helper function to wait for move completion
async function waitForMoveComplete(moveId, timeout = 120000) { // 2 minutes timeout
    const startTime = Date.now();
    let isMoving = true;

    while (isMoving && (Date.now() - startTime) < timeout) {
        const status = await checkMoveStatus(moveId);
        console.log('Current move status:', status);

        if (status === 'succeeded') {
            isMoving = false;
            console.log('✅ Move completed successfully');
        } else if (status === 'failed' || status === 'cancelled') {
            throw new Error(`Move failed with status: ${status}`);
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (isMoving) {
        throw new Error(`Move timed out after ${timeout}ms`);
    }
}

async function setupRobot() {
    try {
        console.log('Setting up robot...');
        await robot.connect();
        console.log('Connected to robot:', robot.config.serialNumber);
        console.log('Connection details:', {
            publicIp: robot.config.publicIp,
            localIp: robot.config.localIp,
            port: 8090
        });

        // Start map updates
        await mapManager.startUpdates();
        console.log('Started map updates');

        // Set up WebSocket message handling
        robot.onWebSocketMessage((data) => {
            console.log('Received WebSocket message:', data);
            if (data.topic === '/planning_state') {
                console.log('Planning state:', data);
            }
        });
        console.log('Set up WebSocket message handler');
    } catch (error) {
        console.error('Error setting up robot:', error);
        throw error;
    }
}

async function pickupBin(loadPointName, maxRetries = 3) {
    let retryCount = 0;
    let success = false;

    while (!success && retryCount < maxRetries) {
        try {
            console.log(`\nStarting bin pickup at ${loadPointName} (Attempt ${retryCount + 1}/${maxRetries})...`);
            
            // Step 1: Find the load point
            console.log('Finding load point...');
            const currentMap = await robot.getCurrentMap();
            const points = await robot.getMapPoints(currentMap.id);
            
            const loadPoint = points.find(point => point.name === loadPointName);
            if (!loadPoint) {
                throw new Error(`Load point ${loadPointName} not found`);
            }

            console.log('Found load point:', {
                name: loadPoint.name,
                id: loadPoint.id,
                coordinates: loadPoint.coordinates,
                properties: loadPoint.properties
            });

            // Step 2: Align with rack
            console.log('\nStep 1: Aligning with rack...');
            const [x, y] = loadPoint.coordinates;
            const yaw = parseFloat(loadPoint.properties.yaw) || 0;

            const alignParams = {
                type: 'align_with_rack',
                target_x: x,
                target_y: y,
                target_z: 0,
                target_ori: yaw,
                creator: 'test',
                point_id: loadPoint.id
            };
            console.log('Creating alignment task with params:', alignParams);

            const alignResponse = await robot.createMoveTask(alignParams);
            const alignId = alignResponse.id || alignResponse.action_id || alignResponse.task_id;
            if (!alignId) {
                throw new Error('No action/task ID returned from alignment task creation');
            }
            console.log('Alignment task ID:', alignId);

            // Wait for alignment to complete
            console.log('Waiting for alignment to complete...');
            await waitForMoveComplete(alignId);
            console.log('✅ Alignment completed successfully');

            // Add a safety delay to ensure robot is stable
            console.log('Waiting for robot to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Pick up bin
            console.log('\nStep 2: Picking up bin...');
            console.log('Sending jack up command...');
            const jackUpResponse = await fetch(`${robot.config.getBaseUrl()}/services/jack_up`, {
                method: 'POST',
                headers: robot.config.getHeaders(),
                body: JSON.stringify({})
            });
            
            if (!jackUpResponse.ok) {
                throw new Error(`Failed to send jack up command: ${jackUpResponse.status} ${jackUpResponse.statusText}`);
            }
            console.log('✅ Jack up command sent');

            // Wait for jack operation to complete
            console.log('Waiting for jack operation to complete...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay for jack operation
            console.log('✅ Jack operation completed');

            // Add a safety delay to ensure bin is secure
            console.log('Waiting for bin to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 4: Move with bin
            console.log('\nStep 3: Moving with bin...');
            const moveWithBinParams = {
                type: 'standard',
                target_x: x,
                target_y: y,
                target_z: 0.2, // Lift height
                target_ori: yaw,
                creator: 'test',
                properties: {
                    max_trans_vel: 0.3, // Slower speed when carrying bin
                    max_rot_vel: 0.3,
                    acc_lim_x: 0.3,
                    acc_lim_theta: 0.3,
                    planning_mode: 'directional'
                },
                point_id: loadPoint.id
            };
            console.log('Creating move with bin task with params:', moveWithBinParams);

            const moveResponse = await robot.createMoveTask(moveWithBinParams);
            const moveId = moveResponse.id || moveResponse.action_id || moveResponse.task_id;
            if (!moveId) {
                throw new Error('No action/task ID returned from move task creation');
            }
            console.log('Move task ID:', moveId);

            // Wait for move to complete
            console.log('Waiting for move to complete...');
            await waitForMoveComplete(moveId);
            console.log('✅ Move with bin completed successfully');

            // If we get here, the pickup was successful
            success = true;
            console.log('✅ Bin pickup completed successfully');

        } catch (error) {
            console.error(`Error during bin pickup (Attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            // If this wasn't the last retry, wait before trying again
            if (retryCount < maxRetries - 1) {
                console.log(`\nRetrying bin pickup in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                console.error('❌ Bin pickup failed after all retry attempts');
                throw error;
            }
        }
        retryCount++;
    }

    if (!success) {
        throw new Error(`Failed to pick up bin after ${maxRetries} attempts`);
    }
}

async function main() {
    try {
        console.log('Starting main function...');
        await setupRobot();
        
        // Step 1: Move to 110_load_docking (shelf point)
        console.log('\nStep 1: Moving to 110_load_docking...');
        const currentMap = await robot.getCurrentMap();
        const points = await robot.getMapPoints(currentMap.id);
        const shelfDockingPoint = points.find(point => point.name === '110_load_docking');
        
        if (!shelfDockingPoint) {
            throw new Error('Shelf docking point (110_load_docking) not found');
        }

        const [shelfX, shelfY] = shelfDockingPoint.coordinates;
        const shelfYaw = parseFloat(shelfDockingPoint.properties.yaw) || 0;
        
        const shelfDockingParams = {
            type: 'standard',
            target_x: shelfX,
            target_y: shelfY,
            target_z: 0,
            target_ori: shelfYaw,
            creator: 'test',
            properties: {
                max_trans_vel: 0.5,
                max_rot_vel: 0.5,
                acc_lim_x: 0.5,
                acc_lim_theta: 0.5,
                planning_mode: 'directional'
            },
            point_id: shelfDockingPoint.id
        };

        console.log('Moving to shelf docking point with params:', shelfDockingParams);
        const shelfDockingResponse = await robot.createMoveTask(shelfDockingParams);
        const shelfDockingId = shelfDockingResponse.id || shelfDockingResponse.action_id || shelfDockingResponse.task_id;
        
        if (!shelfDockingId) {
            throw new Error('No action/task ID returned from shelf docking move task creation');
        }
        
        console.log('Shelf docking move task ID:', shelfDockingId);
        await waitForMoveComplete(shelfDockingId);
        console.log('✅ Arrived at 110_load_docking');

        // Step 2: Pick up bin at 110_load (shelf point)
        console.log('\nStep 2: Picking up bin at 110_load...');
        await pickupBin('110_load');
        
        // Step 3: Move to 050_load_docking (central pickup point)
        console.log('\nStep 3: Moving to 050_load_docking...');
        const pickupDockingPoint = points.find(point => point.name === '050_load_docking');
        
        if (!pickupDockingPoint) {
            throw new Error('Pickup docking point (050_load_docking) not found');
        }

        const [pickupX, pickupY] = pickupDockingPoint.coordinates;
        const pickupYaw = parseFloat(pickupDockingPoint.properties.yaw) || 0;
        
        const pickupDockingParams = {
            type: 'standard',
            target_x: pickupX,
            target_y: pickupY,
            target_z: 0.2, // Keep bin lifted
            target_ori: pickupYaw,
            creator: 'test',
            properties: {
                max_trans_vel: 0.3, // Slower speed when carrying bin
                max_rot_vel: 0.3,
                acc_lim_x: 0.3,
                acc_lim_theta: 0.3,
                planning_mode: 'directional'
            },
            point_id: pickupDockingPoint.id
        };

        console.log('Moving to pickup docking point with params:', pickupDockingParams);
        const pickupDockingResponse = await robot.createMoveTask(pickupDockingParams);
        const pickupDockingId = pickupDockingResponse.id || pickupDockingResponse.action_id || pickupDockingResponse.task_id;
        
        if (!pickupDockingId) {
            throw new Error('No action/task ID returned from pickup docking move task creation');
        }
        
        console.log('Pickup docking move task ID:', pickupDockingId);
        await waitForMoveComplete(pickupDockingId);
        console.log('✅ Arrived at 050_load_docking');

        // Step 4: Drop bin at 050_load (central pickup point)
        console.log('\nStep 4: Dropping bin at 050_load...');
        const pickupLoadPoint = points.find(point => point.name === '050_load');
        
        if (!pickupLoadPoint) {
            throw new Error('Pickup load point (050_load) not found');
        }

        const [dropX, dropY] = pickupLoadPoint.coordinates;
        const dropYaw = parseFloat(pickupLoadPoint.properties.yaw) || 0;
        
        const dropoffParams = {
            type: 'to_unload_point',
            target_x: dropX,
            target_y: dropY,
            target_z: 0.2,
            target_ori: dropYaw,
            creator: 'test',
            point_id: pickupLoadPoint.id
        };

        console.log('Moving to pickup load point with params:', dropoffParams);
        const dropoffResponse = await robot.createMoveTask(dropoffParams);
        const dropoffId = dropoffResponse.id || dropoffResponse.action_id || dropoffResponse.task_id;
        
        if (!dropoffId) {
            throw new Error('No action/task ID returned from dropoff move task creation');
        }
        
        console.log('Dropoff move task ID:', dropoffId);
        await waitForMoveComplete(dropoffId);
        console.log('✅ Arrived at pickup load point');

        // Step 5: Jack down
        console.log('\nStep 5: Lowering jack...');
        const jackDownResponse = await fetch(`${robot.config.getBaseUrl()}/services/jack_down`, {
            method: 'POST',
            headers: robot.config.getHeaders(),
            body: JSON.stringify({})
        });
        
        if (!jackDownResponse.ok) {
            throw new Error(`Failed to send jack down command: ${jackDownResponse.status} ${jackDownResponse.statusText}`);
        }
        console.log('✅ Jack down command sent');
        
        // Wait for jack operation to complete
        console.log('Waiting for jack operation to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay for jack operation
        console.log('✅ Jack operation completed');

        // Step 6: Return to charging station
        console.log('\nStep 6: Returning to charging station...');
        const chargingPoint = points.find(point => point.name === 'Charging Station');
        
        if (!chargingPoint) {
            throw new Error('Charging station point not found');
        }

        const [chargeX, chargeY] = chargingPoint.coordinates;
        const chargeYaw = parseFloat(chargingPoint.properties.yaw) || 0;
        
        const chargeParams = {
            type: 'charge',
            target_x: chargeX,
            target_y: chargeY,
            target_z: 0,
            target_ori: chargeYaw,
            target_accuracy: 0.05,
            charge_retry_count: 5,
            creator: 'test',
            properties: {
                max_trans_vel: 0.2,
                max_rot_vel: 0.2,
                acc_lim_x: 0.2,
                acc_lim_theta: 0.2,
                planning_mode: 'directional'
            },
            point_id: chargingPoint.id
        };

        console.log('Moving to charging station with params:', chargeParams);
        const chargeResponse = await robot.createMoveTask(chargeParams);
        const chargeId = chargeResponse.id || chargeResponse.action_id || chargeResponse.task_id;
        
        if (!chargeId) {
            throw new Error('No action/task ID returned from charging move task creation');
        }
        
        console.log('Charging move task ID:', chargeId);
        await waitForMoveComplete(chargeId);
        console.log('✅ Arrived at charging station');
        
    } catch (error) {
        console.error('Error in main:', error);
    } finally {
        console.log('Cleaning up...');
        mapManager.stopUpdates();
        await robot.disconnect();
        console.log('Cleanup complete');
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
console.log('Starting main function...');
main().catch(error => {
    console.error('Unhandled error in main:', error);
}); 