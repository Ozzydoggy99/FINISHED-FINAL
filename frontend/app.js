// app.js
// Main frontend logic for robot interface system. 

import wsClient from './ws-client.js';
import L from 'leaflet';

const appDiv = document.getElementById('app');
let map, robotMarkers = {};

function initMap() {
    map = L.map('mapView').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function updateRobotMarkers(robots) {
    if (!map) return;
    // Remove old markers
    Object.values(robotMarkers).forEach(marker => map.removeLayer(marker));
    robotMarkers = {};
    robots.forEach(r => {
        if (r.position) {
            const marker = L.marker([r.position.lat, r.position.lng]).addTo(map);
            marker.bindPopup(r.id);
            robotMarkers[r.id] = marker;
        }
    });
}

function render() {
    appDiv.innerHTML = `
        <div id="connection">
            <button id="connectBtn">Connect to Relay Server</button>
            <span id="connStatus">Not connected</span>
        </div>
        <hr>
        <div id="robots">
            <h2>Robots</h2>
            <button id="refreshRobots">Refresh</button>
            <ul id="robotList"></ul>
            <input id="robotIdInput" placeholder="Robot ID">
            <button id="addRobotBtn">Add Robot</button>
        </div>
        <hr>
        <div id="map">
            <h2>Map</h2>
            <div id="mapView" style="height:300px;background:#eaeaea;text-align:center;line-height:300px;">Map Placeholder</div>
            <input type="file" id="mapUpload" accept=".geojson">
            <button id="listMapsBtn">List Maps</button>
            <ul id="mapList"></ul>
        </div>
        <hr>
        <div id="tasks">
            <h2>Tasks</h2>
            <button id="refreshTasks">Refresh</button>
            <ul id="taskList"></ul>
            <input id="taskInput" placeholder="Task description">
            <button id="addTaskBtn">Add Task</button>
        </div>
    `;
}

render();
initMap();

// Connection logic
const connectBtn = document.getElementById('connectBtn');
const connStatus = document.getElementById('connStatus');
connectBtn.onclick = () => {
    wsClient.connect();
    connStatus.textContent = 'Connecting...';
};

wsClient.onMessage((msg) => {
    if (msg.status === 'registered') {
        connStatus.textContent = 'Connected';
        // Auto-refresh robots and tasks
        wsClient.send({ type: 'get_robots' });
        wsClient.send({ type: 'get_tasks' });
        wsClient.send({ type: 'list_maps' });
    }
    if (msg.type === 'robots') {
        const robotList = document.getElementById('robotList');
        robotList.innerHTML = '';
        msg.robots.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r.id || JSON.stringify(r);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => wsClient.send({ type: 'delete_robot', robotId: r.id });
            li.appendChild(delBtn);
            robotList.appendChild(li);
        });
        updateRobotMarkers(msg.robots);
    }
    if (msg.type === 'tasks') {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        msg.tasks.forEach(t => {
            const li = document.createElement('li');
            li.textContent = t.id ? `${t.id}: ${t.desc}` : JSON.stringify(t);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => wsClient.send({ type: 'delete_task', taskId: t.id });
            li.appendChild(delBtn);
            taskList.appendChild(li);
        });
    }
    if (msg.type === 'maps') {
        const mapList = document.getElementById('mapList');
        mapList.innerHTML = '';
        msg.maps.forEach(m => {
            const li = document.createElement('li');
            li.textContent = m;
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => wsClient.send({ type: 'delete_map', filename: m });
            li.appendChild(delBtn);
            mapList.appendChild(li);
        });
    }
    if (msg.type === 'robot_position') {
        // Real-time position update from robot
        // msg: { type: 'robot_position', robotId, position: {lat, lng} }
        if (msg.robotId && msg.position) {
            if (robotMarkers[msg.robotId]) {
                robotMarkers[msg.robotId].setLatLng([msg.position.lat, msg.position.lng]);
            } else {
                const marker = L.marker([msg.position.lat, msg.position.lng]).addTo(map);
                marker.bindPopup(msg.robotId);
                robotMarkers[msg.robotId] = marker;
            }
        }
    }
});

// Robot add/refresh
const addRobotBtn = document.getElementById('addRobotBtn');
const robotIdInput = document.getElementById('robotIdInput');
addRobotBtn.onclick = () => {
    const id = robotIdInput.value.trim();
    if (id) wsClient.send({ type: 'add_robot', robot: { id } });
};
document.getElementById('refreshRobots').onclick = () => wsClient.send({ type: 'get_robots' });

// Task add/refresh
const addTaskBtn = document.getElementById('addTaskBtn');
const taskInput = document.getElementById('taskInput');
addTaskBtn.onclick = () => {
    const desc = taskInput.value.trim();
    if (desc) wsClient.send({ type: 'add_task', task: { id: Date.now().toString(), desc } });
};
document.getElementById('refreshTasks').onclick = () => wsClient.send({ type: 'get_tasks' });

// Map upload/list
const mapUpload = document.getElementById('mapUpload');
mapUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            wsClient.send({ type: 'save_map', filename: file.name, geojson: evt.target.result });
        };
        reader.readAsText(file);
    }
};
document.getElementById('listMapsBtn').onclick = () => wsClient.send({ type: 'list_maps' });

