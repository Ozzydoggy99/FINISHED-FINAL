// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const usernameElement = document.getElementById('username');
if (usernameElement) {
    const user = JSON.parse(localStorage.getItem('user'));
    usernameElement.textContent = user ? user.username : 'Unknown';
}

async function fetchTemplates() {
    const res = await fetch('/api/templates', {
        headers: { 'Authorization': `AppCode ${token}` }
    });
    return res.json();
}

async function fetchRobots() {
    const res = await fetch('/api/robots', {
        headers: { 'Authorization': `AppCode ${token}` }
    });
    return res.json();
}

async function fetchQueue(templateId) {
    const res = await fetch(`/api/templates/${templateId}/queue`, {
        headers: { 'Authorization': `AppCode ${token}` }
    });
    return res.json();
}

function normalizeRobot(robot) {
    return {
        ...robot,
        serialNumber: robot.serial_number || robot.serialNumber,
        publicIp: robot.public_ip || robot.publicIp,
        privateIp: robot.private_ip || robot.privateIp,
        secretKey: robot.secret_key || robot.secretKey,
        name: robot.name || robot.serial_number || robot.serialNumber
    };
}

// Logout button handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });
}

async function cancelTask(templateId, taskId) {
    try {
        const res = await fetch(`/api/templates/${templateId}/queue/${taskId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `AppCode ${token}` }
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to cancel task');
        }
        // Refresh the monitoring cards to show updated queue
        await renderMonitoringCards();
    } catch (err) {
        console.error('Error cancelling task:', err);
        alert('Failed to cancel task: ' + err.message);
    }
}

async function goHome(templateId, robotSerial) {
    try {
        // First get the template to find the robot and map info
        const templateRes = await fetch(`/api/templates/${templateId}`, {
            headers: { 'Authorization': `AppCode ${token}` }
        });
        if (!templateRes.ok) {
            throw new Error('Failed to fetch template info');
        }
        const template = await templateRes.json();

        // Parse robot data
        let robot = template.robot;
        if (typeof robot === 'string') {
            try { robot = JSON.parse(robot); } catch (e) { robot = null; }
        }
        if (!robot) {
            throw new Error('No robot found in template');
        }

        // Get the robot's maps to find the charger point
        const mapsRes = await fetch(`/api/robot-maps`, {
            headers: { 'Authorization': `AppCode ${token}` }
        });
        if (!mapsRes.ok) {
            throw new Error('Failed to fetch robot maps');
        }
        const robotMaps = await mapsRes.json();
        const robotMap = robotMaps.find(rm => rm.robot.serialNumber === robotSerial);
        if (!robotMap || !robotMap.maps || robotMap.maps.length === 0) {
            throw new Error('No maps found for robot');
        }

        // Find the first map with a charger point
        let chargerPoint = null;
        let mapName = null;
        for (const map of robotMap.maps) {
            const features = typeof map.features === 'string' ? JSON.parse(map.features) : map.features;
            const charger = features.find(f => 
                f.name === 'charger_docking' || 
                f.name === 'Charging Station_docking' || 
                f.name === 'charger' || 
                f.name === 'Charging Station'
            );
            if (charger) {
                chargerPoint = charger;
                mapName = map.map_name;
                break;
            }
        }
        if (!chargerPoint) {
            throw new Error('No charger point found in any map');
        }

        // Extract floor number from map name
        const floor = mapName.replace('Floor', '');

        // Queue the return task
        const queueRes = await fetch(`/api/templates/${templateId}/queue-task`, {
            method: 'POST',
            headers: { 
                'Authorization': `AppCode ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'return_to_charger',
                floor: floor,
                shelfPoint: 'charger' // Using 'charger' as a placeholder since it's required
            })
        });

        if (!queueRes.ok) {
            const errorData = await queueRes.json();
            throw new Error(errorData.error || 'Failed to queue return task');
        }

        // Refresh the monitoring cards to show the new task
        await renderMonitoringCards();
    } catch (err) {
        console.error('Error sending robot home:', err);
        alert('Failed to send robot home: ' + err.message);
    }
}

