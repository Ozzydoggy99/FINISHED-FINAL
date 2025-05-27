// Check authentication
const token = localStorage.getItem('token');
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

// Load robots
async function loadRobots() {
    try {
        const response = await fetch('/api/robots', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load robots');
        }

        const robots = await response.json();
        displayRobots(robots);
    } catch (error) {
        console.error('Error loading robots:', error);
        alert('Failed to load robots. Please try again.');
    }
}

// Display robots in the grid
function displayRobots(robots) {
    const grid = document.getElementById('robotGrid');
    const template = document.getElementById('robotCardTemplate');
    
    grid.innerHTML = '';
    
    robots.forEach(robot => {
        const card = template.content.cloneNode(true);
        
        // Set basic info
        card.querySelector('.robot-name').textContent = robot.name;
        card.querySelector('.robot-serial').textContent = robot.serialNumber;
        
        // Set form values
        card.querySelector('.public-ip').value = robot.publicIP;
        card.querySelector('.private-ip').value = robot.privateIP;
        card.querySelector('.secret-key').value = robot.secretKey;
        
        // Add event listeners
        const cardElement = card.querySelector('.robot-card');
        const expandBtn = card.querySelector('.expand-btn');
        const saveBtn = card.querySelector('.save-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        expandBtn.addEventListener('click', () => {
            cardElement.classList.toggle('expanded');
            const icon = expandBtn.querySelector('i');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });
        
        saveBtn.addEventListener('click', async () => {
            const updatedRobot = {
                id: robot.id,
                name: robot.name,
                serialNumber: robot.serialNumber,
                publicIP: card.querySelector('.public-ip').value,
                privateIP: card.querySelector('.private-ip').value,
                secretKey: card.querySelector('.secret-key').value
            };
            
            try {
                const response = await fetch(`/api/robots/${robot.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedRobot)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update robot');
                }
                
                alert('Robot updated successfully!');
            } catch (error) {
                console.error('Error updating robot:', error);
                alert('Failed to update robot. Please try again.');
            }
        });
        
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this robot?')) {
                return;
            }
            
            try {
                const response = await fetch(`/api/robots/${robot.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to delete robot');
                }
                
                cardElement.remove();
                alert('Robot deleted successfully!');
            } catch (error) {
                console.error('Error deleting robot:', error);
                alert('Failed to delete robot. Please try again.');
            }
        });
        
        grid.appendChild(card);
    });
}

// Load robots when page loads
loadRobots(); 