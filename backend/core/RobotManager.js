const RobotConnection = require('./RobotConnection');
const EventEmitter = require('events');
const ESP32ElevatorController = require('./ESP32ElevatorController');

class RobotManager extends EventEmitter {
    constructor() {
        super();
        this.robots = new Map();
        this.robotStatus = new Map();
        this.elevatorController = null;
    }

    // Initialize ESP32 elevator controller
    async initializeElevatorController(config) {
        try {
            this.elevatorController = new ESP32ElevatorController(config);
            await this.elevatorController.connect();

            // Handle elevator controller events
            this.elevatorController.on('connected', () => {
                console.log('ESP32 elevator controller connected');
                this.emit('elevator_controller_connected');
            });

            this.elevatorController.on('disconnected', () => {
                console.log('ESP32 elevator controller disconnected');
                this.emit('elevator_controller_disconnected');
            });

            this.elevatorController.on('error', (error) => {
                console.error('ESP32 elevator controller error:', error);
                this.emit('elevator_controller_error', error);
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize elevator controller:', error);
            return false;
        }
    }

    // High-level elevator control functions
    async useElevator(robotId, currentFloor, targetFloor) {
        if (!this.elevatorController) {
            throw new Error('Elevator controller not initialized');
        }

        try {
            // 1. Move robot to elevator entrance point
            await this.moveRobotToElevator(robotId, currentFloor);

            // 2. Use elevator to go to target floor
            await this.elevatorController.goToFloor(targetFloor);

            // 3. Move robot out of elevator
            await this.moveRobotFromElevator(robotId, targetFloor);

            return true;
        } catch (error) {
            console.error('Error using elevator:', error);
            return false;
        }
    }

    // Helper functions for robot movement
    async moveRobotToElevator(robotId, floor) {
        const robot = this.robots.get(robotId);
        if (!robot) {
            throw new Error(`Robot ${robotId} not found`);
        }

        // Get elevator entrance point for the current floor
        const entrancePoint = this.getElevatorEntrancePoint(floor);
        
        // Move robot to entrance point
        await robot.moveTo(entrancePoint);
    }

    async moveRobotFromElevator(robotId, floor) {
        const robot = this.robots.get(robotId);
        if (!robot) {
            throw new Error(`Robot ${robotId} not found`);
        }

        // Get elevator exit point for the target floor
        const exitPoint = this.getElevatorExitPoint(floor);
        
        // Move robot to exit point
        await robot.moveTo(exitPoint);
    }

    // Get elevator entrance/exit points
    getElevatorEntrancePoint(floor) {
        // These coordinates should be configured based on your building layout
        const entrancePoints = {
            1: { x: 0, y: 0 },
            2: { x: 0, y: 0 },
            3: { x: 0, y: 0 },
            4: { x: 0, y: 0 }
        };
        return entrancePoints[floor] || entrancePoints[1];
    }

    getElevatorExitPoint(floor) {
        // These coordinates should be configured based on your building layout
        const exitPoints = {
            1: { x: 1, y: 0 },
            2: { x: 1, y: 0 },
            3: { x: 1, y: 0 },
            4: { x: 1, y: 0 }
        };
        return exitPoints[floor] || exitPoints[1];
    }

    // Add a new robot
    addRobot(robotConfig) {
        const { id, ip, port, secret, name, type } = robotConfig;
        
        if (this.robots.has(id)) {
            throw new Error(`Robot with ID ${id} already exists`);
        }

        const robot = new RobotConnection(ip, port, secret);
        this.robots.set(id, {
            connection: robot,
            config: robotConfig,
            status: 'disconnected'
        });

        // Set up event listeners
        robot.on('connected', () => {
            this.updateRobotStatus(id, 'connected');
            this.emit('robotConnected', id);
        });

        robot.on('disconnected', () => {
            this.updateRobotStatus(id, 'disconnected');
            this.emit('robotDisconnected', id);
        });

        robot.on('error', (error) => {
            this.emit('robotError', { id, error });
        });

        robot.on('message', (message) => {
            this.handleRobotMessage(id, message);
        });

        return id;
    }

    // Remove a robot
    removeRobot(id) {
        const robot = this.robots.get(id);
        if (robot) {
            robot.connection.disconnect();
            this.robots.delete(id);
            this.robotStatus.delete(id);
            this.emit('robotRemoved', id);
        }
    }

    // Connect to a robot
    async connectRobot(id) {
        const robot = this.robots.get(id);
        if (!robot) {
            throw new Error(`Robot with ID ${id} not found`);
        }

        try {
            await robot.connection.connect();
            return true;
        } catch (error) {
            this.emit('robotError', { id, error });
            return false;
        }
    }

    // Disconnect from a robot
    disconnectRobot(id) {
        const robot = this.robots.get(id);
        if (robot) {
            robot.connection.disconnect();
        }
    }

    // Update robot status
    updateRobotStatus(id, status) {
        const robot = this.robots.get(id);
        if (robot) {
            robot.status = status;
            this.robotStatus.set(id, {
                ...robot.config,
                status,
                lastUpdate: new Date()
            });
            this.emit('robotStatusUpdated', { id, status });
        }
    }

    // Handle robot messages
    handleRobotMessage(id, message) {
        const robot = this.robots.get(id);
        if (!robot) return;

        // Update robot status based on message type
        if (message.topic === '/robot_status') {
            this.updateRobotStatus(id, message.data.status);
        }

        this.emit('robotMessage', { id, message });
    }

    // Get robot status
    getRobotStatus(id) {
        return this.robotStatus.get(id);
    }

    // Get all robot statuses
    getAllRobotStatuses() {
        return Array.from(this.robotStatus.entries()).map(([id, status]) => ({
            id,
            ...status
        }));
    }

    // Execute command on robot
    async executeCommand(id, command) {
        const robot = this.robots.get(id);
        if (!robot) {
            throw new Error(`Robot with ID ${id} not found`);
        }

        if (robot.status !== 'connected') {
            throw new Error(`Robot ${id} is not connected`);
        }

        try {
            return await robot.connection.sendCommand(command);
        } catch (error) {
            this.emit('robotError', { id, error });
            throw error;
        }
    }

    // Get available robots
    getAvailableRobots() {
        return Array.from(this.robots.entries())
            .filter(([_, robot]) => robot.status === 'connected')
            .map(([id, robot]) => ({
                id,
                ...robot.config
            }));
    }
}

module.exports = RobotManager; 