const WebSocket = require('ws');
const EventEmitter = require('events');

class ESP32ElevatorController extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        
        // Initialize relay states (false = OFF, true = ON)
        this.relayStates = {
            doorOpen: false,    // Relay 1: Door Open
            doorClose: false,   // Relay 2: Door Close
            floor1: false,      // Relay 3: Floor 1 Selection
            floor2: false,      // Relay 4: Floor 2 Selection
            floor3: false,      // Relay 5: Floor 3 Selection
            floor4: false       // Relay 6: Floor 4 Selection
        };
    }

    async connect() {
        try {
            console.log(`Connecting to ESP32 at ${this.config.ip}:${this.config.port}`);
            this.ws = new WebSocket(`ws://${this.config.ip}:${this.config.port}`);

            this.ws.on('open', () => {
                console.log('Connected to ESP32');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            this.ws.on('close', () => {
                console.log('Disconnected from ESP32');
                this.connected = false;
                this.handleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.connected = false;
            });

        } catch (error) {
            console.error('Connection error:', error);
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'relay_state':
                this.relayStates = { ...this.relayStates, ...message.states };
                this.emit('relay_state_change', this.relayStates);
                break;
            case 'error':
                console.error('ESP32 error:', message.error);
                this.emit('error', message.error);
                break;
            default:
                console.log('Unknown message type:', message);
        }
    }

    async setRelay(relay, state) {
        if (!this.connected) {
            throw new Error('Not connected to ESP32');
        }

        const message = {
            type: 'set_relay',
            relay,
            state
        };

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error setting relay:', error);
            return false;
        }
    }

    // Elevator Control Functions
    async openDoor() {
        await this.setRelay('doorOpen', true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.setRelay('doorOpen', false);
    }

    async closeDoor() {
        await this.setRelay('doorClose', true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.setRelay('doorClose', false);
    }

    async selectFloor(floorNumber) {
        const relayName = `floor${floorNumber}`;
        if (!(relayName in this.relayStates)) {
            throw new Error(`Invalid floor number: ${floorNumber}`);
        }

        // Pulse the floor selection relay
        await this.setRelay(relayName, true);
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.setRelay(relayName, false);
    }

    // High-level elevator control sequence
    async goToFloor(targetFloor) {
        try {
            // 1. Open door at current floor
            await this.openDoor();
            
            // 2. Wait for robot to enter/exit
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 3. Close door
            await this.closeDoor();
            
            // 4. Select target floor
            await this.selectFloor(targetFloor);
            
            // 5. Wait for elevator to reach floor (estimated time)
            const FLOOR_TRAVEL_TIME = 5000; // 5 seconds per floor
            await new Promise(resolve => setTimeout(resolve, FLOOR_TRAVEL_TIME));
            
            // 6. Open door at target floor
            await this.openDoor();
            
            // 7. Wait for robot to enter/exit
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 8. Close door
            await this.closeDoor();
            
            return true;
        } catch (error) {
            console.error('Error in elevator sequence:', error);
            return false;
        }
    }
}

module.exports = ESP32ElevatorController; 