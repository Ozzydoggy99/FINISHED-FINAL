const RobotConnection = require('./RobotConnection');
const EventEmitter = require('events');

class RobotManager extends EventEmitter {
    constructor() {
        super();
        this.robots = new Map();
        this.robotStatus = new Map();
    }

    // Add a new robot
    addRobot(robotConfig) {
        const { serialNumber, publicIP, privateIP, secretKey, port } = robotConfig;
        const key = serialNumber;
        if (this.robots.has(key)) {
            throw new Error(`Robot with serialNumber ${key} already exists`);
        }
        const robot = new RobotConnection(publicIP, port || 8090, secretKey);
        this.robots.set(key, {
            connection: robot,
            config: robotConfig,
            status: 'disconnected'
        });
        // Set up event listeners
        robot.on('connected', () => {
            this.updateRobotStatus(key, 'connected');
            this.emit('robotConnected', key);
        });
        robot.on('disconnected', () => {
            this.updateRobotStatus(key, 'disconnected');
            this.emit('robotDisconnected', key);
        });
        robot.on('error', (error) => {
            this.emit('robotError', { key, error });
        });
        robot.on('message', (message) => {
            this.handleRobotMessage(key, message);
        });
        return key;
    }

    // Remove a robot
    removeRobot(serialNumber) {
        const robot = this.robots.get(serialNumber);
        if (robot) {
            robot.connection.disconnect();
            this.robots.delete(serialNumber);
            this.robotStatus.delete(serialNumber);
            this.emit('robotRemoved', serialNumber);
        }
    }

    // Connect to a robot
    async connectRobot(serialNumber) {
        const robot = this.robots.get(serialNumber);
        if (!robot) {
            throw new Error(`Robot with serialNumber ${serialNumber} not found`);
        }
        try {
            await robot.connection.connect();
            return true;
        } catch (error) {
            this.emit('robotError', { serialNumber, error });
            return false;
        }
    }

    // Disconnect from a robot
    disconnectRobot(serialNumber) {
        const robot = this.robots.get(serialNumber);
        if (robot) {
            robot.connection.disconnect();
        }
    }

    // Update robot status
    updateRobotStatus(serialNumber, status) {
        const robot = this.robots.get(serialNumber);
        if (robot) {
            robot.status = status;
            this.robotStatus.set(serialNumber, {
                ...robot.config,
                status,
                lastUpdate: new Date()
            });
            this.emit('robotStatusUpdated', { serialNumber, status });
        }
    }

    // Handle robot messages
    handleRobotMessage(serialNumber, message) {
        const robot = this.robots.get(serialNumber);
        if (!robot) return;
        if (message.topic === '/robot_status') {
            this.updateRobotStatus(serialNumber, message.data.status);
        }
        this.emit('robotMessage', { serialNumber, message });
    }

    // Get robot status
    getRobotStatus(serialNumber) {
        return this.robotStatus.get(serialNumber);
    }

    // Get all robot statuses
    getAllRobotStatuses() {
        return Array.from(this.robotStatus.entries()).map(([serialNumber, status]) => ({
            serialNumber,
            ...status
        }));
    }

    // Execute command on robot
    async executeCommand(serialNumber, command) {
        const robot = this.robots.get(serialNumber);
        if (!robot) {
            throw new Error(`Robot with serialNumber ${serialNumber} not found`);
        }
        if (robot.status !== 'connected') {
            throw new Error(`Robot ${serialNumber} is not connected`);
        }
        try {
            return await robot.connection.sendCommand(command);
        } catch (error) {
            this.emit('robotError', { serialNumber, error });
            throw error;
        }
    }

    // Get available robots
    getAvailableRobots() {
        return Array.from(this.robots.entries())
            .filter(([_, robot]) => robot.status === 'connected')
            .map(([serialNumber, robot]) => ({
                serialNumber,
                ...robot.config
            }));
    }
}

module.exports = RobotManager; 