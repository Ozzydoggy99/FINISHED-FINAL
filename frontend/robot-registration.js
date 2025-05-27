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

// Handle form submission
document.getElementById('robotRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        name: document.getElementById('robotName').value,
        publicIP: document.getElementById('publicIP').value,
        privateIP: document.getElementById('privateIP').value,
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
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to register robot');
        }

        const result = await response.json();
        
        // Show success message
        alert('Robot registered successfully!');
        
        // Clear form
        e.target.reset();
        
        // Redirect to robot assignment page
        window.location.href = '/robot-assignment.html';
    } catch (error) {
        console.error('Error registering robot:', error);
        alert('Failed to register robot. Please try again.');
    }
}); 