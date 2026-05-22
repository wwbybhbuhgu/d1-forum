import { Resend } from 'resend';

// Types
interface User {
    id: number;
    email: string;
    password_hash: string | null;
    is_admin: number;
    created_at: string;
}

interface Post {
    id: number;
    user_id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    author?: string;
    comment_count?: number;
}

interface Comment {
    id: number;
    post_id: number;
    user_id: number;
    content: string;
    created_at: string;
    author?: string;
}

interface VerificationCode {
    id: number;
    email: string;
    code: string;
    purpose: string;
    expires_at: string;
    used: number;
}

interface Session {
    id: number;
    user_id: number;
    token: string;
    expires_at: string;
}

// Initialize Resend
const resend = new Resend((globalThis as any).RESEND_API_KEY || '');

// Helper functions
function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
    return crypto.randomUUID();
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
    if (!hash) return false;
    const inputHash = await hashPassword(password);
    return inputHash === hash;
}

function isAdminEnv(email: string): boolean {
    const adminEmail = (globalThis as any).ADMIN_EMAIL || 'admin@wujunbo.top';
    return email.toLowerCase() === adminEmail.toLowerCase();
}

async function sendVerificationEmail(email: string, code: string, purpose: string) {
    const subject = purpose === 'register' 
        ? 'Registration Verification Code' 
        : 'Login Verification Code';
    
    const html = `
        <h1>${subject}</h1>
        <p>Your verification code is:</p>
        <h2 style="font-size: 32px; letter-spacing: 5px;">${code}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Forum <noreply@wujunbo.top>`,
            to: [email],
            subject,
            html,
        });

        if (error) {
            console.error('Failed to send email:', error);
            throw new Error('Failed to send verification email');
        }

        return data;
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send verification email');
    }
}

// JSON response helper
function jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ error: message }, status);
}

// Get session from cookie
function getSession(request: Request): string | null {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session_token=([^;]+)/);
    return match ? match[1] : null;
}

// Get current user from session
async function getCurrentUser(env: Env, request: Request): Promise<User | null> {
    const token = getSession(request);
    if (!token) return null;

    const session = await env.DB.prepare(
        'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")'
    ).bind(token).first();

    return session as User | null;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Serve static files
        if (path.startsWith('/css/') || path.startsWith('/js/')) {
            return serveStaticFile(path, env);
        }

        // Serve HTML pages
        if (path === '/' || path === '/index.html') {
            return serveFile('/index.html', 'text/html', env);
        }
        if (path === '/login') {
            return serveFile('/login.html', 'text/html', env);
        }
        if (path === '/register') {
            return serveFile('/register.html', 'text/html', env);
        }
        if (path.startsWith('/post/')) {
            return serveFile('/post.html', 'text/html', env);
        }

        // API Routes
        // Auth routes
        if (path === '/api/auth/send-code' && method === 'POST') {
            return handleSendCode(request, env);
        }
        if (path === '/api/auth/register' && method === 'POST') {
            return handleRegister(request, env);
        }
        if (path === '/api/auth/login' && method === 'POST') {
            return handleLogin(request, env);
        }
        if (path === '/api/auth/logout' && method === 'POST') {
            return handleLogout(request, env);
        }
        if (path === '/api/auth/me' && method === 'GET') {
            return handleGetCurrentUser(request, env);
        }

        // Post routes
        if (path === '/api/posts' && method === 'GET') {
            return handleGetPosts(request, env);
        }
        if (path === '/api/posts' && method === 'POST') {
            return handleCreatePost(request, env);
        }
        if (path.startsWith('/api/posts/') && path.includes('/comments') && method === 'GET') {
            return handleGetComments(request, env);
        }
        if (path.startsWith('/api/posts/') && path.includes('/comments') && method === 'POST') {
            return handleCreateComment(request, env);
        }
        if (path.startsWith('/api/posts/') && !path.includes('/comments') && method === 'GET') {
            return handleGetPost(request, env);
        }
        if (path.startsWith('/api/posts/') && !path.includes('/comments') && method === 'PUT') {
            return handleUpdatePost(request, env);
        }
        if (path.startsWith('/api/posts/') && !path.includes('/comments') && method === 'DELETE') {
            return handleDeletePost(request, env);
        }
        if (path.startsWith('/api/posts/') && path.includes('/comments/') && method === 'DELETE') {
            return handleDeleteComment(request, env);
        }

        // Not found
        return errorResponse('Not Found', 404);
    },
};

