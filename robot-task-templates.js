const {
    MoveToPointAction,
    MoveToChargerAction,
    WaitAction,
    SequentialAction,
    ConditionalAction
} = require('./robot-actions.js');

class TaskTemplate {
    constructor(robot, mapManager) {
        this.robot = robot;
        this.mapManager = mapManager;
    }

    // Validate shelf point exists and is on correct floor
    async validateShelfPoint(pointNumber) {
        const floorNumber = Math.floor(pointNumber / 100);
        const map = this.mapManager.getMapByName(`Floor${floorNumber}`);
        
        if (!map) {
            throw new Error(`Floor ${floorNumber} not found`);
        }

        const loadPoint = await this.robot.getPointByName(map.id, `${pointNumber}_load`);
        const dockingPoint = await this.robot.getPointByName(map.id, `${pointNumber}_load_docking`);

        if (!loadPoint || !dockingPoint) {
            throw new Error(`Shelf point ${pointNumber} not found on floor ${floorNumber}`);
        }

        return {
            mapId: map.id,
            loadPoint,
            dockingPoint
        };
    }

    // Validate central point exists
    async validateCentralPoint(pointNumber) {
        // Check if point is in valid range
        if (pointNumber < 1 || pointNumber > 99) {
            throw new Error(`Central point ${pointNumber} is out of range (1-99)`);
        }

        // Format point number with leading zeros
        const formattedNumber = pointNumber.toString().padStart(3, '0');
        
        // Try to find the point in any map
        for (const map of this.mapManager.getRobotMaps(this.robot.config.serialNumber)) {
            const loadPoint = await this.robot.getPointByName(map.id, `${formattedNumber}_load`);
            const dockingPoint = await this.robot.getPointByName(map.id, `${formattedNumber}_load_docking`);

            if (loadPoint && dockingPoint) {
                return {
                    mapId: map.id,
                    loadPoint,
                    dockingPoint
                };
            }
        }

        throw new Error(`Central point ${pointNumber} not found in any map`);
    }

    // Create a bin pickup task (from shelf to central dropoff)
    async createBinPickupTask(shelfPointNumber, centralDropoffNumber) {
        try {
            // Validate points
            const shelf = await this.validateShelfPoint(shelfPointNumber);
            const dropoff = await this.validateCentralPoint(centralDropoffNumber);

            // Create the pickup sequence
            return new SequentialAction([
                // Move to shelf docking point
                new MoveToPointAction(`${shelfPointNumber}_load_docking`, shelf.mapId),
                new WaitAction(2000), // Wait for positioning

                // Move to shelf load point
                new MoveToPointAction(`${shelfPointNumber}_load`, shelf.mapId),
                new WaitAction(5000), // Wait for bin pickup

                // Move to central dropoff docking point
                new MoveToPointAction(`${centralDropoffNumber.toString().padStart(3, '0')}_load_docking`, dropoff.mapId),
                new WaitAction(2000), // Wait for positioning

                // Move to central dropoff load point
                new MoveToPointAction(`${centralDropoffNumber.toString().padStart(3, '0')}_load`, dropoff.mapId),
                new WaitAction(5000), // Wait for bin dropoff

                // Return to charger
                new MoveToChargerAction()
            ]);
        } catch (error) {
            console.error('Error creating bin pickup task:', error);
            throw error;
        }
    }

    // Create a bin delivery task (from central pickup to shelf)
    async createBinDeliveryTask(centralPickupNumber, shelfPointNumber) {
        try {
            // Validate points
            const pickup = await this.validateCentralPoint(centralPickupNumber);
            const shelf = await this.validateShelfPoint(shelfPointNumber);

            // Create the delivery sequence
            return new SequentialAction([
                // Move to central pickup docking point
                new MoveToPointAction(`${centralPickupNumber.toString().padStart(3, '0')}_load_docking`, pickup.mapId),
                new WaitAction(2000), // Wait for positioning

                // Move to central pickup load point
                new MoveToPointAction(`${centralPickupNumber.toString().padStart(3, '0')}_load`, pickup.mapId),
                new WaitAction(5000), // Wait for bin pickup

                // Move to shelf docking point
                new MoveToPointAction(`${shelfPointNumber}_load_docking`, shelf.mapId),
                new WaitAction(2000), // Wait for positioning

                // Move to shelf load point
                new MoveToPointAction(`${shelfPointNumber}_load`, shelf.mapId),
                new WaitAction(5000), // Wait for bin dropoff

                // Return to charger
                new MoveToChargerAction()
            ]);
        } catch (error) {
            console.error('Error creating bin delivery task:', error);
            throw error;
        }
    }

    // Get available shelf points for a specific floor
    async getAvailableShelfPoints(floorNumber) {
        const map = this.mapManager.getMapByName(`Floor${floorNumber}`);
        if (!map) {
            throw new Error(`Floor ${floorNumber} not found`);
        }

        const points = await this.robot.getMapPoints(map.id);
        const shelfPoints = points.filter(point => {
            const pointName = point.name;
            return pointName.match(/^\d{3}_load$/) && 
                   pointName.startsWith(floorNumber.toString());
        });

        return shelfPoints.map(point => {
            const pointNumber = parseInt(point.name);
            return {
                number: pointNumber,
                name: pointNumber.toString(),
                coordinates: point.coordinates
            };
        });
    }

    // Get available central points
    async getAvailableCentralPoints() {
        const centralPoints = {
            dropoff: [], // 001-049
            pickup: []   // 050-099
        };

        for (const map of this.mapManager.getRobotMaps(this.robot.config.serialNumber)) {
            const points = await this.robot.getMapPoints(map.id);
            
            points.forEach(point => {
                const pointName = point.name;
                if (pointName.match(/^\d{3}_load$/)) {
                    const pointNumber = parseInt(pointName);
                    if (pointNumber >= 1 && pointNumber <= 49) {
                        centralPoints.dropoff.push({
                            number: pointNumber,
                            name: pointNumber.toString(),
                            coordinates: point.coordinates,
                            mapId: map.id
                        });
                    } else if (pointNumber >= 50 && pointNumber <= 99) {
                        centralPoints.pickup.push({
                            number: pointNumber,
                            name: pointNumber.toString(),
                            coordinates: point.coordinates,
                            mapId: map.id
                        });
                    }
                }
            });
        }

        return centralPoints;
    }
}

module.exports = TaskTemplate; 