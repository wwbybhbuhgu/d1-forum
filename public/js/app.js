// API utilities
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    };
    
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth functions
async function sendVerificationCode(email, purpose = 'register') {
    return apiRequest('/auth/send-code', {
        method: 'POST',
        body: { email, purpose },
    });
}

async function register(email, code, password) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: { email, code, password },
    });
}

async function login(email, code, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: { email, code, password },
    });
}

async function logout() {
    return apiRequest('/auth/logout', {
        method: 'POST',
    });
}

async function getCurrentUser() {
    return apiRequest('/auth/me');
}

// Post functions
async function getPosts(page = 1, limit = 10) {
    return apiRequest(`/posts?page=${page}&limit=${limit}`);
}

async function getPost(id) {
    return apiRequest(`/posts/${id}`);
}

async function createPost(title, content) {
    return apiRequest('/posts', {
        method: 'POST',
        body: { title, content },
    });
}

async function updatePost(id, title, content) {
    return apiRequest(`/posts/${id}`, {
        method: 'PUT',
        body: { title, content },
    });
}

async function deletePost(id) {
    return apiRequest(`/posts/${id}`, {
        method: 'DELETE',
    });
}

// Comment functions
async function getComments(postId) {
    return apiRequest(`/posts/${postId}/comments`);
}

async function createComment(postId, content) {
    return apiRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
    });
}

async function deleteComment(postId, commentId) {
    return apiRequest(`/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
    });
}

// UI Helper functions
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Loading...';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isLoggedIn() {
    return document.cookie.includes('session_token=');
}

function isAdmin() {
    const userCookie = document.cookie.split('; ').find(row => row.startsWith('user_data='));
    if (userCookie) {
        try {
            const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
            return userData.isAdmin;
        } catch {
            return false;
        }
    }
    return false;
}

// Form validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

// Export for use in other scripts
window.ForumApp = {
    apiRequest,
    sendVerificationCode,
    register,
    login,
    logout,
    getCurrentUser,
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getComments,
    createComment,
    deleteComment,
    showAlert,
    showLoading,
    formatDate,
    isLoggedIn,
    isAdmin,
    validateEmail,
    validatePassword,
    openModal,
    closeModal,
};
