import wsClient from './ws-client.js';

// Initialize WebSocket connection
let ws;
let performanceChart;
let currentMetric = 'cpu';
let currentTimeRange = '1h';

// DOM Elements
const username = document.getElementById('username');
const robotMapsGrid = document.querySelector('.robot-maps-grid');
const robotMapTemplate = document.getElementById('robotMapTemplate');
const testMoveBtn = document.getElementById('testMoveBtn');
const testReserveBtn = document.getElementById('testReserveBtn');
const taskQueueContent = document.querySelector('.task-queue-content');

// Initialize the monitoring dashboard
function initializeMonitoring() {
    loadUsername();
    wsClient.connect('frontend');
    wsClient.onMessage(handleWebSocketMessage);
    initializeTestButtons();
}

// Load username from session
function loadUsername() {
    const user = sessionStorage.getItem('username');
    if (user) {
        username.textContent = user;
    } else {
        username.textContent = 'Guest';
    }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    console.log('Received WebSocket message:', message);
    
    if (!message || typeof message !== 'object') {
        console.error('Invalid message received:', message);
        return;
    }

    switch (message.type) {
        case 'robotMaps':
            displayRobotMaps(message.data);
            break;
            
        case 'task_log':
            console.log('Received task log:', message.data);
            addTaskLog(message.data);
            break;
            
        case 'error':
            console.error('WebSocket error:', message.message);
            addTaskLog(`Error: ${message.message}`);
            break;
            
        default:
            console.log('Unhandled message type:', message.type);
    }
}

// Display robot maps
function displayRobotMaps(robotMapsData) {
    // Clear existing content
    robotMapsGrid.innerHTML = '';

    // Create and append cards for each robot
    robotMapsData.forEach(data => {
        const card = createRobotMapCard(data);
        robotMapsGrid.appendChild(card);
    });
}

// Create a robot map card
function createRobotMapCard(data) {
    const template = robotMapTemplate.content.cloneNode(true);
    const card = template.querySelector('.robot-map-card');
    
    // Set robot name
    card.querySelector('.robot-name').textContent = data.robot.name;
    
    // Set map name (using the first map if there are multiple)
    const mapName = data.maps && data.maps.length > 0 ? data.maps[0].map_name : 'No map';
    card.querySelector('.map-name').textContent = `Current Location: ${mapName}`;

    return card;
}

// Add log to task queue
function addTaskLog(log) {
    console.log('Adding log to task queue:', log);
    const logEntry = document.createElement('div');
    logEntry.className = 'task-log-entry';
    logEntry.textContent = log;
    taskQueueContent.appendChild(logEntry);
    // Scroll to the bottom to show latest log
    taskQueueContent.scrollTop = taskQueueContent.scrollHeight;
}

// Initialize test buttons
function initializeTestButtons() {
    testMoveBtn.addEventListener('click', () => {
        console.log('Test Move button clicked');
        // Clear previous logs when starting new test
        taskQueueContent.innerHTML = '';
        addTaskLog('Starting test move command...');
        
        // Send test move command
        wsClient.send({
            type: 'test_move'
        });
        console.log('Sent test_move command to server');
    });

    testReserveBtn.addEventListener('click', () => {
        console.log('Test Reverse button clicked');
        // Clear previous logs when starting new test
        taskQueueContent.innerHTML = '';
        addTaskLog('Starting test reverse command...');
        
        // Send test reverse command
        wsClient.send({
            type: 'test_reverse'
        });
        console.log('Sent test_reverse command to server');
    });
}

// Initialize the monitoring dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeMonitoring); 