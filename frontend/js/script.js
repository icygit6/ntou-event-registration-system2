const API_URL = 'http://localhost:5500';

const headerButtons = document.getElementById('headerButtons');
const eventsList = document.getElementById('eventsList');

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Check if user is logged in
const token = localStorage.getItem('authToken');
let currentUser = null;

if (token) {
    const userData = parseJwt(token);
    if (userData && userData.email) {
        currentUser = userData;
    } else {
        // Invalid or expired token
        localStorage.removeItem('authToken');
    }
}

// Update header based on login status
if (currentUser) {
    headerButtons.innerHTML = `
        <span class='logo'>你好, `+ currentUser.name+`</span>
        <a href="events.html"><button>Manage Events</button></a>
        <button class="ghost" id="logoutBtn">Logout</button>
    `;
    
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        alert('You have successfully logged out!');
        window.location.reload();
    });
}

// Load and display events
async function loadEvents() {
    try {
        const response = await fetch(`${API_URL}/events`);
        const events = await response.json();
        
        if (response.ok) {
            displayEvents(events);
        } else {
            eventsList.innerHTML = '<p style="color: var(--muted);">Failed to load events.</p>';
        }
    } catch (err) {
        console.error(err);
        eventsList.innerHTML = '<p style="color: var(--muted);">No events available.</p>';
    }
}

function displayEvents(events) {
    if (events.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--muted);">No events scheduled yet.</p>';
        return;
    }
    
    eventsList.innerHTML = events.map(event => `
        <div class="event">
            <h3>${getEventIcon(event.title)} ${event.title}</h3>
            <small>📅 ${formatDate(event.date)} ｜ 📍 ${event.location}</small>
            ${event.description ? `<p style="color: var(--text); margin-top: 8px; font-size: 0.9rem;">${event.description}</p>` : ''}
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function getEventIcon(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('音樂') || titleLower.includes('music')) return '🎉';
    if (titleLower.includes('ai') || titleLower.includes('tech') || titleLower.includes('技術')) return '🤖';
    if (titleLower.includes('運動') || titleLower.includes('sport')) return '⚽';
    if (titleLower.includes('藝術') || titleLower.includes('art')) return '🎨';
    return '📌';
}

// Load events on page load
loadEvents();