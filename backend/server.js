const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const WorkflowManager = require('./core/WorkflowManager');
const RobotManager = require('./core/RobotManager');
const MapManager = require('./core/MapManager');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const robotMaps = require('./robot-maps.js');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize managers
const workflowManager = new WorkflowManager();
const robotManager = new RobotManager();
const mapManager = new MapManager();

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
app.use(express.json());

// Middleware
app.use(cors());

// Database setup
const db = new sqlite3.Database('robots.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Create robots table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS robots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            publicIP TEXT NOT NULL,
            privateIP TEXT NOT NULL,
            serialNumber TEXT UNIQUE NOT NULL,
            secretKey TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Check against our users object
    if (users[username] && users[username].password === password) {
        const token = jwt.sign({ username, role: users[username].role }, 'your-secret-key');
        res.json({ 
            token, 
            user: { 
                username,
                role: users[username].role 
            } 
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Robot registration endpoint
app.post('/api/robots/register', authenticateToken, (req, res) => {
    const { name, publicIP, privateIP, serialNumber, secretKey } = req.body;

    // Validate required fields
    if (!name || !publicIP || !privateIP || !serialNumber || !secretKey) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if robot with same serial number exists
    db.get('SELECT * FROM robots WHERE serialNumber = ?', [serialNumber], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
            return res.status(400).json({ error: 'Robot with this serial number already exists' });
        }

        // Insert new robot
        const sql = `INSERT INTO robots (name, publicIP, privateIP, serialNumber, secretKey) 
                    VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [name, publicIP, privateIP, serialNumber, secretKey], function(err) {
            if (err) {
                console.error('Error inserting robot:', err);
                return res.status(500).json({ error: 'Failed to register robot' });
            }

            res.json({
                id: this.lastID,
                name,
                publicIP,
                privateIP,
                serialNumber,
                secretKey
            });
        });
    });
});

// Get all robots endpoint
app.get('/api/robots', authenticateToken, (req, res) => {
    db.all('SELECT * FROM robots ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching robots:', err);
            return res.status(500).json({ error: 'Failed to fetch robots' });
        }
        res.json(rows);
    });
});

// Update robot endpoint
app.put('/api/robots/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, publicIP, privateIP, secretKey } = req.body;

    if (!name || !publicIP || !privateIP || !secretKey) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = `UPDATE robots 
                SET name = ?, publicIP = ?, privateIP = ?, secretKey = ?
                WHERE id = ?`;

    db.run(sql, [name, publicIP, privateIP, secretKey, id], function(err) {
        if (err) {
            console.error('Error updating robot:', err);
            return res.status(500).json({ error: 'Failed to update robot' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        res.json({ message: 'Robot updated successfully' });
    });
});

// Delete robot endpoint
app.delete('/api/robots/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM robots WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting robot:', err);
            return res.status(500).json({ error: 'Failed to delete robot' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        res.json({ message: 'Robot deleted successfully' });
    });
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

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Handle messages from clients
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Handle WebSocket messages
async function handleWebSocketMessage(ws, data) {
    switch (data.type) {
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
            await workflowManager.startWorkflow(workflow.id);
            ws.send(JSON.stringify({ type: 'workflow_started', workflowId: workflow.id }));
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
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
}

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