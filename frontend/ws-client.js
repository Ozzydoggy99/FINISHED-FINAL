// ws-client.js
// Handles WebSocket communication with the relay server.

const WS_URL = 'ws://localhost:3000';
const APPCODE = 'YOUR_SECRET_APPCODE'; // Must match backend

let ws = null;
let isConnected = false;
let messageHandlers = [];

function connect(role = 'frontend', robotId = null) {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
        isConnected = true;
        console.log('Connected to WebSocket server');
        // Register as frontend or robot
        const regMsg = { type: 'register', role, appcode: APPCODE };
        if (role === 'robot' && robotId) regMsg.robotId = robotId;
        ws.send(JSON.stringify(regMsg));
    };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            messageHandlers.forEach(fn => fn(data));
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    ws.onclose = () => { 
        isConnected = false;
        console.log('Disconnected from WebSocket server');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => connect(role, robotId), 5000);
    };
    ws.onerror = (error) => { 
        isConnected = false;
        console.error('WebSocket error:', error);
    };
}

function send(msg) {
    if (ws && isConnected) {
        ws.send(JSON.stringify({ ...msg, appcode: APPCODE }));
    }
}

function onMessage(fn) {
    messageHandlers.push(fn);
}

export default {
    connect,
    send,
    onMessage
}; 