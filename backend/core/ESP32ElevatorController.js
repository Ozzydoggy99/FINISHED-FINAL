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

    logRelayStates() {
        console.log('\nCurrent Relay States:');
        console.log('┌──────────────┬───────┐');
        console.log('│    Relay     │ State │');
        console.log('├──────────────┼───────┤');
        Object.entries(this.relayStates).forEach(([relay, state]) => {
            console.log(`│ ${relay.padEnd(12)} │ ${state ? ' ON  ' : ' OFF '} │`);
        });
        console.log('└──────────────┴───────┘');
    }

    async connect() {
        try {
            console.log(`\n[ESP32] Connecting to ESP32 at ${this.config.ip}:${this.config.port}`);
            this.ws = new WebSocket(`ws://${this.config.ip}:${this.config.port}`);

            this.ws.on('open', () => {
                console.log('[ESP32] Connected to ESP32');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                this.logRelayStates();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[ESP32] Error parsing message:', error);
                }
            });

            this.ws.on('close', () => {
                console.log('[ESP32] Disconnected from ESP32');
                this.connected = false;
                this.handleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('[ESP32] WebSocket error:', error);
                this.connected = false;
            });

        } catch (error) {
            console.error('[ESP32] Connection error:', error);
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[ESP32] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('[ESP32] Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'relay_state':
                const oldStates = {...this.relayStates};
                this.relayStates = { ...this.relayStates, ...message.states };
                
                // Log changes
                const changes = Object.entries(this.relayStates).filter(([key, value]) => oldStates[key] !== value);
                if (changes.length > 0) {
                    console.log('\n[ESP32] Relay state changes:');
                    changes.forEach(([relay, state]) => {
                        console.log(`       ${relay}: ${oldStates[relay] ? 'ON' : 'OFF'} → ${state ? 'ON' : 'OFF'}`);
                    });
                    this.logRelayStates();
                }
                
                this.emit('relay_state_change', this.relayStates);
                break;
            case 'error':
                console.error('[ESP32] ESP32 error:', message.error);
                this.emit('error', message.error);
                break;
            default:
                console.log('[ESP32] Unknown message type:', message);
        }
    }

    async setRelay(relay, state) {
        if (!this.connected) {
            throw new Error('Not connected to ESP32');
        }

        console.log(`\n[ESP32] Setting ${relay} to ${state ? 'ON' : 'OFF'}`);
        const message = {
            type: 'set_relay',
            relay,
            state
        };

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[ESP32] Error setting relay:', error);
            return false;
        }
    }

    // Elevator Control Functions
    async openDoor() {
        console.log('\n[ESP32] Opening door...');
        await this.setRelay('doorOpen', true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.setRelay('doorOpen', false);
        console.log('[ESP32] Door opened');
    }

    async closeDoor() {
        console.log('\n[ESP32] Closing door...');
        await this.setRelay('doorClose', true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.setRelay('doorClose', false);
        console.log('[ESP32] Door closed');
    }

    async selectFloor(floorNumber) {
        const relayName = `floor${floorNumber}`;
        if (!(relayName in this.relayStates)) {
            throw new Error(`Invalid floor number: ${floorNumber}`);
        }

        console.log(`\n[ESP32] Selecting floor ${floorNumber}...`);
        // Pulse the floor selection relay
        await this.setRelay(relayName, true);
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.setRelay(relayName, false);
        console.log(`[ESP32] Floor ${floorNumber} selected`);
    }

    // High-level elevator control sequence
    async goToFloor(targetFloor) {
        try {
            console.log(`\n[ESP32] Starting elevator sequence to floor ${targetFloor}`);
            
            // 1. Open door at current floor
            await this.openDoor();
            
            // 2. Wait for robot to enter/exit
            console.log('[ESP32] Waiting for robot to enter/exit (5s)...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 3. Close door
            await this.closeDoor();
            
            // 4. Select target floor
            await this.selectFloor(targetFloor);
            
            // 5. Wait for elevator to reach floor (estimated time)
            const FLOOR_TRAVEL_TIME = 5000; // 5 seconds per floor
            console.log(`[ESP32] Waiting for elevator to reach floor ${targetFloor} (${FLOOR_TRAVEL_TIME/1000}s)...`);
            await new Promise(resolve => setTimeout(resolve, FLOOR_TRAVEL_TIME));
            
            // 6. Open door at target floor
            await this.openDoor();
            
            // 7. Wait for robot to enter/exit
            console.log('[ESP32] Waiting for robot to enter/exit (5s)...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 8. Close door
            await this.closeDoor();
            
            console.log('[ESP32] Elevator sequence completed successfully');
            return true;
        } catch (error) {
            console.error('[ESP32] Error in elevator sequence:', error);
            return false;
        }
    }
}

module.exports = ESP32ElevatorController; 