// Static file serving
async function serveStaticFile(path: string, env: Env): Promise<Response> {
    const filePath = path.replace(/^\//, '');
    try {
        const module = await import(`../public${filePath}`);
        const contentType = path.endsWith('.css') ? 'text/css' : 'application/javascript';
        return new Response(module.default, {
            headers: { 'Content-Type': contentType },
        });
    } catch {
        return errorResponse('File not found', 404);
    }
}

async function serveFile(filename: string, contentType: string, env: Env): Promise<Response> {
    // In a real implementation, you'd read from a KV store or bundle the files
    // For now, we'll return a simple HTML response
    const files: Record<string, string> = {
        '/index.html': 'index.html',
        '/login.html': 'login.html',
        '/register.html': 'register.html',
        '/post.html': 'post.html',
    };

    // This is a simplified version - in production you'd use Workers Assets or KV
    return new Response(`<!DOCTYPE html><html><head><title>Forum</title><link rel="stylesheet" href="/css/style.css"></head><body><div id="app"></div><script src="/js/app.js"></script><script src="/js/${files[filename]?.replace('.html', '.js') || 'home.js'}"></script></body></html>`, {
        headers: { 'Content-Type': contentType },
    });
}

// Auth handlers
async function handleSendCode(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as { email: string; purpose: string };

        if (!body.email || !body.purpose) {
            return errorResponse('Email and purpose are required');
        }

        if (body.purpose !== 'register' && body.purpose !== 'login') {
            return errorResponse('Invalid purpose');
        }

        // Generate verification code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Store verification code
        await env.DB.prepare(
            'INSERT INTO verification_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(body.email, code, body.purpose, expiresAt).run();

        // Send email
        await sendVerificationEmail(body.email, code, body.purpose);

        return jsonResponse({ success: true, message: 'Verification code sent' });
    } catch (error) {
        console.error('Send code error:', error);
        return errorResponse('Failed to send verification code');
    }
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as { email: string; code: string; password: string };

        if (!body.email || !body.code || !body.password) {
            return errorResponse('All fields are required');
        }

        // Verify the code
        const verificationCode = await env.DB.prepare(
            'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = "register" AND used = 0 AND expires_at > datetime("now")'
        ).bind(body.email, body.code).first();

        if (!verificationCode) {
            return errorResponse('Invalid or expired verification code');
        }

        // Check if user already exists
        const existingUser = await env.DB.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).bind(body.email).first();

        if (existingUser) {
            return errorResponse('Email already registered');
        }

        // Hash password
        const passwordHash = await hashPassword(body.password);

        // Determine if admin
        const isAdmin = isAdminEnv(body.email) ? 1 : 0;

        // Create user
        const result = await env.DB.prepare(
            'INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)'
        ).bind(body.email, passwordHash, isAdmin).run();

        // Mark verification code as used
        await env.DB.prepare(
            'UPDATE verification_codes SET used = 1 WHERE id = ?'
        ).bind(verificationCode.id).run();

        return jsonResponse({ 
            success: true, 
            message: 'Registration successful',
            userId: result.meta.last_row_id 
        });
    } catch (error) {
        console.error('Register error:', error);
        return errorResponse('Registration failed');
    }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as { email: string; code?: string; password: string };

        if (!body.email || !body.password) {
            return errorResponse('Email and password are required');
        }

        // Find user
        const user = await env.DB.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).bind(body.email).first() as User | null;

        if (!user) {
            return errorResponse('Invalid credentials');
        }

        // Verify password
        const validPassword = await verifyPassword(body.password, user.password_hash);
        
        if (!validPassword) {
            return errorResponse('Invalid credentials');
        }

        // If code is provided, verify it (for additional security)
        if (body.code) {
            const verificationCode = await env.DB.prepare(
                'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = "login" AND used = 0 AND expires_at > datetime("now")'
            ).bind(body.email, body.code).first();

            if (!verificationCode) {
                // Don't fail login if code is invalid, just log it
                console.log('Invalid verification code provided during login');
            } else {
                // Mark as used
                await env.DB.prepare(
                    'UPDATE verification_codes SET used = 1 WHERE id = ?',
                ).bind(verificationCode.id).run();
            }
        }

        // Create session
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        await env.DB.prepare(
            'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
        ).bind(user.id, token, expiresAt).run();

        return jsonResponse({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Login failed');
    }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
    try {
        const token = getSession(request);
        
        if (token) {
            await env.DB.prepare(
                'DELETE FROM sessions WHERE token = ?'
            ).bind(token).run();
        }

        return jsonResponse({ success: true, message: 'Logged out' });
    } catch (error) {
        console.error('Logout error:', error);
        return errorResponse('Logout failed');
    }
}

