const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MapManager {
    constructor(robot) {
        this.robot = robot;
        this.maps = new Map(); // Map of mapId -> MapData
        this.currentMapId = null;
    }

    async refreshMaps() {
        try {
            const mapsList = await this.robot.getMaps();
            this.maps.clear();
            
            for (const mapData of mapsList) {
                this.maps.set(mapData.id, {
                    id: mapData.id,
                    uid: mapData.uid,
                    name: mapData.map_name,
                    version: mapData.map_version,
                    overlaysVersion: mapData.overlays_version,
                    createTime: mapData.create_time,
                    points: new Map() // Will store points for this map
                });
            }
            
            // Get current map
            const currentMap = await this.robot.getCurrentMap();
            this.currentMapId = currentMap.id;
            
            return Array.from(this.maps.values());
        } catch (error) {
            console.error('Error refreshing maps:', error);
            throw error;
        }
    }

    async setCurrentMap(mapId) {
        try {
            await this.robot.setCurrentMap(mapId);
            this.currentMapId = mapId;
            return this.maps.get(mapId);
        } catch (error) {
            console.error('Error setting current map:', error);
            throw error;
        }
    }

    getCurrentMap() {
        return this.maps.get(this.currentMapId);
    }

    getMapById(mapId) {
        return this.maps.get(mapId);
    }

    getMapByName(mapName) {
        return Array.from(this.maps.values()).find(map => map.name === mapName);
    }
}

class PointManager {
    constructor(robot, mapManager) {
        this.robot = robot;
        this.mapManager = mapManager;
        this.points = new Map(); // Map of pointId -> PointData
    }

    async refreshPoints(mapId) {
        try {
            const map = this.mapManager.getMapById(mapId);
            if (!map) {
                throw new Error(`Map with ID ${mapId} not found`);
            }

            // Get map details to extract points from overlays
            const response = await fetch(`${this.robot.baseUrl}/maps/${mapId}`);
            const mapDetails = await response.json();
            
            // Parse overlays to extract points
            const overlays = JSON.parse(mapDetails.overlays);
            map.points.clear();

            for (const feature of overlays.features) {
                if (feature.properties && feature.properties.name) {
                    const pointData = {
                        id: feature.id || feature.properties.name,
                        name: feature.properties.name,
                        type: feature.properties.type,
                        coordinates: feature.geometry.coordinates,
                        properties: feature.properties
                    };
                    map.points.set(pointData.id, pointData);
                }
            }

            return Array.from(map.points.values());
        } catch (error) {
            console.error('Error refreshing points:', error);
            throw error;
        }
    }

    getPointById(mapId, pointId) {
        const map = this.mapManager.getMapById(mapId);
        return map ? map.points.get(pointId) : null;
    }

    getPointByName(mapId, pointName) {
        const map = this.mapManager.getMapById(mapId);
        return map ? Array.from(map.points.values()).find(point => point.name === pointName) : null;
    }

    async moveToPoint(mapId, pointId) {
        const point = this.getPointById(mapId, pointId);
        if (!point) {
            throw new Error(`Point ${pointId} not found in map ${mapId}`);
        }

        const [x, y] = point.coordinates;
        return this.robot.moveToPoint(x, y);
    }
}

class RobotConfig {
    constructor(config) {
        this.serialNumber = config.serialNumber;
        this.publicIp = config.publicIp;
        this.localIp = config.localIp;
        this.secret = config.secret;
        this.port = 8090; // Default port for AutoXing robots
    }

    getBaseUrl() {
        return `http://${this.publicIp}:${this.port}`;
    }

    getWsUrl() {
        return `ws://${this.publicIp}:${this.port}/ws/v2/topics`;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Secret': this.secret
        };
    }
}

class AutoXingRobot {
    constructor(config) {
        if (!(config instanceof RobotConfig)) {
            throw new Error('Config must be an instance of RobotConfig');
        }
        this.config = config;
        this.ws = null;
        this.subscribedTopics = new Set();
        this.connected = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        this.reconnectDelay = 5000; // 5 seconds
        
        // Initialize managers
        this.mapManager = new MapManager(this);
        this.pointManager = new PointManager(this, this.mapManager);
    }

