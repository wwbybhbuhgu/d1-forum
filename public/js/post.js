// Post detail page JavaScript
let currentPostId = null;
let currentUserId = null;
let currentUserIsAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Get post ID from URL
    const pathParts = window.location.pathname.split('/');
    currentPostId = pathParts[pathParts.length - 1];
    
    if (!currentPostId) {
        ForumApp.showAlert('Invalid post ID', 'danger');
        return;
    }
    
    await initNavigation();
    await loadPost();
    await loadComments();
});

// Initialize navigation based on login status
async function initNavigation() {
    const navMenu = document.getElementById('nav-menu');
    const isLoggedIn = ForumApp.isLoggedIn();
    
    if (isLoggedIn) {
        try {
            const user = await ForumApp.getCurrentUser();
            currentUserId = user.id;
            currentUserIsAdmin = user.is_admin === 1;
            
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

// Load post detail
async function loadPost() {
    const container = document.getElementById('post-detail-container');
    
    try {
        const data = await ForumApp.getPost(currentPostId);
        const post = data.post;
        
        if (!post) {
            container.innerHTML = '<p class="alert alert-danger">Post not found</p>';
            return;
        }
        
        const isOwner = currentUserId === post.user_id || currentUserIsAdmin;
        
        container.innerHTML = `
            <div class="post-detail">
                <div class="d-flex justify-between align-center mb-2">
                    <h1 class="card-title">${escapeHtml(post.title)}</h1>
                    ${isOwner ? `
                        <div class="gap-1 d-flex">
                            <button class="btn btn-sm btn-outline" onclick="openEditModal()">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deletePost()">Delete</button>
                        </div>
                    ` : ''}
                </div>
                <div class="post-meta mb-2">
                    By ${escapeHtml(post.author)} • ${ForumApp.formatDate(post.created_at)}
                </div>
                <div class="post-content">
                    ${formatContent(post.content)}
                </div>
            </div>
        `;
        
        // Show comment form if logged in
        if (ForumApp.isLoggedIn()) {
            document.getElementById('comment-form-container').style.display = 'block';
        }
        
    } catch (error) {
        container.innerHTML = `<p class="alert alert-danger">Failed to load post: ${error.message}</p>`;
    }
}

// Load comments
async function loadComments() {
    const container = document.getElementById('comments-list');
    
    try {
        const data = await ForumApp.getComments(currentPostId);
        const comments = data.comments || [];
        
        if (comments.length === 0) {
            container.innerHTML = '<p class="text-center">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="d-flex justify-between align-center">
                    <div class="comment-author">
                        ${escapeHtml(comment.author)}
                        ${comment.is_admin ? '<span class="badge badge-admin ml-1">Admin</span>' : ''}
                    </div>
                    ${(currentUserId === comment.user_id || currentUserIsAdmin) ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">Delete</button>
                    ` : ''}
                </div>
                <div class="comment-content mt-1">${escapeHtml(comment.content)}</div>
                <div class="comment-date">${ForumApp.formatDate(comment.created_at)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `<p class="alert alert-danger">Failed to load comments: ${error.message}</p>`;
    }
}

// Handle comment form submission
document.getElementById('comment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const contentInput = document.getElementById('comment-content');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    ForumApp.showLoading(submitBtn, true);
    
    try {
        await ForumApp.createComment(currentPostId, contentInput.value);
        ForumApp.showAlert('Comment added!', 'success');
        contentInput.value = '';
        await loadComments();
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    } finally {
        ForumApp.showLoading(submitBtn, false);
    }
});

// Open edit modal
function openEditModal() {
    ForumApp.openModal('edit-post-modal');
    // Load current post data into form
    ForumApp.getPost(currentPostId).then(data => {
        document.getElementById('edit-post-title').value = data.post.title;
        document.getElementById('edit-post-content').value = data.post.content;
    });
}

// Handle edit post form submission
document.getElementById('edit-post-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('edit-post-title');
    const contentInput = document.getElementById('edit-post-content');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    ForumApp.showLoading(submitBtn, true);
    
    try {
        await ForumApp.updatePost(currentPostId, titleInput.value, contentInput.value);
        ForumApp.showAlert('Post updated!', 'success');
        closeModal('edit-post-modal');
        await loadPost();
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    } finally {
        ForumApp.showLoading(submitBtn, false);
    }
});

// Delete post
async function deletePost() {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }
    
    try {
        await ForumApp.deletePost(currentPostId);
        ForumApp.showAlert('Post deleted!', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }
    
    try {
        await ForumApp.deleteComment(currentPostId, commentId);
        ForumApp.showAlert('Comment deleted!', 'success');
        await loadComments();
    } catch (error) {
        ForumApp.showAlert(error.message, 'danger');
    }
}

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

// Format content (convert newlines to <br>)
function formatContent(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// Close modal function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