function createMonitoringCard(template, robots, queue) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.style.height = 'auto';
    card.style.overflow = 'visible';
    let robotsHtml = 'None';
    if (robots.length > 0) {
        robotsHtml = robots.map(r => `${r.name || ''} (${r.serialNumber})`).join(', ');
    }
    // Build queue as a bordered container with clickable task rectangles
    const visibleQueue = queue.filter(task => task.status === 'queued' || task.status === 'in_progress');
    let queueHtml = '<div class="task-queue-container" style="border:2px solid #bbb; border-radius:8px; padding:12px; margin-top:8px;">No tasks in queue</div>';
    if (visibleQueue.length > 0) {
        queueHtml = `<div class="task-queue-container" style="border:2px solid #bbb; border-radius:8px; padding:12px; margin-top:8px; display:flex; flex-wrap:wrap; gap:10px;">
            ${visibleQueue.map(task => {
                const robot = robots.find(r => r.serialNumber === task.robot_serial_number);
                const robotLabel = robot ? `${robot.name || ''} (${robot.serialNumber})` : task.robot_serial_number;
                return `<div class="task-rect" style="background:#f5f5f5; border:1.5px solid #2196F3; border-radius:6px; padding:10px 16px; min-width:160px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.04); transition:box-shadow 0.2s; display:flex; flex-direction:column; align-items:flex-start; position:relative;" tabindex="0">
                    <div><strong>Robot:</strong> ${robotLabel}</div>
                    <div><strong>Type:</strong> ${task.type}</div>
                    <div><strong>Status:</strong> ${task.status}</div>
                    <button onclick="event.stopPropagation(); cancelTask('${template.id}', '${task.id}')" 
                            style="position:absolute; top:8px; right:8px; background:#ff4444; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:12px; transition:background 0.2s;"
                            onmouseover="this.style.background='#ff0000'"
                            onmouseout="this.style.background='#ff4444'">
                        Cancel
                    </button>
                </div>`;
            }).join('')}
        </div>`;
    }

    // Add go home buttons for each robot in the template
    const goHomeButtons = robots.map(robot => `
        <button onclick="goHome('${template.id}', '${robot.serialNumber}')"
                style="background:#4CAF50; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:12px; transition:background 0.2s; margin-left:8px;"
                onmouseover="this.style.background='#45a049'"
                onmouseout="this.style.background='#4CAF50'">
            Go Home (${robot.name || robot.serialNumber})
        </button>
    `).join('');

    card.innerHTML = `
        <div class="template-card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3>${template.name}</h3>
            <div style="display:flex; gap:8px;">
                ${goHomeButtons}
            </div>
        </div>
        <div class="template-card-content" style="display:block !important;">
            <div><strong>Robots:</strong> ${robotsHtml}</div>
            <div><strong>Task Queue:</strong></div>
            ${queueHtml}
        </div>
    `;
    return card;
}

async function renderMonitoringCards() {
    const cardGrid = document.getElementById('monitoringCards');
    cardGrid.innerHTML = '<div>Loading...</div>';
    try {
        const [templates, robotsRaw] = await Promise.all([fetchTemplates(), fetchRobots()]);
        const robots = robotsRaw.map(normalizeRobot);
        console.log('Templates:', templates);
        console.log('Robots:', robots);
        cardGrid.innerHTML = '';
        for (const template of templates) {
            // Parse robots/robot if needed
            let templateRobots = template.robots;
            let templateRobot = template.robot;
            if (typeof templateRobots === 'string') {
                try { templateRobots = JSON.parse(templateRobots); } catch (e) { templateRobots = null; }
            }
            if (typeof templateRobot === 'string') {
                try { templateRobot = JSON.parse(templateRobot); } catch (e) { templateRobot = null; }
            }
            // Get robots attached to this template (always as array)
            let attachedRobots = [];
            if (templateRobots && Array.isArray(templateRobots)) {
                attachedRobots = robots.filter(r => templateRobots.some(tr => (tr.serial_number || tr.serialNumber) === r.serialNumber));
            } else if (templateRobot) {
                const serial = templateRobot.serial_number || templateRobot.serialNumber;
                attachedRobots = robots.filter(r => r.serialNumber === serial);
            }
            const queue = await fetchQueue(template.id);
            console.log(`Queue for template ${template.id}:`, queue);
            const card = createMonitoringCard(template, attachedRobots, queue);
            cardGrid.appendChild(card);
        }
    } catch (err) {
        cardGrid.innerHTML = '<div>Error loading monitoring data.</div>';
        console.error('Error rendering monitoring cards:', err);
    }
}

renderMonitoringCards(); 