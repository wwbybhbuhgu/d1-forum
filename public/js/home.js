// Home page JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    await initNavigation();
    await loadPosts();
    
    // Check if user is logged in to show new post button
    if (ForumApp.isLoggedIn()) {
        document.getElementById('new-post-btn').style.display = 'block';
    }
});

// Initialize navigation based on login status
async function initNavigation() {
    const navMenu = document.getElementById('nav-menu');
    const isLoggedIn = ForumApp.isLoggedIn();
    
    if (isLoggedIn) {
        try {
            const user = await ForumApp.getCurrentUser();
            navMenu.innerHTML = `
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><span>Welcome, ${user.email}</span></li>
                    <li><a href="#" onclick="handleLogout(event)">Logout</a></li>
                </ul>
            `;
        } catch {
            navMenu.innerHTML = `
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/login">Login</a></li>
                    <li><a href="/register">Register</a></li>
                </ul>
            `;
        }
    } else {
        navMenu.innerHTML = `
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/login">Login</a></li>
                <li><a href="/register">Register</a></li>
            </ul>
        `;
    }
}

// Load posts list
async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    
    try {
        const data = await ForumApp.getPosts();
        
        if (!data.posts || data.posts.length === 0) {
            postsList.innerHTML = '<p class="text-center">No posts yet. Be the first to create one!</p>';
            return;
        }
        
        postsList.innerHTML = data.posts.map(post => `
            <div class="post-item">
                <h3 class="post-title">
                    <a href="/post/${post.id}">${escapeHtml(post.title)}</a>
                </h3>
                <div class="post-meta">
                    By ${escapeHtml(post.author)} • ${ForumApp.formatDate(post.created_at)}
                    ${post.comment_count > 0 ? `• ${post.comment_count} comments` : ''}
                </div>
                <p class="post-excerpt">${escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</p>
            </div>
        `).join('');
        
    } catch (error) {
        postsList.innerHTML = `<p class="alert alert-danger">Failed to load posts: ${error.message}</p>`;
    }
}

// Handle new post button click
document.getElementById('new-post-btn')?.addEventListener('click', () => {
    if (!ForumApp.isLoggedIn()) {
        ForumApp.showAlert('Please login to create a post', 'info');
        window.location.href = '/login';
        return;
    }
    ForumApp.openModal('new-post-modal');
});

// Handle new post form submission
document.getElementById('new-post-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    ForumApp.showLoading(submitBtn, true);
    
    try {
        await ForumApp.createPost(titleInput.value, contentInput.value);
        ForumApp.showAlert('Post created successfully!', 'success');
        closeModal('new-post-modal');
        titleInput.value = '';
        contentInput.value = '';
        await loadPosts();
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    } finally {
        ForumApp.showLoading(submitBtn, false);
    }
});

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        await ForumApp.logout();
        ForumApp.showAlert('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal function (also defined in app.js, but making sure it's available)
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
