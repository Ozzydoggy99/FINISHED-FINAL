const WebSocket = require('ws');
const EventEmitter = require('events');

class RobotConnection extends EventEmitter {
    constructor(ip, port, secret) {
        super();
        this.ip = ip;
        this.port = port;
        this.secret = secret;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`ws://${this.ip}:${this.port}/ws/v2/topics`);

                this.ws.on('open', () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.setupConnection();
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        console.log('Received from robot:', JSON.stringify(message, null, 2));
                        this.emit('message', message);
                    } catch (error) {
                        console.error('Failed to parse message:', error);
                        this.emit('error', new Error('Failed to parse message'));
                    }
                });

                this.ws.on('close', () => {
                    console.log('WebSocket connection closed');
                    this.connected = false;
                    this.emit('disconnected');
                    this.handleReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                });
            } catch (error) {
                console.error('Connection error:', error);
                reject(error);
            }
        });
    }

    setupConnection() {
        // Subscribe to topics
        this.send({
            enable_topic: [
                '/map',
                '/tracked_pose',
                '/battery_state',
                '/planning_state',
                '/robot_status',
                '/error_state'
            ]
        });
        console.log('Subscribed to robot topics');

        // Request map data
        this.send({
            type: 'get_map_data',
            id: Date.now().toString()
        });
        console.log('Requested map data');
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect().catch(() => {
                    this.handleReconnect();
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnectFailed');
        }
    }

    send(data) {
        if (!this.connected) {
            throw new Error('Not connected to robot');
        }
        console.log('Sending to robot:', JSON.stringify(data));
        this.ws.send(JSON.stringify(data));
    }

    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, 30000);

            const handler = (response) => {
                if (response.command_id === command.id) {
                    clearTimeout(timeout);
                    this.removeListener('commandResponse', handler);
                    console.log('Received command response:', response);
                    resolve(response);
                }
            };

            this.on('commandResponse', handler);
            console.log('Sending command to robot:', command);
            this.send(command);
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    // Movement commands
    async moveToPoint(point, options = {}) {
        const command = {
            id: Date.now().toString(),
            type: "standard",
            target_x: point.x,
            target_y: point.y,
            target_ori: point.orientation,
            properties: {
                max_trans_vel: options.maxTransVel || 0.5,
                max_rot_vel: options.maxRotVel || 0.5,
                acc_lim_x: options.accLimX || 0.5,
                acc_lim_theta: options.accLimTheta || 0.5,
                planning_mode: options.planningMode || "directional"
            }
        };
        return this.sendCommand(command);
    }

    async alignWithRack(point) {
        const command = {
            id: Date.now().toString(),
            type: "align_with_rack",
            target_x: point.x,
            target_y: point.y,
            target_ori: point.orientation
        };
        return this.sendCommand(command);
    }

    async jackUp() {
        const command = {
            id: Date.now().toString(),
            type: "jack_up"
        };
        return this.sendCommand(command);
    }

    async jackDown() {
        const command = {
            id: Date.now().toString(),
            type: "jack_down"
        };
        return this.sendCommand(command);
    }
}

module.exports = RobotConnection; 