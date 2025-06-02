const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const WorkflowManager = require('./core/WorkflowManager');
const RobotManager = require('./core/RobotManager');
const MapManager = require('./core/MapManager');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./config/database');
const robotMaps = require('./robot-maps.js');
const fs = require('fs');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensure JSON and CORS middleware are set before any routes
app.use(express.json());
app.use(cors());

// Initialize managers
const workflowManager = new WorkflowManager();
const robotManager = new RobotManager();
const mapManager = new MapManager();

// === Data file constants and helpers (from server.js) ===
const DATA_DIR = path.join(__dirname, '../data');
const ROBOTS_FILE = path.join(DATA_DIR, 'robots.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function initializeDataFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

initializeDataFile(ROBOTS_FILE, []);
initializeDataFile(TEMPLATES_FILE, []);
initializeDataFile(USERS_FILE, [
    { username: 'Ozzydog', password: 'Ozzydog', role: 'admin' }
]);

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
}
// === End helpers ===

// === Template and user endpoints (from server.js) ===
app.get('/api/templates', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    res.json(templates);
});

app.post('/api/templates', (req, res) => {
    const { name, color, robotId, bossUser } = req.body;
    const robots = readData(ROBOTS_FILE);
    const templates = readData(TEMPLATES_FILE);
    const robot = robots.find(r => r.id === robotId);
    if (!robot) {
        return res.status(404).json({ error: 'Robot not found' });
    }
    const templateId = Date.now().toString();
    const template = {
        id: templateId,
        name,
        color,
        robot: {
            id: robot.id,
            name: robot.name,
            serialNumber: robot.serialNumber,
            publicIP: robot.publicIP,
            privateIP: robot.privateIP
        },
        bossUser,
        users: []
    };
    templates.push(template);
    writeData(TEMPLATES_FILE, templates);
    res.status(201).json(template);
});

app.put('/api/templates/:id', (req, res) => {
    const { id } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const templateIndex = templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
        return res.status(404).json({ error: 'Template not found' });
    }
    const updatedTemplate = {
        ...templates[templateIndex],
        ...req.body
    };
    templates[templateIndex] = updatedTemplate;
    writeData(TEMPLATES_FILE, templates);
    res.json(updatedTemplate);
});

app.delete('/api/templates/:id', (req, res) => {
    const { id } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const templateIndex = templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
        return res.status(404).json({ error: 'Template not found' });
    }
    templates.splice(templateIndex, 1);
    writeData(TEMPLATES_FILE, templates);
    res.status(204).send();
});

app.get('/api/templates/:id', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === req.params.id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    if (template.robot && !template.robots) {
        template.robots = [template.robot];
    }
    res.json(template);
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        console.error('Missing username or password in login request:', req.body);
        return res.status(400).json({ error: 'Missing username or password' });
    }
    if (username === 'Ozzydog' && password === 'Ozzydog') {
        const token = Buffer.from(username).toString('base64');
        res.json({
            token,
            user: {
                username,
                role: 'admin'
            }
        });
        return;
    }
    const templates = readData(TEMPLATES_FILE);
    for (const template of templates) {
        if (template.bossUser && template.bossUser.username === username && template.bossUser.password === password) {
            const token = Buffer.from(`${username}:${template.id}`).toString('base64');
            res.json({
                token,
                user: {
                    username,
                    role: 'boss',
                    templateId: template.id,
                    templateName: template.name
                }
            });
            return;
        }
        if (template.users) {
            const user = template.users.find(u => u.username === username && u.password === password);
            if (user) {
                const token = Buffer.from(`${username}:${template.id}`).toString('base64');
                res.json({
                    token,
                    user: {
                        username,
                        role: 'user',
                        templateId: template.id,
                        templateName: template.name
                    }
                });
                return;
            }
        }
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/templates/:id/users', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    if (!template.users) {
        template.users = [];
    }
    if (template.users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    template.users.push({ username, password });
    writeData(TEMPLATES_FILE, templates);
    res.status(201).json({ message: 'User added successfully' });
});

app.get('/api/templates/:id/users', (req, res) => {
    const { id } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template.users || []);
});

app.delete('/api/templates/:id/users/:username', (req, res) => {
    const { id, username } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    if (!template.users) {
        template.users = [];
    }
    const userIndex = template.users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    template.users.splice(userIndex, 1);
    writeData(TEMPLATES_FILE, templates);
    res.status(204).send();
});

