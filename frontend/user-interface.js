// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || (user.role !== 'boss' && user.role !== 'user')) {
    window.location.href = '/login.html';
}

// Update UI with user and template info
const usernameElement = document.getElementById('username');
if (usernameElement) {
    usernameElement.textContent = user.username;
}

// Get template ID from URL or user data
const urlParams = new URLSearchParams(window.location.search);
const templateId = urlParams.get('templateId') || user.templateId;

if (!templateId) {
    alert('No template ID found. Please log in again.');
    window.location.href = '/login.html';
}

// Load template info
fetch(`/api/templates/${templateId}`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error('Failed to load template');
    }
    return response.json();
})
.then(template => {
    const templateNameElement = document.getElementById('templateName');
    if (templateNameElement) {
        templateNameElement.textContent = template.name;
    }
    const headerElement = document.querySelector('.user-header');
    if (headerElement) {
        headerElement.style.backgroundColor = template.color;
    }
})
.catch(error => {
    console.error('Error loading template:', error);
    alert('Error loading template. Please try again.');
});

// Handle logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });
}

// Workflow state
let currentWorkflow = {
    type: null, // 'pickup' or 'dropoff'
    floor: null,
    shelfPoint: null
};

// Workflow selection
const pickupOption = document.getElementById('pickupOption');
if (pickupOption) {
    pickupOption.addEventListener('click', () => {
        currentWorkflow.type = 'pickup';
        showFloorSelection();
    });
}

const dropoffOption = document.getElementById('dropoffOption');
if (dropoffOption) {
    dropoffOption.addEventListener('click', () => {
        currentWorkflow.type = 'dropoff';
        showFloorSelection();
    });
}

