const { RobotConfig, AutoXingRobot } = require('./robot-interface.js');

class RobotMapManager {
    constructor(updateInterval = 30000) { // Default 30 seconds
        this.robots = new Map(); // Map of robot serial numbers to robot instances
        this.robotMaps = new Map(); // Map of robot serial numbers to their maps
        this.updateInterval = updateInterval;
        this.updateTimer = null;
    }

    // Add a new robot to the manager
    addRobot(serialNumber, publicIp, localIp, secret) {
        if (this.robots.has(serialNumber)) {
            console.warn(`Robot ${serialNumber} already exists in manager`);
            return;
        }

        const config = new RobotConfig({ serialNumber, publicIp, localIp, secret });
        const robot = new AutoXingRobot(config);
        this.robots.set(serialNumber, robot);
        this.robotMaps.set(serialNumber, {
            maps: new Map(),
            lastUpdate: null,
            error: null
        });

        console.log(`Added robot ${serialNumber} to manager`);
    }

    // Remove a robot from the manager
    removeRobot(serialNumber) {
        if (!this.robots.has(serialNumber)) {
            console.warn(`Robot ${serialNumber} not found in manager`);
            return;
        }

        const robot = this.robots.get(serialNumber);
        robot.disconnect();
        this.robots.delete(serialNumber);
        this.robotMaps.delete(serialNumber);
        console.log(`Removed robot ${serialNumber} from manager`);
    }

    // Start the automatic update process
    startUpdates() {
        if (this.updateTimer) {
            console.warn('Updates already running');
            return;
        }

        console.log(`Starting automatic updates every ${this.updateInterval}ms`);
        this.updateTimer = setInterval(() => this.updateAllRobots(), this.updateInterval);
        // Do an initial update
        this.updateAllRobots();
    }

    // Stop the automatic update process
    stopUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('Stopped automatic updates');
        }
    }

    // Update all robots' map data
    async updateAllRobots() {
        console.log('Starting update of all robots...');
        const updatePromises = Array.from(this.robots.entries()).map(([serialNumber, robot]) => 
            this.updateRobotData(serialNumber, robot)
        );
        await Promise.allSettled(updatePromises);
    }

    // Update a single robot's map data
    async updateRobotData(serialNumber, robot) {
        try {
            const robotData = this.robotMaps.get(serialNumber);
            if (!robotData) {
                throw new Error(`No data structure found for robot ${serialNumber}`);
            }

            // Connect to robot if not connected
            if (!robot.connected) {
                await robot.connect();
            }

            // Get all maps
            const maps = await robot.getMaps();
            const currentMap = await robot.getCurrentMap();

            // Update the robot's map data
            robotData.maps.clear();
            for (const map of maps) {
                const points = await robot.getMapPoints(map.id);
                robotData.maps.set(map.id, {
                    id: map.id,
                    name: map.map_name,
                    uid: map.uid,
                    isCurrent: map.id === currentMap.id,
                    points: points,
                    lastUpdate: new Date()
                });
            }

            robotData.lastUpdate = new Date();
            robotData.error = null;

            console.log(`Successfully updated data for robot ${serialNumber}`);
            return true;
        } catch (error) {
            console.error(`Error updating robot ${serialNumber}:`, error);
            const robotData = this.robotMaps.get(serialNumber);
            if (robotData) {
                robotData.error = error.message;
            }
            return false;
        }
    }

    // Get all maps for a specific robot
    getRobotMaps(serialNumber) {
        const robotData = this.robotMaps.get(serialNumber);
        if (!robotData) {
            throw new Error(`No data found for robot ${serialNumber}`);
        }
        return Array.from(robotData.maps.values());
    }

    // Get a specific map for a robot
    getRobotMap(serialNumber, mapId) {
        const robotData = this.robotMaps.get(serialNumber);
        if (!robotData) {
            throw new Error(`No data found for robot ${serialNumber}`);
        }
        return robotData.maps.get(mapId);
    }

    // Get all points for a specific map on a robot
    getRobotMapPoints(serialNumber, mapId) {
        const map = this.getRobotMap(serialNumber, mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found for robot ${serialNumber}`);
        }
        return map.points;
    }

    // Get a specific point by name from a map
    getPointByName(serialNumber, mapId, pointName) {
        const points = this.getRobotMapPoints(serialNumber, mapId);
        return points.find(point => point.name === pointName);
    }

    // Get all robots' status
    getRobotsStatus() {
        return Array.from(this.robotMaps.entries()).map(([serialNumber, data]) => ({
            serialNumber,
            lastUpdate: data.lastUpdate,
            error: data.error,
            mapCount: data.maps.size,
            currentMap: Array.from(data.maps.values()).find(map => map.isCurrent)
        }));
    }
}

// Example usage:
/*
const manager = new RobotMapManager(30000); // 30 second updates

// Add robots
manager.addRobot(
    'L382502104987ir',
    '47.180.91.99',
    '192.168.4.31',
    '667a51a4d948433081a272c78d10a8a4'
);

// Start automatic updates
manager.startUpdates();

// Get robot status
console.log(manager.getRobotsStatus());

// Get specific map points
const points = manager.getRobotMapPoints('L382502104987ir', 4);
console.log('Points:', points);

// Get point by name
const chargingStation = manager.getPointByName('L382502104987ir', 4, 'Charging Station');
console.log('Charging Station:', chargingStation);

// Stop updates when done
manager.stopUpdates();
*/

module.exports = RobotMapManager; 