// Register page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const emailInput = document.getElementById('email');
    
    let codeSent = false;
    let countdown = 0;
    
    // Send verification code
    sendCodeBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        
        if (!ForumApp.validateEmail(email)) {
            showAlert('Please enter a valid email address', 'danger');
            return;
        }
        
        // Check if email already exists (optional, can be handled by backend)
        try {
            ForumApp.showLoading(sendCodeBtn, true);
            await ForumApp.sendVerificationCode(email, 'register');
            
            showAlert('Verification code sent! Please check your email.', 'success');
            codeSent = true;
            
            // Start countdown
            startCountdown();
            
        } catch (error) {
            showAlert(error.message, 'danger');
        } finally {
            ForumApp.showLoading(sendCodeBtn, false);
        }
    });
    
    // Handle registration form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const code = document.getElementById('code').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validate inputs
        if (!ForumApp.validateEmail(email)) {
            showAlert('Please enter a valid email address', 'danger');
            return;
        }
        
        if (!codeSent) {
            showAlert('Please request and enter a verification code first', 'danger');
            return;
        }
        
        if (!code || code.length !== 6) {
            showAlert('Please enter the 6-digit verification code', 'danger');
            return;
        }
        
        if (!ForumApp.validatePassword(password)) {
            showAlert('Password must be at least 6 characters', 'danger');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'danger');
            return;
        }
        
        ForumApp.showLoading(submitBtn, true);
        
        try {
            await ForumApp.register(email, code, password);
            
            showAlert('Registration successful! Redirecting to login...', 'success');
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            
        } catch (error) {
            showAlert(error.message, 'danger');
        } finally {
            ForumApp.showLoading(submitBtn, false);
        }
    });
    
    function startCountdown() {
        countdown = 60;
        sendCodeBtn.disabled = true;
        
        const timer = setInterval(() => {
            sendCodeBtn.textContent = `Resend in ${countdown}s`;
            countdown--;
            
            if (countdown < 0) {
                clearInterval(timer);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = 'Send Verification Code';
                codeSent = false;
            }
        }, 1000);
    }
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
