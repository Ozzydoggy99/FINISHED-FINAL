const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const MapDataHandler = require('./MapDataHandler');
const CoordinateConverter = require('./CoordinateConverter');

class MapManager extends EventEmitter {
    constructor() {
        super();
        this.mapDataHandler = new MapDataHandler();
        this.maps = new Map();
        this.points = new Map();
        this.mapData = new Map();

        // Forward events from MapDataHandler
        this.mapDataHandler.on('mapUpdated', (data) => this.emit('mapUpdated', data));
        this.mapDataHandler.on('pointsUpdated', (data) => this.emit('pointsUpdated', data));
        this.mapDataHandler.on('pointAdded', (data) => this.emit('pointAdded', data));
        this.mapDataHandler.on('pointRemoved', (data) => this.emit('pointRemoved', data));
    }

    // Handle WebSocket map data
    handleMapData(robotId, data) {
        this.mapDataHandler.handleMapUpdate(robotId, data);
    }

    // Load a map
    async loadMap(mapId, mapData) {
        try {
            this.maps.set(mapId, {
                id: mapId,
                name: mapData.name,
                version: mapData.version,
                points: new Map(),
                metadata: mapData.metadata || {}
            });

            // Load points
            if (mapData.points) {
                for (const [pointId, pointData] of Object.entries(mapData.points)) {
                    this.addPoint(mapId, pointId, pointData);
                }
            }

            this.emit('mapLoaded', mapId);
            return true;
        } catch (error) {
            this.emit('error', { mapId, error });
            return false;
        }
    }

    // Add a point to a map
    addPoint(mapId, pointId, pointData) {
        const map = this.maps.get(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }

        const point = {
            id: pointId,
            x: pointData.x,
            y: pointData.y,
            orientation: pointData.orientation,
            type: pointData.type,
            metadata: pointData.metadata || {}
        };

        map.points.set(pointId, point);
        this.emit('pointAdded', { mapId, pointId, point });
    }

    // Get a point from a map
    getPoint(mapId, pointId) {
        const map = this.maps.get(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }

        const point = map.points.get(pointId);
        if (!point) {
            throw new Error(`Point ${pointId} not found in map ${mapId}`);
        }

        return point;
    }

    // Get all points from a map
    getMapPoints(mapId) {
        const map = this.maps.get(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }

        return Array.from(map.points.values());
    }

    // Get all maps
    getAllMaps() {
        return Array.from(this.maps.values()).map(map => ({
            id: map.id,
            name: map.name,
            version: map.version,
            pointCount: map.points.size,
            metadata: map.metadata
        }));
    }

    // Save map to file
    async saveMapToFile(mapId, filePath) {
        const map = this.maps.get(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }

        const mapData = {
            id: map.id,
            name: map.name,
            version: map.version,
            points: Object.fromEntries(map.points),
            metadata: map.metadata
        };

        await fs.writeFile(filePath, JSON.stringify(mapData, null, 2));
        this.emit('mapSaved', { mapId, filePath });
    }

    // Load map from file
    async loadMapFromFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const mapData = JSON.parse(data);
            return this.loadMap(mapData.id, mapData);
        } catch (error) {
            this.emit('error', { filePath, error });
            throw error;
        }
    }

    // Update map metadata
    updateMapMetadata(mapId, metadata) {
        const map = this.maps.get(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }

        map.metadata = { ...map.metadata, ...metadata };
        this.emit('mapUpdated', { mapId, metadata });
    }

    // Remove a map
    removeMap(mapId) {
        if (this.maps.delete(mapId)) {
            this.emit('mapRemoved', mapId);
            return true;
        }
        return false;
    }

    // Validate map data
    validateMapData(mapData) {
        const requiredFields = ['id', 'name', 'version'];
        for (const field of requiredFields) {
            if (!mapData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (mapData.points) {
            for (const [pointId, pointData] of Object.entries(mapData.points)) {
                this.validatePointData(pointData);
            }
        }
    }

    // Validate point data
    validatePointData(pointData) {
        const requiredFields = ['x', 'y', 'orientation', 'type'];
        for (const field of requiredFields) {
            if (pointData[field] === undefined) {
                throw new Error(`Missing required field in point data: ${field}`);
            }
        }
    }

    // Get map data for a robot
    getRobotMapData(robotId) {
        return this.mapDataHandler.getMapData(robotId);
    }

    // Get points for a robot
    getRobotPoints(robotId) {
        return this.mapDataHandler.getPoints(robotId);
    }

    // Add a point to a robot's map
    addRobotPoint(robotId, pointData) {
        return this.mapDataHandler.addPoint(robotId, pointData);
    }

    // Remove a point from a robot's map
    removeRobotPoint(robotId, pointId) {
        return this.mapDataHandler.removePoint(robotId, pointId);
    }

    // Convert coordinates between pixel and world space
    convertToWorldCoordinates(pixel, mapData) {
        return CoordinateConverter.pixelToWorld(pixel, mapData);
    }

    convertToPixelCoordinates(world, mapData) {
        return CoordinateConverter.worldToPixel(world, mapData);
    }
}

module.exports = MapManager; 