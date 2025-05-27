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