// Check authentication
const token = localStorage.getItem('authToken');
if (!token) {
    window.location.href = '/login.html';
}

// Update username display
const user = JSON.parse(localStorage.getItem('user'));
if (user) {
    document.getElementById('username').textContent = user.username;
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

// WebSocket connection
let ws = null;
let isConnected = false;

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000/ws');

    ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected = true;
        updateConnectionStatus(true);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected = false;
        updateConnectionStatus(false);
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'robot_status':
            updateRobotStatus(data.status);
            break;
        case 'battery_state':
            updateBatteryStatus(data);
            break;
        case 'tracked_pose':
            updateRobotPosition(data);
            break;
    }
}

function updateRobotStatus(status) {
    const statusText = document.querySelector('.status-text');
    statusText.textContent = status.state || 'Unknown';
}

function updateBatteryStatus(data) {
    const batteryLevel = document.getElementById('batteryLevel');
    const batteryHealth = document.getElementById('batteryHealth');
    
    if (data.percentage) {
        batteryLevel.textContent = `${Math.round(data.percentage * 100)}%`;
        batteryHealth.style.width = `${data.percentage * 100}%`;
    }
}

function updateRobotPosition(data) {
    const position = document.getElementById('robotPosition');
    if (data.pos) {
        position.textContent = `X: ${data.pos[0].toFixed(2)}, Y: ${data.pos[1].toFixed(2)}`;
    }
}

// Robot Control Functions
function sendCommand(command) {
    if (!isConnected) {
        alert('Not connected to robot');
        return;
    }

    ws.send(JSON.stringify({
        type: 'robot_command',
        command: command
    }));
}

// Direction Controls
document.getElementById('forwardBtn').addEventListener('click', () => sendCommand('move_forward'));
document.getElementById('backwardBtn').addEventListener('click', () => sendCommand('move_backward'));
document.getElementById('leftBtn').addEventListener('click', () => sendCommand('turn_left'));
document.getElementById('rightBtn').addEventListener('click', () => sendCommand('turn_right'));

// Speed Control
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

speedSlider.addEventListener('input', (e) => {
    const speed = e.target.value;
    speedValue.textContent = `${speed}%`;
    sendCommand({
        type: 'set_speed',
        speed: speed / 100
    });
});

// Quick Actions
document.getElementById('stopBtn').addEventListener('click', () => sendCommand('emergency_stop'));
document.getElementById('homeBtn').addEventListener('click', () => sendCommand('return_home'));
document.getElementById('chargeBtn').addEventListener('click', () => sendCommand('go_to_charger'));

// Position Control
document.getElementById('moveToPositionBtn').addEventListener('click', () => {
    const x = parseFloat(document.getElementById('xPosition').value);
    const y = parseFloat(document.getElementById('yPosition').value);
    const orientation = parseFloat(document.getElementById('orientation').value);

    if (isNaN(x) || isNaN(y) || isNaN(orientation)) {
        alert('Please enter valid position values');
        return;
    }

    sendCommand({
        type: 'move_to_position',
        position: [x, y],
        orientation: orientation
    });
});

// Initialize WebSocket connection
connectWebSocket(); 