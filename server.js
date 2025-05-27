const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const { AutoXingRobot, RobotConfig } = require('./robot-interface');

const app = express();
const port = 3000;

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const ROBOTS_FILE = path.join(DATA_DIR, 'robots.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Robot relay servers
const robotRelays = new Map();

// Create relay server for a robot
function createRobotRelay(robot) {
    if (robotRelays.has(robot.id)) {
        console.log(`Relay server already exists for robot ${robot.id}`);
        return robotRelays.get(robot.id);
    }

    console.log(`Creating relay server for robot ${robot.id} at ${robot.privateIP}:8090`);
    
    // Create WebSocket server for this robot
    const relayServer = new WebSocket.Server({ noServer: true });
    let robotConnection = null;

    // Handle WebSocket connections
    relayServer.on('connection', (ws) => {
        console.log(`Client connected to relay for robot ${robot.id}`);
        
        // Connect to robot's WebSocket server using private IP and port 8090
        const robotWs = new WebSocket(`ws://${robot.privateIP}:8090`);
        
        robotWs.on('open', () => {
            console.log(`Connected to robot ${robot.id} at ${robot.privateIP}:8090`);
            robotConnection = robotWs;
        });

        robotWs.on('message', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        robotWs.on('close', () => {
            console.log(`Connection to robot ${robot.id} closed`);
            robotConnection = null;
        });

        robotWs.on('error', (error) => {
            console.error(`Error in robot connection for ${robot.id}:`, error);
            robotConnection = null;
        });

        // Handle messages from client
        ws.on('message', (data) => {
            if (robotConnection && robotConnection.readyState === WebSocket.OPEN) {
                robotConnection.send(data);
            }
        });

        ws.on('close', () => {
            if (robotConnection) {
                robotConnection.close();
            }
        });
    });

    robotRelays.set(robot.id, relayServer);
    return relayServer;
}

// Create HTTP server
const server = http.createServer(app);

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const robotId = url.searchParams.get('robotId');

    if (!robotId) {
        socket.destroy();
        return;
    }

    const robots = readData(ROBOTS_FILE);
    const robot = robots.find(r => r.id === robotId);

    if (!robot) {
        socket.destroy();
        return;
    }

    const relayServer = createRobotRelay(robot);
    relayServer.handleUpgrade(request, socket, head, (ws) => {
        relayServer.emit('connection', ws, request);
    });
});

// Initialize data files if they don't exist
function initializeDataFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

// Initialize data files
initializeDataFile(ROBOTS_FILE, []);
initializeDataFile(TEMPLATES_FILE, []);
initializeDataFile(USERS_FILE, [
    { username: 'Ozzydog', password: 'Ozzydog', role: 'admin' }
]);

// Helper functions for data persistence
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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend'));

// Robot routes
app.get('/api/robots', (req, res) => {
    const robots = readData(ROBOTS_FILE);
    res.json(robots);
});

app.post('/api/robots/register', (req, res) => {
    const { name, publicIP, privateIP, serialNumber, secretKey } = req.body;
    const robots = readData(ROBOTS_FILE);
    
    const robot = {
        id: Date.now().toString(),
        name,
        publicIP,
        privateIP,
        serialNumber,
        secretKey,
        status: 'offline'
    };
    
    robots.push(robot);
    writeData(ROBOTS_FILE, robots);

    // Create relay server for the new robot
    createRobotRelay(robot);

    res.status(201).json(robot);
});

app.put('/api/robots/:id', (req, res) => {
    const { id } = req.params;
    const robots = readData(ROBOTS_FILE);
    const robotIndex = robots.findIndex(r => r.id === id);
    
    if (robotIndex === -1) {
        return res.status(404).json({ error: 'Robot not found' });
    }

    const updatedRobot = {
        ...robots[robotIndex],
        ...req.body
    };
    
    robots[robotIndex] = updatedRobot;
    writeData(ROBOTS_FILE, robots);
    res.json(updatedRobot);
});

app.delete('/api/robots/:id', (req, res) => {
    const { id } = req.params;
    const robots = readData(ROBOTS_FILE);
    const robotIndex = robots.findIndex(r => r.id === id);
    
    if (robotIndex === -1) {
        return res.status(404).json({ error: 'Robot not found' });
    }

    robots.splice(robotIndex, 1);
    writeData(ROBOTS_FILE, robots);
    res.status(204).send();
});

// Template routes
app.get('/api/templates', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    res.json(templates);
});

