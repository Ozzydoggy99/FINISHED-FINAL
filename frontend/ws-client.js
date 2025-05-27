// ws-client.js
// Handles WebSocket communication with the relay server.

const WS_URL = 'ws://localhost:8080';
const APPCODE = 'YOUR_SECRET_APPCODE'; // Must match backend

let ws = null;
let isConnected = false;
let messageHandlers = [];

function connect(role = 'frontend', robotId = null) {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
        isConnected = true;
        // Register as frontend or robot
        const regMsg = { type: 'register', role, appcode: APPCODE };
        if (role === 'robot' && robotId) regMsg.robotId = robotId;
        ws.send(JSON.stringify(regMsg));
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        messageHandlers.forEach(fn => fn(data));
    };
    ws.onclose = () => { isConnected = false; };
    ws.onerror = () => { isConnected = false; };
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