// Floor selection
function showFloorSelection() {
    const workflowPage = document.getElementById('workflowPage');
    const floorPage = document.getElementById('floorPage');
    const shelfPage = document.getElementById('shelfPage');

    if (workflowPage) workflowPage.style.display = 'none';
    if (floorPage) floorPage.style.display = 'block';
    if (shelfPage) shelfPage.style.display = 'none';

    // Load template info to get the assigned robot
    fetch(`/api/templates/${templateId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load template');
        }
        return response.json();
    })
    .then(template => {
        // Parse robot if stored as JSONB string
        let robot = template.robot;
        if (typeof robot === 'string') {
            try {
                robot = JSON.parse(robot);
            } catch (e) {
                console.error('Error parsing robot JSON:', e);
                robot = null;
            }
        }
        // Get the robot's serial number from the template
        const robotSerial = robot?.serial_number || robot?.serialNumber || (template.robots && (template.robots[0]?.serial_number || template.robots[0]?.serialNumber));
        if (!robotSerial) throw new Error('No robot assigned to this template');
        // Fetch robot maps from backend cache
        return fetch('/api/robot-maps').then(res => res.json()).then(robotMaps => {
            const robotData = (robotMaps || []).find(r => r.robot.serialNumber === robotSerial);
            if (!robotData) throw new Error('No map data for assigned robot');
            return robotData.maps;
        });
    })
    .then(maps => {
        const floorGrid = document.getElementById('floorGrid');
        if (!floorGrid) return;
        floorGrid.innerHTML = '';
        maps.forEach(map => {
            if (!map.map_name) throw new Error('Map name is missing for a floor');
            const floorNumber = map.map_name.replace(/[^0-9]/g, '');
            const floorCard = document.createElement('div');
            floorCard.className = 'floor-card';
            floorCard.textContent = floorNumber || map.map_name;
            floorCard.onclick = () => selectFloor(map.map_name, map.id);
            floorGrid.appendChild(floorCard);
        });
    })
    .catch(error => {
        console.error('Error loading floors:', error);
        alert(error.message || 'Error loading floors. Please try again.');
    });
}

function selectFloor(floorName, mapId) {
    currentWorkflow.floor = floorName.replace(/[^0-9]/g, '');
    showShelfPoints(floorName, mapId);
}

// Shelf point selection
function showShelfPoints(floorName, mapId) {
    const workflowPage = document.getElementById('workflowPage');
    const floorPage = document.getElementById('floorPage');
    const shelfPage = document.getElementById('shelfPage');

    if (workflowPage) workflowPage.style.display = 'none';
    if (floorPage) floorPage.style.display = 'none';
    if (shelfPage) shelfPage.style.display = 'block';

    // Load template info to get the assigned robot
    fetch(`/api/templates/${templateId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load template');
        }
        return response.json();
    })
    .then(template => {
        // Parse robot if stored as JSONB string
        let robot = template.robot;
        if (typeof robot === 'string') {
            try {
                robot = JSON.parse(robot);
            } catch (e) {
                console.error('Error parsing robot JSON:', e);
                robot = null;
            }
        }
        // Get the robot's serial number from the template
        const robotSerial = robot?.serial_number || robot?.serialNumber || (template.robots && (template.robots[0]?.serial_number || template.robots[0]?.serialNumber));
        if (!robotSerial) throw new Error('No robot assigned to this template');
        // Fetch robot maps from backend cache
        return fetch('/api/robot-maps').then(res => res.json()).then(robotMaps => {
            const robotData = (robotMaps || []).find(r => r.robot.serialNumber === robotSerial);
            if (!robotData) throw new Error('No map data for assigned robot');
            // Find the selected map
            const map = robotData.maps.find(m => m.map_name === floorName || m.id === mapId);
            if (!map) throw new Error('Map not found');
            
            // Filter and process points
            const uniquePoints = new Set();
            map.features.forEach(feature => {
                const name = feature.name;
                if (name && (name.includes('_load') || name.includes('_load_docking'))) {
                    const baseName = name.split('_')[0];
                    // Only add points that don't start with '0' (not pickup/dropoff points)
                    if (!baseName.startsWith('0')) {
                        uniquePoints.add(baseName);
                    }
                }
            });
            return Array.from(uniquePoints);
        });
    })
    .then(points => {
        const shelfGrid = document.getElementById('shelfGrid');
        if (!shelfGrid) return;
        shelfGrid.innerHTML = '';
        
        if (points.length === 0) {
            const noPoints = document.createElement('div');
            noPoints.className = 'no-points';
            noPoints.textContent = 'No shelf points available for this floor';
            shelfGrid.appendChild(noPoints);
            return;
        }

        points.forEach(point => {
            const shelfCard = document.createElement('div');
            shelfCard.className = 'shelf-card';
            shelfCard.innerHTML = `
                <div class="shelf-card-content">
                    <span class="shelf-number">${point}</span>
                </div>
            `;
            shelfCard.onclick = () => {
                // Remove selected class from all cards
                document.querySelectorAll('.shelf-card').forEach(card => {
                    card.classList.remove('selected');
                });
                // Add selected class to clicked card
                shelfCard.classList.add('selected');
                // Update current workflow
                currentWorkflow.shelfPoint = point;
                // Show confirm button
                const confirmBtn = document.getElementById('confirmBtn');
                if (confirmBtn) {
                    confirmBtn.style.display = 'block';
                }
            };
            shelfGrid.appendChild(shelfCard);
        });
    })
    .catch(error => {
        console.error('Error loading shelf points:', error);
        alert(error.message || 'Error loading shelf points. Please try again.');
    });
}

// Confirm selection
const confirmBtn = document.getElementById('confirmBtn');
if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
        if (!currentWorkflow.type || !currentWorkflow.floor || !currentWorkflow.shelfPoint) {
            alert('Please complete all selections');
            return;
        }
        // Only send to the queue-task endpoint
        fetch(`/api/templates/${templateId}/queue-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `AppCode ${token}`
            },
            body: JSON.stringify({
                type: currentWorkflow.type,
                floor: currentWorkflow.floor,
                shelfPoint: currentWorkflow.shelfPoint
            })
        })
        .then(async response => {
            console.log('Queue-task creation response status:', response.status);
            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = null;
            }
            console.log('Queue-task creation response body:', data);
            if (!response.ok) {
                throw new Error(data && data.error ? data.error : 'Failed to queue task');
            }
            alert('Task queued successfully');
            // Reset workflow and return to start
            currentWorkflow = {
                type: null,
                floor: null,
                shelfPoint: null
            };
            const workflowPage = document.getElementById('workflowPage');
            const floorPage = document.getElementById('floorPage');
            const shelfPage = document.getElementById('shelfPage');
            const confirmBtn = document.getElementById('confirmBtn');
            if (workflowPage) workflowPage.style.display = 'block';
            if (floorPage) floorPage.style.display = 'none';
            if (shelfPage) shelfPage.style.display = 'none';
            if (confirmBtn) confirmBtn.style.display = 'none';
        })
        .catch(error => {
            console.error('Error creating task:', error);
            alert(error.message || 'Error creating task. Please try again.');
        });
    });
} 