class RobotWorkflowUI {
    constructor() {
        this.ws = null;
        this.robots = new Map();
        this.workflows = new Map();
        this.maps = new Map();
        this.activeWorkflowId = null;
        this.statusToast = new bootstrap.Toast(document.getElementById('statusToast'));
        
        this.initializeWebSocket();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeWebSocket() {
        this.ws = new WebSocket(`ws://${window.location.host}`);
        
        this.ws.onopen = () => {
            this.showStatus('Connected to server');
        };

        this.ws.onclose = () => {
            this.showStatus('Disconnected from server', 'danger');
            setTimeout(() => this.initializeWebSocket(), 5000);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    initializeEventListeners() {
        // Start workflow button
        document.getElementById('startWorkflow').addEventListener('click', () => {
            const template = document.getElementById('workflowTemplate').value;
            const robotId = document.getElementById('robotSelect').value;
            const mapId = document.getElementById('mapSelect').value;

            if (!robotId || !mapId) {
                this.showStatus('Please select a robot and map', 'warning');
                return;
            }

            this.startWorkflow(template, robotId, mapId);
        });

        // Stop workflow button
        document.getElementById('stopWorkflow').addEventListener('click', () => {
            if (this.activeWorkflowId) {
                this.stopWorkflow(this.activeWorkflowId);
            }
        });
    }

    async loadInitialData() {
        try {
            // Load robots
            const robotsResponse = await fetch('/api/robots');
            const robotsData = await robotsResponse.json();
            this.updateRobotList(robotsData.robots);

            // Load maps
            const mapsResponse = await fetch('/api/maps');
            const mapsData = await mapsResponse.json();
            this.updateMapList(mapsData.maps);
        } catch (error) {
            this.showStatus('Failed to load initial data', 'danger');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'robot_status_updated':
                this.updateRobotStatus(data.robotId, data.status);
                break;

            case 'workflow_started':
                this.addActiveWorkflow(data.workflow);
                break;

            case 'workflow_completed':
                this.updateWorkflowStatus(data.workflow.id, 'completed');
                break;

            case 'workflow_failed':
                this.updateWorkflowStatus(data.workflow.id, 'failed', data.error);
                break;

            case 'error':
                this.showStatus(data.message, 'danger');
                break;
        }
    }

    startWorkflow(template, robotId, mapId) {
        this.ws.send(JSON.stringify({
            type: 'start_workflow',
            template,
            robotId,
            mapId
        }));
    }

    stopWorkflow(workflowId) {
        this.ws.send(JSON.stringify({
            type: 'stop_workflow',
            workflowId
        }));
    }

    updateRobotList(robots) {
        const robotList = document.getElementById('robotList');
        const robotSelect = document.getElementById('robotSelect');
        
        robotList.innerHTML = '';
        robotSelect.innerHTML = '<option value="">Select Robot</option>';

        robots.forEach(robot => {
            // Add to status list
            const robotItem = document.createElement('div');
            robotItem.className = 'list-group-item';
            robotItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${robot.name}</h6>
                        <small class="text-muted">${robot.id}</small>
                    </div>
                    <span class="badge bg-secondary">${robot.status}</span>
                </div>
            `;
            robotList.appendChild(robotItem);

            // Add to select dropdown
            const option = document.createElement('option');
            option.value = robot.id;
            option.textContent = robot.name;
            robotSelect.appendChild(option);
        });
    }

    updateMapList(maps) {
        const mapSelect = document.getElementById('mapSelect');
        mapSelect.innerHTML = '<option value="">Select Map</option>';

        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = map.name;
            mapSelect.appendChild(option);
        });
    }

    updateRobotStatus(robotId, status) {
        const robotItem = document.querySelector(`#robotList .list-group-item[data-robot-id="${robotId}"]`);
        if (robotItem) {
            const badge = robotItem.querySelector('.badge');
            badge.textContent = status;
            badge.className = `badge bg-${this.getStatusColor(status)}`;
        }
    }

    addActiveWorkflow(workflow) {
        const activeWorkflows = document.getElementById('activeWorkflows');
        const workflowItem = document.createElement('div');
        workflowItem.className = 'list-group-item';
        workflowItem.dataset.workflowId = workflow.id;
        workflowItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${workflow.template}</h6>
                    <small class="text-muted">Robot: ${workflow.robotId}</small>
                </div>
                <span class="badge bg-primary">${workflow.status}</span>
            </div>
            <div class="progress mt-2">
                <div class="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
        `;
        activeWorkflows.appendChild(workflowItem);
        this.activeWorkflowId = workflow.id;
        document.getElementById('stopWorkflow').disabled = false;
    }

    updateWorkflowStatus(workflowId, status, error = null) {
        const workflowItem = document.querySelector(`#activeWorkflows .list-group-item[data-workflow-id="${workflowId}"]`);
        if (workflowItem) {
            const badge = workflowItem.querySelector('.badge');
            badge.textContent = status;
            badge.className = `badge bg-${this.getStatusColor(status)}`;

            if (status === 'completed' || status === 'failed') {
                document.getElementById('stopWorkflow').disabled = true;
                this.activeWorkflowId = null;
            }

            if (error) {
                this.showStatus(error, 'danger');
            }
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'connected':
            case 'completed':
                return 'success';
            case 'disconnected':
            case 'failed':
                return 'danger';
            case 'running':
                return 'primary';
            default:
                return 'secondary';
        }
    }

    showStatus(message, type = 'info') {
        const toast = document.getElementById('statusToast');
        toast.querySelector('.toast-body').textContent = message;
        toast.className = `toast bg-${type} text-white`;
        this.statusToast.show();
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RobotWorkflowUI();
}); 