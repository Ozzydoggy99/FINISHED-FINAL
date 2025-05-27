const EventEmitter = require('events');
const CoordinateConverter = require('./CoordinateConverter');

class MapDataHandler extends EventEmitter {
    constructor() {
        super();
        this.mapData = new Map();
        this.points = new Map();
        this.robotMaps = new Map();
    }

    handleMapUpdate(robotId, data) {
        if (data.topic !== '/map') return;

        const mapData = {
            resolution: data.resolution,
            size: data.size,
            origin: data.origin,
            data: data.data,
            timestamp: Date.now()
        };

        // Store map data
        this.mapData.set(robotId, mapData);
        this.robotMaps.set(robotId, {
            id: robotId,
            mapData,
            points: new Map()
        });

        // Process points if they exist in the data
        if (data.points) {
            this.processPoints(robotId, data.points);
        }

        this.emit('mapUpdated', { robotId, mapData });
    }

    processPoints(robotId, points) {
        const robotMap = this.robotMaps.get(robotId);
        if (!robotMap) return;

        for (const [pointId, pointData] of Object.entries(points)) {
            const worldCoords = CoordinateConverter.pixelToWorld(
                { x: pointData.coordinates[0], y: pointData.coordinates[1] },
                robotMap.mapData
            );

            const point = {
                id: pointId,
                name: pointData.name,
                coordinates: [worldCoords.x, worldCoords.y],
                orientation: pointData.orientation,
                type: this.determinePointType(pointData.name),
                metadata: pointData.metadata || {}
            };

            robotMap.points.set(pointId, point);
        }

        this.emit('pointsUpdated', { robotId, points: Array.from(robotMap.points.values()) });
    }

    determinePointType(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('load')) return 'pickup';
        if (lowerName.includes('unload')) return 'dropoff';
        if (lowerName.includes('docking')) return 'docking';
        if (lowerName.includes('charger')) return 'charger';
        return 'waypoint';
    }

    getMapData(robotId) {
        return this.mapData.get(robotId);
    }

    getPoints(robotId) {
        const robotMap = this.robotMaps.get(robotId);
        return robotMap ? Array.from(robotMap.points.values()) : [];
    }

    getPoint(robotId, pointId) {
        const robotMap = this.robotMaps.get(robotId);
        return robotMap ? robotMap.points.get(pointId) : null;
    }

    addPoint(robotId, pointData) {
        const robotMap = this.robotMaps.get(robotId);
        if (!robotMap) return false;

        const point = {
            id: pointData.id || Date.now().toString(),
            name: pointData.name,
            coordinates: pointData.coordinates,
            orientation: pointData.orientation,
            type: pointData.type || this.determinePointType(pointData.name),
            metadata: pointData.metadata || {}
        };

        robotMap.points.set(point.id, point);
        this.emit('pointAdded', { robotId, point });
        return true;
    }

    removePoint(robotId, pointId) {
        const robotMap = this.robotMaps.get(robotId);
        if (!robotMap) return false;

        const deleted = robotMap.points.delete(pointId);
        if (deleted) {
            this.emit('pointRemoved', { robotId, pointId });
        }
        return deleted;
    }

    validatePoint(point, mapData) {
        return CoordinateConverter.validateCoordinates(
            { x: point.coordinates[0], y: point.coordinates[1] },
            mapData
        );
    }
}

module.exports = MapDataHandler; 