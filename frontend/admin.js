// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// Robot Registration Form
document.getElementById('robotRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const robotData = {
        name: document.getElementById('robotName').value,
        publicIp: document.getElementById('publicIp').value,
        privateIp: document.getElementById('privateIp').value,
        serialNumber: document.getElementById('serialNumber').value,
        secretKey: document.getElementById('secretKey').value
    };

    try {
        const response = await fetch('/api/robots/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(robotData)
        });

        if (response.ok) {
            alert('Robot registered successfully!');
            // Clear form
            e.target.reset();
            // Refresh robot list
            loadRobots();
        } else {
            alert('Failed to register robot. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration. Please try again.');
    }
});

// Load and display robots
async function loadRobots() {
    try {
        const response = await fetch('/api/robots', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const robots = await response.json();
            const robotGrid = document.getElementById('robotGrid');
            robotGrid.innerHTML = '';

            robots.forEach(robot => {
                const robotCard = createRobotCard(robot);
                robotGrid.appendChild(robotCard);
            });
        }
    } catch (error) {
        console.error('Error loading robots:', error);
    }
}

// Create robot card element
function createRobotCard(robot) {
    const card = document.createElement('div');
    card.className = 'robot-card';
    card.innerHTML = `
        <div class="robot-card-header">
            <h3>${robot.name}</h3>
            <span>${robot.serialNumber}</span>
        </div>
        <div class="robot-card-content">
            <div class="form-group">
                <label>Public IP:</label>
                <input type="text" value="${robot.publicIp}" data-field="publicIp">
            </div>
            <div class="form-group">
                <label>Private IP:</label>
                <input type="text" value="${robot.privateIp}" data-field="privateIp">
            </div>
            <div class="form-group">
                <label>Secret Key:</label>
                <input type="text" value="${robot.secretKey}" data-field="secretKey">
            </div>
            <div class="robot-card-actions">
                <button class="btn btn-primary" onclick="updateRobot('${robot.serialNumber}', this)">Confirm Changes</button>
                <i class="fas fa-trash delete-icon" onclick="deleteRobot('${robot.serialNumber}')"></i>
            </div>
        </div>
    `;

    // Add click handler to expand/collapse
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.robot-card-actions')) {
            card.classList.toggle('expanded');
        }
    });

    return card;
}

// Update robot information
async function updateRobot(serialNumber, button) {
    const card = button.closest('.robot-card');
    const inputs = card.querySelectorAll('input[data-field]');
    const updates = {};

    inputs.forEach(input => {
        updates[input.dataset.field] = input.value;
    });

    try {
        const response = await fetch(`/api/robots/${serialNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            alert('Robot information updated successfully!');
            loadRobots(); // Refresh the list
        } else {
            alert('Failed to update robot information.');
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('An error occurred while updating robot information.');
    }
}

// Delete robot
async function deleteRobot(serialNumber) {
    if (!confirm('Are you sure you want to delete this robot?')) {
        return;
    }

    try {
        const response = await fetch(`/api/robots/${serialNumber}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Robot deleted successfully!');
            loadRobots(); // Refresh the list
        } else {
            alert('Failed to delete robot.');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('An error occurred while deleting the robot.');
    }
}

// User Management
document.getElementById('userRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    const userData = {
        username: document.getElementById('newUsername').value,
        password: password,
        role: document.getElementById('userRole').value
    };

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            alert('User added successfully!');
            e.target.reset();
            loadUsers();
        } else {
            alert('Failed to add user. Please try again.');
        }
    } catch (error) {
        console.error('User registration error:', error);
        alert('An error occurred while adding the user.');
    }
});

// Load and display users
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            const userList = document.getElementById('userList');
            userList.innerHTML = '';

            users.forEach(user => {
                const userCard = createUserCard(user);
                userList.appendChild(userCard);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Create user card element
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
        <div class="user-card-info">
            <h4>${user.username}</h4>
            <span>${user.role}</span>
        </div>
        <div class="user-card-actions">
            <button class="edit-btn" onclick="editUser('${user.username}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteUser('${user.username}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return card;
}

// Edit user
async function editUser(username) {
    const newPassword = prompt('Enter new password (leave blank to keep current):');
    if (newPassword === null) return; // User cancelled

    const newRole = prompt('Enter new role (admin/operator):');
    if (newRole === null) return; // User cancelled

    const updates = {};
    if (newPassword) updates.password = newPassword;
    if (newRole) updates.role = newRole;

    try {
        const response = await fetch(`/api/users/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            alert('User updated successfully!');
            loadUsers();
        } else {
            alert('Failed to update user.');
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('An error occurred while updating the user.');
    }
}

// Delete user
async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('User deleted successfully!');
            loadUsers();
        } else {
            alert('Failed to delete user.');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('An error occurred while deleting the user.');
    }
}

// Initial load of users
loadUsers();

// Initial load of robots
loadRobots(); 