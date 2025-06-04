document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Attempting login for user:', username); // Debug log

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        console.log('Login response status:', response.status); // Debug log

        const data = await response.json();
        console.log('Login response data:', data); // Debug log

        if (response.ok) {
            // Store the token and user info in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Login successful, redirecting to admin page'); // Debug log

            // Redirect based on user role
            if (data.user.role === 'admin') {
                window.location.href = '/user-templates.html';
            } else if (data.user.role === 'boss') {
                // Get the template ID for this boss user
                const templateResponse = await fetch('/api/templates', {
                    headers: {
                        'Authorization': `Bearer ${data.token}`
                    }
                });
                
                if (templateResponse.ok) {
                    const templates = await templateResponse.json();
                    // Use boss_user directly as stored in the database
                    const userTemplate = templates.find(t => t.boss_user && t.boss_user.username === username);
                    if (userTemplate) {
                        window.location.href = `/user-interface.html?templateId=${userTemplate.id}`;
                    } else {
                        alert('No template found for this user');
                    }
                }
            } else {
                window.location.href = '/user-interface.html';
            }
        } else {
            console.error('Login failed:', data.error); // Debug log
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}); 