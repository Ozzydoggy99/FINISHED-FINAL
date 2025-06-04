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

// Color options for templates
const colorOptions = [
    { name: 'Blue', value: '#2196F3' },
    { name: 'Red', value: '#f44336' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Teal', value: '#009688' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Indigo', value: '#3F51B5' },
    { name: 'Cyan', value: '#00BCD4' },
    { name: 'Lime', value: '#CDDC39' },
    { name: 'Amber', value: '#FFC107' },
    { name: 'Deep Purple', value: '#673AB7' },
    { name: 'Deep Orange', value: '#FF5722' },
    { name: 'Brown', value: '#795548' },
    { name: 'Grey', value: '#9E9E9E' },
    { name: 'Blue Grey', value: '#607D8B' },
    { name: 'Light Blue', value: '#03A9F4' },
    { name: 'Light Green', value: '#8BC34A' },
    { name: 'Light Red', value: '#EF5350' },
    { name: 'Light Yellow', value: '#FFF176' },
    { name: 'Light Purple', value: '#BA68C8' },
    { name: 'Light Orange', value: '#FFB74D' },
    { name: 'Light Teal', value: '#4DB6AC' },
    { name: 'Light Pink', value: '#F48FB1' },
    { name: 'Light Indigo', value: '#9FA8DA' },
    { name: 'Light Cyan', value: '#4DD0E1' },
    { name: 'Light Lime', value: '#DCE775' },
    { name: 'Light Amber', value: '#FFE082' },
    { name: 'Light Deep Purple', value: '#B39DDB' },
    { name: 'Light Deep Orange', value: '#FFAB91' },
    { name: 'Light Brown', value: '#A1887F' },
    { name: 'Light Grey', value: '#E0E0E0' },
    { name: 'Light Blue Grey', value: '#90A4AE' },
    { name: 'Dark Blue', value: '#1976D2' },
    { name: 'Dark Red', value: '#D32F2F' },
    { name: 'Dark Green', value: '#388E3C' },
    { name: 'Dark Yellow', value: '#FBC02D' },
    { name: 'Dark Purple', value: '#7B1FA2' },
    { name: 'Dark Orange', value: '#F57C00' },
    { name: 'Dark Teal', value: '#00796B' },
    { name: 'Dark Pink', value: '#C2185B' },
    { name: 'Dark Indigo', value: '#303F9F' },
    { name: 'Dark Cyan', value: '#0097A7' },
    { name: 'Dark Lime', value: '#AFB42B' },
    { name: 'Dark Amber', value: '#FFA000' },
    { name: 'Dark Deep Purple', value: '#512DA8' },
    { name: 'Dark Deep Orange', value: '#E64A19' },
    { name: 'Dark Brown', value: '#5D4037' }
];

// Modal handling
const modal = document.getElementById('createTemplateModal');
const createBtn = document.getElementById('createTemplateBtn');
const closeBtn = document.querySelector('.close-btn');

// Initialize modal display style
modal.style.display = 'none';

createBtn.onclick = async () => {
    try {
        // First populate the color options
        populateColorOptions();
        
        // Then load available robots
        await loadAvailableRobots();
        
        // Finally show the modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error initializing modal:', error);
        alert('Failed to initialize template creation. Please try again.');
    }
};

closeBtn.onclick = () => {
    modal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Populate color options
function populateColorOptions() {
    const colorSelects = document.querySelectorAll('select[id="templateColor"], select.template-color-select');
    colorSelects.forEach(select => {
        select.innerHTML = '<option value="">Select a color</option>';
        colorOptions.forEach(color => {
            const option = document.createElement('option');
            option.value = color.value;
            option.textContent = color.name;
            option.style.backgroundColor = color.value;
            select.appendChild(option);
        });
    });
}

// Load available robots
async function loadAvailableRobots() {
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
        const robotSelect = document.getElementById('robotAssignment');
        robotSelect.innerHTML = '<option value="">Select a robot</option>';
        
        robots.forEach(robot => {
            const option = document.createElement('option');
            option.value = robot.id;
            option.textContent = `${robot.name} (${robot.serial_number})`;
            robotSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading robots:', error);
        throw error; // Propagate error to be handled by the caller
    }
}

// Handle template creation
document.getElementById('createTemplateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('templateName').value,
        color: document.getElementById('templateColor').value,
        robotId: document.getElementById('robotAssignment').value,
        bossUser: {
            username: document.getElementById('bossUsername').value,
            password: document.getElementById('bossPassword').value
        }
    };

    try {
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Template created successfully!');
            // Close the modal
            modal.style.display = 'none';
            // Reload templates to show the new one
            loadTemplates();
        } else {
            alert(data.error || 'Failed to create template');
        }
    } catch (error) {
        console.error('Error creating template:', error);
        alert('Failed to create template');
    }
});

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load templates');
        }

        const templates = await response.json();
        displayTemplates(templates);
    } catch (error) {
        console.error('Error loading templates:', error);
        alert('Failed to load templates. Please try again.');
    }
}

