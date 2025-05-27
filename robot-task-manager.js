const { RobotConfig, AutoXingRobot } = require('./robot-interface.js');

class RobotTaskManager {
    constructor(robot) {
        this.robot = robot;
        this.activeTasks = new Map(); // Map of taskId -> TaskData
        this.taskCallbacks = new Map(); // Map of taskId -> callbacks
    }

    // Create and execute a move task
    async createMoveTask(params) {
        try {
            // Create the move action
            const moveAction = await this.robot.createMoveAction({
                type: params.type || 'standard',
                target_x: params.x,
                target_y: params.y,
                target_z: params.z || 0,
                target_ori: params.orientation || null,
                creator: `robot-interface-${this.robot.config.serialNumber}`
            });

            // Set up task monitoring
            const taskId = moveAction.id;
            this.activeTasks.set(taskId, {
                id: taskId,
                type: 'move',
                status: 'created',
                startTime: new Date(),
                params: params,
                moveAction: moveAction
            });

            // Subscribe to planning state updates
            this.robot.subscribeToTopic('/planning_state');

            return taskId;
        } catch (error) {
            console.error(`Error creating move task for robot ${this.robot.config.serialNumber}:`, error);
            throw error;
        }
    }

    // Move to a specific point by name
    async moveToPoint(mapId, pointName) {
        try {
            const point = await this.robot.getPointByName(mapId, pointName);
            if (!point) {
                throw new Error(`Point ${pointName} not found in map ${mapId}`);
            }

            const [x, y, z = 0] = point.coordinates;
            return this.createMoveTask({
                type: 'standard',
                x: x,
                y: y,
                z: z,
                orientation: point.properties.yaw || null
            });
        } catch (error) {
            console.error(`Error moving to point ${pointName}:`, error);
            throw error;
        }
    }

    // Move to charging station
    async moveToCharger() {
        try {
            const chargerPose = await this.robot.getChargerPose();
            return this.createMoveTask({
                type: 'standard',
                x: chargerPose.x,
                y: chargerPose.y,
                z: chargerPose.z || 0,
                orientation: chargerPose.orientation || null
            });
        } catch (error) {
            console.error('Error moving to charger:', error);
            throw error;
        }
    }

    // Cancel current task
    async cancelCurrentTask() {
        try {
            const currentTask = this.getCurrentTask();
            if (!currentTask) {
                throw new Error('No active task to cancel');
            }

            await this.robot.cancelMove();
            this.activeTasks.delete(currentTask.id);
            return true;
        } catch (error) {
            console.error('Error canceling task:', error);
            throw error;
        }
    }

    // Get current task
    getCurrentTask() {
        return Array.from(this.activeTasks.values())
            .find(task => task.status === 'executing');
    }

    // Get task status
    getTaskStatus(taskId) {
        return this.activeTasks.get(taskId);
    }

    // Handle WebSocket messages for task monitoring
    handleWebSocketMessage(data) {
        if (data.topic === '/planning_state') {
            const taskId = data.payload?.task_id;
            if (taskId && this.activeTasks.has(taskId)) {
                const task = this.activeTasks.get(taskId);
                const newStatus = this.parsePlanningState(data.payload);

                if (newStatus !== task.status) {
                    task.status = newStatus;
                    task.lastUpdate = new Date();

                    // Handle task completion
                    if (newStatus === 'completed' || newStatus === 'failed') {
                        this.handleTaskCompletion(taskId, newStatus);
                    }

                    // Call any registered callbacks
                    const callbacks = this.taskCallbacks.get(taskId);
                    if (callbacks) {
                        callbacks.forEach(callback => callback(task));
                    }
                }
            }
        }
    }

    // Parse planning state to task status
    parsePlanningState(state) {
        if (!state) return 'unknown';
        
        switch (state.state) {
            case 'idle':
                return 'completed';
            case 'planning':
                return 'planning';
            case 'executing':
                return 'executing';
            case 'failed':
                return 'failed';
            default:
                return 'unknown';
        }
    }

    // Handle task completion
    handleTaskCompletion(taskId, status) {
        const task = this.activeTasks.get(taskId);
        if (task) {
            task.endTime = new Date();
            task.duration = task.endTime - task.startTime;
            
            // Remove task after a delay
            setTimeout(() => {
                this.activeTasks.delete(taskId);
                this.taskCallbacks.delete(taskId);
            }, 5000);
        }
    }

    // Register callback for task updates
    onTaskUpdate(taskId, callback) {
        if (!this.taskCallbacks.has(taskId)) {
            this.taskCallbacks.set(taskId, new Set());
        }
        this.taskCallbacks.get(taskId).add(callback);
    }

    // Remove callback for task updates
    removeTaskCallback(taskId, callback) {
        const callbacks = this.taskCallbacks.get(taskId);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
}

module.exports = RobotTaskManager; 