// Login page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const codeInput = document.getElementById('code');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const code = codeInput.value.trim();
        
        // Validate inputs
        if (!ForumApp.validateEmail(email)) {
            ForumApp.showAlert('Please enter a valid email address', 'danger');
            return;
        }
        
        if (!ForumApp.validatePassword(password)) {
            ForumApp.showAlert('Password must be at least 6 characters', 'danger');
            return;
        }
        
        ForumApp.showLoading(submitBtn, true);
        
        try {
            // First, try to login with just email and password
            // If the server requires a verification code, it will respond accordingly
            const data = await ForumApp.login(email, code, password);
            
            ForumApp.showAlert('Login successful! Redirecting...', 'success');
            
            // Store session info
            if (data.token) {
                document.cookie = `session_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
            }
            
            if (data.user) {
                const userData = {
                    email: data.user.email,
                    isAdmin: data.user.is_admin === 1
                };
                document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}`;
            }
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } catch (error) {
            if (error.message.includes('verification code')) {
                ForumApp.showAlert('Verification code required. Please check your email.', 'info');
                // Focus on code input
                codeInput.focus();
            } else {
                ForumApp.showAlert(error.message, 'danger');
            }
        } finally {
            ForumApp.showLoading(submitBtn, false);
        }
    });
});

// Helper function to show alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Clear previous alerts
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Add showAlert to ForumApp if not already there
if (!window.ForumApp.showAlert) {
    window.ForumApp.showAlert = showAlert;
}
