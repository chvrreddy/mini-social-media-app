// frontend/script.js

// API Base URL
const API_BASE_URL = 'http://127.0.0.1:8000/api/';

// DOM Elements
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');
const homeLink = document.getElementById('home-link');
const profileLink = document.getElementById('profile-link');

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const closeBtn = document.querySelector('.close-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');


// --- AUTHENTICATION & NAVIGATION ---

function checkAuthentication() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        authModal.style.display = 'block';
    } else {
        showHomeFeed();
    }
}

function getUserIdFromToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id;
    } catch (e) {
        return null;
    }
}

homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    showHomeFeed();
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    const currentUserId = getUserIdFromToken();
    if (currentUserId) {
        showProfile(currentUserId);
    }
});

closeBtn.onclick = function() {
    authModal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target === authModal) {
        authModal.style.display = 'none';
    }
};

showRegisterLink.onclick = (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
};

showLoginLink.onclick = (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
};

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;

    try {
        const response = await fetch(`${API_BASE_URL}register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        if (response.ok) {
            alert('Registration successful! Please log in.');
            loginSection.style.display = 'block';
            registerSection.style.display = 'none';
            registerForm.reset();
        } else {
            const errorData = await response.json();
            alert(`Registration failed: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            authModal.style.display = 'none';
            loginForm.reset();
            showHomeFeed();
        } else {
            alert('Login failed. Please check your username and password.');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
});


// --- VIEW RENDERING FUNCTIONS ---

function showHomeFeed() {
    mainContent.innerHTML = `
        <section class="post-form-section">
            <h2>Create a New Post</h2>
            <form id="post-form" class="post-form">
                <textarea id="post-content" placeholder="What's on your mind?" required></textarea>
                <button type="submit">Post</button>
            </form>
        </section>
        <section class="feed-section">
            <h2>Feed</h2>
            <div id="posts-container" class="posts-container">
                <p class="loading">Loading posts...</p>
            </div>
        </section>
    `;
    const postForm = document.getElementById('post-form');
    postForm.addEventListener('submit', handlePostSubmission);
    fetchPosts();
}

async function showProfile(userId) {
    const token = localStorage.getItem('access_token');
    try {
        const userResponse = await fetch(`${API_BASE_URL}users/${userId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const postsResponse = await fetch(`${API_BASE_URL}users/${userId}/posts/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok || !postsResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const user = await userResponse.json();
        const posts = await postsResponse.json();
        
        const isMyProfile = (userId === getUserIdFromToken());
        
        mainContent.innerHTML = `
            <section class="profile-header">
                <h2>${user.username}'s Profile</h2>
                <p>Followers: ${user.followers_count}</p>
                <p>Following: ${user.following_count}</p>
                <button id="follow-btn" data-user-id="${user.id}" style="display: ${isMyProfile ? 'none' : 'block'};">
                    Follow
                </button>
            </section>
            <section class="feed-section">
                <h3>Posts by ${user.username}</h3>
                <div id="posts-container" class="posts-container"></div>
            </section>
        `;

        renderPosts(posts);
        
        const followBtn = document.getElementById('follow-btn');
        if (followBtn) {
            const isFollowing = user.followers_count > 0;
            followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
            followBtn.addEventListener('click', handleFollow);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        mainContent.innerHTML = '<p>Error loading profile.</p>';
    }
}


// --- POST, LIKE, COMMENT, AND FOLLOW FUNCTIONS ---

async function fetchPosts() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}posts/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch posts');

        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        const postsContainer = document.getElementById('posts-container');
        if(postsContainer) {
            postsContainer.innerHTML = '<p>Error loading posts. Please try again.</p>';
        }
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        
        const commentsHtml = post.comments.map(comment => `
            <div class="comment">
                <span class="comment-author">${comment.author.username}</span>:
                <p>${comment.content}</p>
            </div>
        `).join('');

        postElement.innerHTML = `
            <div class="post-header">
                <a href="#" class="post-author" data-user-id="${post.author.id}">${post.author.username}</a>
                <span class="post-meta">${new Date(post.created_at).toLocaleString()}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <button class="like-btn" data-post-id="${post.id}">
                    Like (${post.likes_count})
                </button>
            </div>
            <div class="comments-section">
                <h4>Comments</h4>
                <div class="comments-list">${commentsHtml}</div>
                <form class="comment-form" data-post-id="${post.id}">
                    <input type="text" placeholder="Add a comment..." required>
                    <button type="submit">Post</button>
                </form>
            </div>
        `;
        container.appendChild(postElement);
    });

    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', handleLike);
    });
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', handleCommentSubmission);
    });

    // Add this new event listener to handle author clicks
    document.querySelectorAll('.post-author').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const userId = e.target.dataset.userId;
            showProfile(userId);
        });
    });
}

// Handle new post submission
async function handlePostSubmission(e) {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Please log in to create a post.');
        return;
    }

    const postContent = document.getElementById('post-content').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}posts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: postContent }),
        });
        
        if (response.ok) {
            document.getElementById('post-content').value = '';
            fetchPosts();
        } else {
            console.error('Failed to create post:', response.statusText);
        }
    } catch (error) {
        console.error('Error creating post:', error);
    }
}

// Handle the 'like' action
async function handleLike(event) {
    const postId = event.target.dataset.postId;
    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch(`${API_BASE_URL}posts/${postId}/like/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            fetchPosts();
        } else {
            console.error('Failed to like/unlike post');
        }
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

// Handle comment submission
async function handleCommentSubmission(e) {
    e.preventDefault();
    const postId = e.target.dataset.postId;
    const commentContent = e.target.querySelector('input').value;
    const token = localStorage.getItem('access_token');

    if (!commentContent) return;

    try {
        const response = await fetch(`${API_BASE_URL}posts/${postId}/comments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: commentContent })
        });
        
        if (response.ok) {
            e.target.reset(); // Clear the comment input
            fetchPosts(); // Reload posts to show the new comment
        } else {
            console.error('Failed to post comment:', response.statusText);
        }
    } catch (error) {
        console.error('Error posting comment:', error);
    }
}

// Handle follow/unfollow
async function handleFollow(event) {
    const userId = event.target.dataset.userId;
    const token = localStorage.getItem('access_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}users/${userId}/follow/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showProfile(userId); 
        } else {
            console.error('Failed to follow/unfollow user');
        }
    } catch (error) {
        console.error('Error following user:', error);
    }
}

// --- INITIALIZATION ---
checkAuthentication();