// Simple user authentication
const users = {
    'Ozzydog': {
        password: 'Ozzydog',
        role: 'admin'
    }
};

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [username, password] = decoded.split(':');
        
        if (users[username] && users[username].password === password) {
            req.user = { username, role: users[username].role };
            next();
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Robot configuration
const robotConfig = {
    id: 'L382502104987ir',
    ip: '47.180.91.99',
    port: 8090,
    secret: '667a51a4d948433081a272c78d10a8a4',
    name: 'Public Robot',
    type: 'standard'
};

// Register the robot
try {
    const robotId = robotManager.addRobot(robotConfig);
    console.log(`Robot registered with ID: ${robotId}`);
    
    // Connect to the robot
    robotManager.connectRobot(robotId).then(() => {
        console.log('Successfully connected to robot');
    }).catch(error => {
        console.error('Failed to connect to robot:', error);
    });
} catch (error) {
    console.error('Failed to register robot:', error);
}

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Get single robot endpoint
app.get('/api/robots/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'SELECT * FROM robots WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Robot registration endpoint
app.post('/api/robots/register', authenticateToken, async (req, res) => {
    const { name, publicIP, privateIP, serialNumber, secretKey } = req.body;

    // Validate required fields
    if (!name || !publicIP || !privateIP || !serialNumber || !secretKey) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if robot with same serial number exists
        const existingRobot = await db.query(
            'SELECT * FROM robots WHERE serialNumber = $1',
            [serialNumber]
        );

        if (existingRobot.rows.length > 0) {
            return res.status(400).json({ error: 'Robot with this serial number already exists' });
        }

        // Insert new robot
        const result = await db.query(
            `INSERT INTO robots (name, publicIP, privateIP, serialNumber, secretKey)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, publicIP, privateIP, serialNumber, secretKey]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all robots endpoint
app.get('/api/robots', authenticateToken, (req, res) => {
    const user = req.user;
    const robots = readData(ROBOTS_FILE);
    if (user.role === 'admin') {
        // Admin sees all robots
        return res.json(robots);
    } else if (user.role === 'boss' || user.role === 'user') {
        // Boss/user sees only robots assigned to their template
        const templates = readData(TEMPLATES_FILE);
        const template = templates.find(t => t.id === user.templateId);
        if (!template || !template.robot) {
            return res.json([]);
        }
        // Support both single robot and robots array
        let assignedRobots = [];
        if (template.robots && Array.isArray(template.robots)) {
            assignedRobots = robots.filter(r => template.robots.some(tr => tr.serialNumber === r.serialNumber));
        } else if (template.robot) {
            assignedRobots = robots.filter(r => r.serialNumber === template.robot.serialNumber);
        }
        return res.json(assignedRobots);
    } else {
        // Unknown role
        return res.status(403).json({ error: 'Forbidden' });
    }
});

// Update robot endpoint
app.put('/api/robots/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, publicIP, privateIP, secretKey } = req.body;

    if (!name || !publicIP || !privateIP || !secretKey) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const result = await db.query(
            `UPDATE robots 
             SET name = $1, publicIP = $2, privateIP = $3, secretKey = $4
             WHERE id = $5
             RETURNING *`,
            [name, publicIP, privateIP, secretKey, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete robot endpoint
app.delete('/api/robots/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM robots WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Protected API routes
app.post('/api/robots', checkAuth, (req, res) => {
    try {
        const robotId = robotManager.addRobot(req.body);
        res.json({ robotId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/workflows', checkAuth, (req, res) => {
    try {
        const workflow = workflowManager.createWorkflow(
            req.body.template,
            req.body.robotId,
            req.body.mapId,
            req.body.options
        );
        res.json({ workflowId: workflow.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/maps', checkAuth, (req, res) => {
    try {
        const maps = mapManager.getAllMaps();
        res.json({ maps });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get robot maps endpoint
app.get('/api/robot-maps', (req, res) => {
    const data = robotMaps.getRobotMapsData();
    res.json(data || []);
});

// Database size checking endpoint
app.get('/api/database/size', authenticateToken, async (req, res) => {
    try {
        const dbSize = await db.getDatabaseSize();
        const tableSizes = await db.getTableSizes();
        
        res.json({
            databaseSize: dbSize,
            tableSizes: tableSizes
        });
    } catch (err) {
        console.error('Error getting database size:', err);
        res.status(500).json({ error: 'Failed to get database size' });
    }
});

// Test if we can access test-move-command.js
try {
    const testMovePath = path.resolve(process.cwd(), 'test-move-command.js');
    console.log('Checking if test-move-command.js exists at:', testMovePath);
    if (fs.existsSync(testMovePath)) {
        console.log('test-move-command.js file found');
    } else {
        console.error('test-move-command.js file not found');
    }
} catch (error) {
    console.error('Error checking for test-move-command.js:', error);
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send initial robot maps data
    const initialData = robotMaps.getRobotMapsData();
    if (initialData) {
        ws.send(JSON.stringify({
            type: 'robotMaps',
            data: initialData
        }));
    }

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            //console.log('Received WebSocket message:', data);

            // Handle registration messages
            if (data.type === 'register') {
                console.log('Client registered as:', data.role);
                return;
            }

            // Common imports and declarations for test commands
            const { spawn } = require('child_process');
            const scriptPath = path.resolve(process.cwd(), 'test-move-command.js');
            const reverseScriptPath = path.resolve(process.cwd(), 'test-reverse-move-command.js');

            switch (data.type) {
                case 'test_move':
                    console.log('Executing test move command...');
                    console.log('Script path:', scriptPath);
                    console.log('Current working directory:', process.cwd());

                    try {
                        const testMove = spawn('node', [scriptPath], {
                            cwd: process.cwd(),
                            stdio: ['ignore', 'pipe', 'pipe']
                        });

                        console.log('Test move process started with PID:', testMove.pid);

                        testMove.stdout.on('data', (data) => {
                            console.log('Test move stdout:', data.toString());
                            const logs = data.toString().split('\n');
                            logs.forEach(log => {
                                if (log.trim()) {
                                    ws.send(JSON.stringify({
                                        type: 'task_log',
                                        data: log.trim()
                                    }));
                                }
                            });
                        });

                        testMove.stderr.on('data', (data) => {
                            console.error('Test move stderr:', data.toString());
                            const error = data.toString().trim();
                            ws.send(JSON.stringify({
                                type: 'task_log',
                                data: `Error: ${error}`
                            }));
                        });

                        testMove.on('error', (error) => {
                            console.error('Failed to start test move process:', error);
                            ws.send(JSON.stringify({
                                type: 'task_log',
                                data: `Failed to start process: ${error.message}`
                            }));
                        });

                        testMove.on('close', (code) => {
                            console.log('Test move process exited with code:', code);
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'task_log',
                                    data: `Process exited with code ${code}`
                                }));
                            }
                        });
                    } catch (error) {
                        console.error('Error spawning test move process:', error);
                        ws.send(JSON.stringify({
                            type: 'task_log',
                            data: `Error spawning process: ${error.message}`
                        }));
                    }
                    break;

                case 'test_reverse':
                    console.log('Executing test reverse command...');
                    console.log('Reverse script path:', reverseScriptPath);
                    console.log('Current working directory:', process.cwd());

                    try {
                        const testReverse = spawn('node', [reverseScriptPath], {
                            cwd: process.cwd(),
                            stdio: ['ignore', 'pipe', 'pipe']
                        });

                        console.log('Test reverse process started with PID:', testReverse.pid);

                        testReverse.stdout.on('data', (data) => {
                            console.log('Test reverse stdout:', data.toString());
                            const logs = data.toString().split('\n');
                            logs.forEach(log => {
                                if (log.trim()) {
                                    ws.send(JSON.stringify({
                                        type: 'task_log',
                                        data: log.trim()
                                    }));
                                }
                            });
                        });

                        testReverse.stderr.on('data', (data) => {
                            console.error('Test reverse stderr:', data.toString());
                            const error = data.toString().trim();
                            ws.send(JSON.stringify({
                                type: 'task_log',
                                data: `Error: ${error}`
                            }));
                        });

                        testReverse.on('error', (error) => {
                            console.error('Failed to start test reverse process:', error);
                            ws.send(JSON.stringify({
                                type: 'task_log',
                                data: `Failed to start process: ${error.message}`
                            }));
                        });

                        testReverse.on('close', (code) => {
                            console.log('Test reverse process exited with code:', code);
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'task_log',
                                    data: `Process exited with code ${code}`
                                }));
                            }
                        });
                    } catch (error) {
                        console.error('Error spawning test reverse process:', error);
                        ws.send(JSON.stringify({
                            type: 'task_log',
                            data: `Error spawning process: ${error.message}`
                        }));
                    }
                    break;

                case 'register_robot':
                    const robotId = robotManager.addRobot(data.robot);
                    ws.send(JSON.stringify({ type: 'robot_registered', robotId }));
                    break;

                case 'start_workflow':
                    const workflow = workflowManager.createWorkflow(
                        data.template,
                        data.robotId,
                        data.mapId,
                        data.options
                    );
                    workflowManager.startWorkflow(workflow.id).then(() => {
                        ws.send(JSON.stringify({ type: 'workflow_started', workflowId: workflow.id }));
                    });
                    break;

                case 'get_robot_status':
                    const status = robotManager.getRobotStatus(data.robotId);
                    ws.send(JSON.stringify({ type: 'robot_status', status }));
                    break;

                case 'get_map_points':
                    const points = mapManager.getMapPoints(data.mapId);
                    ws.send(JSON.stringify({ type: 'map_points', points }));
                    break;

                default:
                    console.warn('Unknown message type:', data.type);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: `Unknown message type: ${data.type}`,
                        receivedData: data 
                    }));
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
});

// Update all clients with new robot maps data every 30 seconds
setInterval(() => {
    const data = robotMaps.getRobotMapsData();
    if (data) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'robotMaps',
                    data: data
                }));
            }
        });
    }
}, 30000);

// Event handling
workflowManager.on('workflowStarted', (workflow) => {
    broadcastToClients({ type: 'workflow_started', workflow });
});

workflowManager.on('workflowCompleted', (workflow) => {
    broadcastToClients({ type: 'workflow_completed', workflow });
});

workflowManager.on('workflowFailed', ({ workflow, error }) => {
    broadcastToClients({ type: 'workflow_failed', workflow, error: error.message });
});

robotManager.on('robotStatusUpdated', ({ id, status }) => {
    broadcastToClients({ type: 'robot_status_updated', robotId: id, status });
});

// Broadcast to all connected clients
function broadcastToClients(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 