async function handleGetCurrentUser(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Not authenticated', 401);
        }

        return jsonResponse({
            id: user.id,
            email: user.email,
            is_admin: user.is_admin,
        });
    } catch (error) {
        console.error('Get current user error:', error);
        return errorResponse('Failed to get user info');
    }
}

// Post handlers
async function handleGetPosts(request: Request, env: Env): Promise<Response> {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const posts = await env.DB.prepare(`
            SELECT p.*, u.email as author,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return jsonResponse({ posts: posts.results });
    } catch (error) {
        console.error('Get posts error:', error);
        return errorResponse('Failed to get posts');
    }
}

async function handleCreatePost(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const body = await request.json() as { title: string; content: string };

        if (!body.title || !body.content) {
            return errorResponse('Title and content are required');
        }

        const result = await env.DB.prepare(
            'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)'
        ).bind(user.id, body.title, body.content).run();

        return jsonResponse({
            success: true,
            message: 'Post created',
            postId: result.meta.last_row_id,
        });
    } catch (error) {
        console.error('Create post error:', error);
        return errorResponse('Failed to create post');
    }
}

async function handleGetPost(request: Request, env: Env): Promise<Response> {
    try {
        const id = request.url.split('/').pop();
        
        const post = await env.DB.prepare(`
            SELECT p.*, u.email as author
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `).bind(id).first();

        if (!post) {
            return errorResponse('Post not found', 404);
        }

        return jsonResponse({ post });
    } catch (error) {
        console.error('Get post error:', error);
        return errorResponse('Failed to get post');
    }
}

async function handleUpdatePost(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        // Check ownership or admin
        const post = await env.DB.prepare(
            'SELECT * FROM posts WHERE id = ?'
        ).bind(id).first();

        if (!post) {
            return errorResponse('Post not found', 404);
        }

        if (post.user_id !== user.id && user.is_admin !== 1) {
            return errorResponse('Unauthorized', 403);
        }

        const body = await request.json() as { title: string; content: string };

        await env.DB.prepare(
            'UPDATE posts SET title = ?, content = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(body.title, body.content, id).run();

        return jsonResponse({ success: true, message: 'Post updated' });
    } catch (error) {
        console.error('Update post error:', error);
        return errorResponse('Failed to update post');
    }
}

async function handleDeletePost(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        // Check ownership or admin
        const post = await env.DB.prepare(
            'SELECT * FROM posts WHERE id = ?'
        ).bind(id).first();

        if (!post) {
            return errorResponse('Post not found', 404);
        }

        if (post.user_id !== user.id && user.is_admin !== 1) {
            return errorResponse('Unauthorized', 403);
        }

        await env.DB.prepare(
            'DELETE FROM posts WHERE id = ?'
        ).bind(id).run();

        return jsonResponse({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Delete post error:', error);
        return errorResponse('Failed to delete post');
    }
}

// Comment handlers
async function handleGetComments(request: Request, env: Env): Promise<Response> {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const postId = pathParts[pathParts.indexOf('posts') + 1];

        const comments = await env.DB.prepare(`
            SELECT c.*, u.email as author
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `).bind(postId).all();

        return jsonResponse({ comments: comments.results });
    } catch (error) {
        console.error('Get comments error:', error);
        return errorResponse('Failed to get comments');
    }
}

async function handleCreateComment(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const postId = pathParts[pathParts.indexOf('posts') + 1];

        const body = await request.json() as { content: string };

        if (!body.content) {
            return errorResponse('Content is required');
        }

        // Verify post exists
        const post = await env.DB.prepare(
            'SELECT * FROM posts WHERE id = ?'
        ).bind(postId).first();

        if (!post) {
            return errorResponse('Post not found', 404);
        }

        const result = await env.DB.prepare(
            'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
        ).bind(postId, user.id, body.content).run();

        return jsonResponse({
            success: true,
            message: 'Comment added',
            commentId: result.meta.last_row_id,
        });
    } catch (error) {
        console.error('Create comment error:', error);
        return errorResponse('Failed to create comment');
    }
}

async function handleDeleteComment(request: Request, env: Env): Promise<Response> {
    try {
        const user = await getCurrentUser(env, request);
        
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const commentId = pathParts[pathParts.length - 1];

        // Check ownership or admin
        const comment = await env.DB.prepare(
            'SELECT * FROM comments WHERE id = ?'
        ).bind(commentId).first();

        if (!comment) {
            return errorResponse('Comment not found', 404);
        }

        if (comment.user_id !== user.id && user.is_admin !== 1) {
            return errorResponse('Unauthorized', 403);
        }

        await env.DB.prepare(
            'DELETE FROM comments WHERE id = ?'
        ).bind(commentId).run();

        return jsonResponse({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        return errorResponse('Failed to delete comment');
    }
}