app.post('/api/templates', (req, res) => {
    const { name, color, robotId, bossUser } = req.body;
    console.log('Creating template:', { name, color, robotId });
    
    const robots = readData(ROBOTS_FILE);
    const templates = readData(TEMPLATES_FILE);
    
    const robot = robots.find(r => r.id === robotId);
    if (!robot) {
        console.log('Robot not found:', robotId);
        return res.status(404).json({ error: 'Robot not found' });
    }

    const templateId = Date.now().toString();
    console.log('Generated template ID:', templateId);

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
    console.log('Template created successfully:', template);
    
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

// Get template by ID
app.get('/api/templates/:id', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    
    // Convert single robot to robots array if needed
    if (template.robot && !template.robots) {
        template.robots = [template.robot];
    }
    
    res.json(template);
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    // Check admin user
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

    // Check template users
    const templates = readData(TEMPLATES_FILE);
    for (const template of templates) {
        // Check boss user
        if (template.bossUser.username === username && template.bossUser.password === password) {
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

        // Check regular users
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

// Add user to template
app.post('/api/templates/:id/users', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    console.log('Adding user to template:', { id, username });

    const templates = readData(TEMPLATES_FILE);
    console.log('Available templates:', templates.map(t => ({ id: t.id, name: t.name })));
    
    const template = templates.find(t => t.id === id);
    console.log('Found template:', template);

    if (!template) {
        console.log('Template not found for id:', id);
        return res.status(404).json({ error: 'Template not found' });
    }

    if (!template.users) {
        template.users = [];
    }

    // Check if username already exists
    if (template.users.some(u => u.username === username)) {
        console.log('Username already exists:', username);
        return res.status(400).json({ error: 'Username already exists' });
    }

    template.users.push({ username, password });
    writeData(TEMPLATES_FILE, templates);
    console.log('User added successfully');

    res.status(201).json({ message: 'User added successfully' });
});

// Get template users
app.get('/api/templates/:id/users', (req, res) => {
    const { id } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template.users || []);
});

// Delete template user
app.delete('/api/templates/:id/users/:username', (req, res) => {
    const { id, username } = req.params;
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === id);

    if (!template || !template.users) {
        return res.status(404).json({ error: 'Template or user not found' });
    }

    template.users = template.users.filter(u => u.username !== username);
    writeData(TEMPLATES_FILE, templates);

    res.status(204).send();
});

// Get robot maps
app.get('/api/robots/:id/maps', async (req, res) => {
    const robots = readData(ROBOTS_FILE);
    const robot = robots.find(r => r.id === req.params.id);
    
    if (!robot) {
        console.error(`Robot not found with ID: ${req.params.id}`);
        return res.status(404).json({ error: 'Robot not found' });
    }

    console.log(`Attempting to fetch maps for robot ${robot.id} at ${robot.privateIP}:8090`);

    try {
        // Create WebSocket connection to robot
        const ws = new WebSocket(`ws://${robot.privateIP}:8090/ws/v2/topics`);
        
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error(`Request timeout for robot ${robot.id}`);
                reject(new Error('Request timeout'));
            }, 5000);

            ws.on('open', () => {
                console.log(`WebSocket connection established for robot ${robot.id}`);
                // Subscribe to map topic as shown in RobotConnection.js
                ws.send(JSON.stringify({
                    enable_topic: ['/map']
                }));
            });

            ws.on('message', (data) => {
                console.log(`Received response from robot ${robot.id}:`, data.toString());
                clearTimeout(timeout);
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.topic === '/map') {
                        resolve(parsedData);
                    }
                } catch (error) {
                    console.error(`Error parsing response from robot ${robot.id}:`, error);
                    reject(new Error('Invalid response format from robot'));
                }
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for robot ${robot.id}:`, error);
                clearTimeout(timeout);
                reject(error);
            });

            ws.on('close', (code, reason) => {
                console.log(`WebSocket connection closed for robot ${robot.id}:`, code, reason);
                clearTimeout(timeout);
                reject(new Error(`WebSocket connection closed: ${reason}`));
            });
        });

        // Process map data using MapDataHandler pattern
        const mapData = {
            resolution: response.resolution,
            size: response.size,
            origin: response.origin,
            data: response.data,
            timestamp: Date.now()
        };

        console.log(`Successfully received maps for robot ${robot.id}:`, mapData);
        res.json([mapData]);
    } catch (error) {
        console.error(`Error fetching maps for robot ${robot.id}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch maps from robot',
            details: error.message
        });
    }
});

// Get robot map points
app.get('/api/robots/:id/maps/:mapName/points', async (req, res) => {
    const robots = readData(ROBOTS_FILE);
    const robot = robots.find(r => r.id === req.params.id);
    
    if (!robot) {
        return res.status(404).json({ error: 'Robot not found' });
    }

    try {
        // Send request through WebSocket
        const relayServer = robotRelays.get(robot.id);
        if (!relayServer) {
            throw new Error('Robot relay not found');
        }

        // Create a promise to handle the WebSocket response
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 5000);

            // Create a temporary WebSocket connection to the relay server
            const ws = new WebSocket(`ws://localhost:${port}?robotId=${robot.id}`);
            
            ws.on('open', () => {
                // Send request in the format the robot expects
                const request = {
                    type: "get_map",
                    filename: req.params.mapName
                };
                console.log(`Sending request to robot ${robot.id}:`, request);
                ws.send(JSON.stringify(request));
            });

            ws.on('message', (data) => {
                clearTimeout(timeout);
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.error) {
                        reject(new Error(parsedData.error));
                    } else if (parsedData.type === 'map') {
                        resolve(parsedData);
                    }
                } catch (error) {
                    reject(new Error('Invalid response format from robot'));
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            ws.on('close', (code, reason) => {
                clearTimeout(timeout);
                reject(new Error(`WebSocket connection closed: ${reason}`));
            });
        });

        // Extract points from the map data
        const points = response.geojson?.features?.map(feature => ({
            name: feature.properties.name,
            type: feature.properties.type,
            coordinates: feature.geometry.coordinates,
            orientation: feature.properties.orientation
        })) || [];

        res.json(points);
    } catch (error) {
        console.error('Error fetching points:', error);
        res.status(500).json({ 
            error: 'Failed to fetch points from robot',
            details: error.message
        });
    }
});

// Create task
app.post('/api/templates/:id/tasks', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    
    // Get the first robot (either from robots array or single robot)
    const robot = template.robots ? template.robots[0] : template.robot;
    if (!robot) {
        return res.status(400).json({ error: 'No robot assigned to template' });
    }
    
    const { type, floor, shelfPoint } = req.body;
    
    // In a real implementation, this would create a task in your task management system
    const task = {
        id: Date.now().toString(),
        type,
        floor,
        shelfPoint,
        robotId: robot.id,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    res.status(201).json(task);
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    
    // Create relay servers for existing robots
    const robots = readData(ROBOTS_FILE);
    robots.forEach(robot => {
        createRobotRelay(robot);
    });
}); 