    // Connection Management
    async connect() {
        try {
            await this.connectWebSocket();
            this.connected = true;
            this.connectionAttempts = 0;
            //console.log(`Connected to robot ${this.config.serialNumber}`);
            return true;
        } catch (error) {
            console.error(`Failed to connect to robot ${this.config.serialNumber}:`, error);
            this.connected = false;
            return false;
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            console.log('Connecting to WebSocket URL:', this.config.getWsUrl());
            try {
                this.ws = new WebSocket(this.config.getWsUrl());
                
                this.ws.onopen = () => {
                    console.log(`WebSocket connected to robot ${this.config.serialNumber}`);
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error(`WebSocket error for robot ${this.config.serialNumber}:`, error);
                    console.error('Error details:', {
                        message: error.message,
                        type: error.type,
                        target: error.target ? {
                            readyState: error.target.readyState,
                            url: error.target.url
                        } : 'No target'
                    });
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    console.log(`WebSocket closed for robot ${this.config.serialNumber}:`, {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                    this.connected = false;
                    this.handleReconnect();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        //console.log(`Received WebSocket message from robot ${this.config.serialNumber}:`, data);
                        if (this.handleWebSocketMessage) {
                            this.handleWebSocketMessage(data);
                        } else {
                            console.warn('No message handler registered for WebSocket messages');
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                        console.error('Raw message:', event.data);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                reject(error);
            }
        });
    }

    async handleReconnect() {
        if (this.connectionAttempts < this.maxConnectionAttempts) {
            this.connectionAttempts++;
            console.log(`Attempting to reconnect to robot ${this.config.serialNumber} (Attempt ${this.connectionAttempts})`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error(`Max reconnection attempts reached for robot ${this.config.serialNumber}`);
        }
    }

    // Map Management
    async getMaps() {
        const response = await fetch(`${this.config.getBaseUrl()}/maps`, {
            headers: this.config.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to get maps for robot ${this.config.serialNumber}`);
        }
        return await response.json();
    }

    async getCurrentMap() {
        const response = await fetch(`${this.config.getBaseUrl()}/chassis/current-map`, {
            headers: this.config.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to get current map for robot ${this.config.serialNumber}`);
        }
        return await response.json();
    }

    async setCurrentMap(mapId) {
        const response = await fetch(`${this.config.getBaseUrl()}/chassis/current-map`, {
            method: 'POST',
            headers: this.config.getHeaders(),
            body: JSON.stringify({ map_id: mapId })
        });
        if (!response.ok) {
            throw new Error(`Failed to set current map for robot ${this.config.serialNumber}`);
        }
        return await response.json();
    }

    // Point Management
    async getMapPoints(mapId) {
        try {
            console.log(`Fetching map details from: ${this.config.getBaseUrl()}/maps/${mapId}`);
            const response = await fetch(`${this.config.getBaseUrl()}/maps/${mapId}`, {
                headers: this.config.getHeaders()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response not OK:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    body: errorText
                });
                throw new Error(`Failed to get map details: ${response.status} ${response.statusText}`);
            }

            const mapData = await response.json();
            console.log('Map data received');
            //console.log('Map data received:', JSON.stringify(mapData, null, 2));
            
            // Parse the overlays data from the map details
            const points = [];
            if (mapData.overlays) {
                try {
                    //console.log('Raw overlays:', mapData.overlays);
                    const overlays = JSON.parse(mapData.overlays);
                    console.log('Parsed overlays');
                    //console.log('Parsed overlays:', JSON.stringify(overlays, null, 2));
                    
                    if (overlays.type === 'FeatureCollection' && Array.isArray(overlays.features)) {
                        overlays.features.forEach(feature => {
                            if (feature.type === 'Feature' && feature.geometry && feature.geometry.type === 'Point') {
                                const point = {
                                    id: feature.id,
                                    type: feature.properties.type,
                                    name: feature.properties.name,
                                    coordinates: feature.geometry.coordinates,
                                    properties: {
                                        ...feature.properties,
                                        landmarkId: feature.properties.landmarkId,
                                        yaw: feature.properties.yaw,
                                        deviceIds: feature.properties.deviceIds,
                                        dockingPointId: feature.properties.dockingPointId,
                                        barcodeId: feature.properties.barcodeId
                                    }
                                };
                                points.push(point);
                            }
                        });
                    } else {
                        console.log('Overlays is not a valid FeatureCollection:', overlays);
                    }
                } catch (error) {
                    console.error('Error parsing overlays:', error);
                    console.error('Raw overlays content:', mapData.overlays);
                    throw new Error(`Failed to parse overlays: ${error.message}`);
                }
            } else {
                console.log('No overlays found in map data');
            }
            return points;
        } catch (error) {
            console.error('Error in getMapPoints:', error);
            throw error;
        }
    }

    async addMapPoint(mapId, pointData) {
        const response = await fetch(`${this.config.getBaseUrl()}/maps/${mapId}/points`, {
            method: 'POST',
            headers: this.config.getHeaders(),
            body: JSON.stringify(pointData)
        });
        if (!response.ok) {
            throw new Error(`Failed to add point to map ${mapId} on robot ${this.config.serialNumber}`);
        }
        return await response.json();
    }

    // Movement Control
    async createMoveAction(params) {
        try {
            //console.log('Creating move action with params:', params);
            console.log('Creating move action');
            const response = await fetch(`${this.config.getBaseUrl()}/chassis/moves`, {
                method: 'POST',
                headers: this.config.getHeaders(),
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Move action creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    body: errorText
                });
                throw new Error(`Failed to create move action: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            //console.log('Move action created successfully:', data);
            console.log('Move action created successfully');
            return data;
        } catch (error) {
            console.error('Error creating move action:', error);
            throw error;
        }
    }

    async createMoveTask(params) {
        try {
            //console.log('Creating move task with params:', params);
            console.log('Creating move task');
            const action = await this.createMoveAction(params);
            //console.log('Move action created:', action);
            return action;
        } catch (error) {
            console.error('Error creating move task:', error);
            throw error;
        }
    }

    async moveToPoint(pointName, mapId) {
        const points = await this.getMapPoints(mapId);
        const point = points.find(p => p.name === pointName);
        if (!point) {
            throw new Error(`Point ${pointName} not found in map ${mapId}`);
        }
        return this.createMoveTask({
            target: {
                type: 'point',
                point_id: point.id,
                map_id: mapId
            }
        });
    }

    // WebSocket Management
    subscribeToTopic(topic) {
        if (!this.ws || !this.connected) {
            throw new Error(`WebSocket not connected for robot ${this.config.serialNumber}`);
        }
        this.ws.send(JSON.stringify({ enable_topic: topic }));
        this.subscribedTopics.add(topic);
    }

    unsubscribeFromTopic(topic) {
        if (!this.ws || !this.connected) {
            throw new Error(`WebSocket not connected for robot ${this.config.serialNumber}`);
        }
        this.ws.send(JSON.stringify({ disable_topic: topic }));
        this.subscribedTopics.delete(topic);
    }

    // Event Handlers
    handleWebSocketMessage(data) {
        // Override this method to handle WebSocket messages
        //console.log(`Received WebSocket message from robot ${this.config.serialNumber}:`, data);
    }

    // Utility Methods
    async getChargerPose() {
        const response = await fetch(`${this.config.getBaseUrl()}/services/query_pose/charger_pose`);
        return await response.json();
    }

    async getPalletPose() {
        const response = await fetch(`${this.config.getBaseUrl()}/services/query_pose/pallet_pose`);
        return await response.json();
    }

    // Enhanced Map Management
    async initialize() {
        try {
            await this.connect();
            await this.mapManager.refreshMaps();
            if (this.mapManager.currentMapId) {
                await this.pointManager.refreshPoints(this.mapManager.currentMapId);
            }
            return true;
        } catch (error) {
            console.error('Error initializing robot:', error);
            throw error;
        }
    }

    // Enhanced Movement Methods
    async moveToNamedPoint(mapName, pointName) {
        const map = this.mapManager.getMapByName(mapName);
        if (!map) {
            throw new Error(`Map ${mapName} not found`);
        }

        const point = this.pointManager.getPointByName(map.id, pointName);
        if (!point) {
            throw new Error(`Point ${pointName} not found in map ${mapName}`);
        }

        const [x, y] = point.coordinates;
    }

    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        console.log(`Disconnected from robot ${this.config.serialNumber}`);
    }

    onWebSocketMessage(callback) {
        this.handleWebSocketMessage = callback;
    }
}

// Example usage:
/*
const robotConfig = new RobotConfig(
    'L382502104987ir',
    '47.180.91.99',
    '192.168.4.31',
    '667a51a4d948433081a272c78d10a8a4'
);

const robot = new AutoXingRobot(robotConfig);

async function example() {
    try {
        // Connect to robot
        await robot.connect();
        
        // Get available maps
        const maps = await robot.getMaps();
        console.log('Available maps:', maps);
        
        // Get points for a specific map
        const points = await robot.getMapPoints(maps[0].id);
        console.log('Map points:', points);
        
        // Move to a specific point
        await robot.moveToPoint('charging_station', maps[0].id);
        
        // Monitor movement
        robot.subscribeToTopic('/planning_state');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

example();
*/

// Export the classes
module.exports = {
    RobotConfig,
    AutoXingRobot,
    MapManager,
    PointManager
}; 