// Display templates
function displayTemplates(templates) {
    const templateGrid = document.querySelector('.template-grid');
    templateGrid.innerHTML = '';

    templates.forEach(template => {
        // Use boss_user directly as stored in the database
        const bossUser = template.boss_user;
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-card-header">
                <h3>${template.name}</h3>
                <button class="expand-btn">▼</button>
            </div>
            <div class="template-card-content">
                <div class="form-group">
                    <label>Template Name</label>
                    <input type="text" class="template-name-input" value="${template.name}">
                </div>
                <div class="form-group">
                    <label>Header Color</label>
                    <select class="color-select">
                        ${colorOptions.map(color => `
                            <option value="${color.value}" ${color.value === template.color ? 'selected' : ''}>
                                ${color.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Assigned Robot</label>
                    <div class="robot-list">
                        ${template.robot ? `
                            <div class="robot-item">
                                <span>${template.robot.name} (${template.robot.serial_number})</span>
                            </div>
                        ` : 'No robot assigned'}
                    </div>
                </div>
                <div class="form-group">
                    <label>Boss User</label>
                    <div class="user-info">
                        ${bossUser ? `
                            <p>Username: ${bossUser.username}</p>
                            <p>Password: ${bossUser.password}</p>
                        ` : 'No boss user assigned'}
                    </div>
                </div>
                <div class="template-card-actions">
                    <button class="btn btn-secondary save-btn">Save Changes</button>
                    <button class="btn btn-danger delete-btn">Delete Template</button>
                </div>
            </div>
        `;

        // Add event listeners
        const expandBtn = card.querySelector('.expand-btn');
        const saveBtn = card.querySelector('.save-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        expandBtn.onclick = () => {
            card.classList.toggle('expanded');
            expandBtn.textContent = card.classList.contains('expanded') ? '▲' : '▼';
        };

        saveBtn.onclick = async () => {
            try {
                const response = await fetch(`/api/templates/${template.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        name: card.querySelector('.template-name-input').value,
                        color: card.querySelector('.color-select').value
                    })
                });

                if (response.ok) {
                    alert('Template updated successfully');
                    loadTemplates();
                } else {
                    alert('Failed to update template');
                }
            } catch (error) {
                console.error('Error updating template:', error);
                alert('Error updating template');
            }
        };

        deleteBtn.onclick = async () => {
            if (confirm('Are you sure you want to delete this template?')) {
                try {
                    const response = await fetch(`/api/templates/${template.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        alert('Template deleted successfully');
                        loadTemplates();
                    } else {
                        alert('Failed to delete template');
                    }
                } catch (error) {
                    console.error('Error deleting template:', error);
                    alert('Error deleting template');
                }
            }
        };

        templateGrid.appendChild(card);
    });
}

// Load templates when page loads
loadTemplates(); 