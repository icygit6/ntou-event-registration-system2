const API_URL = 'http://localhost:5500';

const headerButtons = document.getElementById('headerButtons');
const eventsList = document.getElementById('eventsList');
const searchInput = document.getElementById('searchInput');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const sidePanel = document.getElementById('sidePanel');
const sideMenu = document.getElementById('sideMenu');
const closeSidePanel = document.getElementById('closeSidePanel');
const pageTitle = document.getElementById('pageTitle');

let allEvents = [];       // Original events

function closeSlidePanel() {
    sidePanel.classList.remove('open');
}

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

let newChild = document.createElement('li');
newChild.className = "menu-item events";
newChild.textContent = "Events";
sideMenu.appendChild(newChild);

// Update header based on login status
if (currentUser) {
    let htmlDesc = `<span class='logo'>你好, `+ currentUser.name+`</span>`;
    if(currentUser.role == 'Advanced User')
        htmlDesc += `<a href="manage_events.html"><button>Manage Events</button></a>`;
    htmlDesc += `<button class="ghost" id="logoutBtn">Logout</button>`;

    headerButtons.innerHTML = htmlDesc;
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        alert('You have successfully logged out!');
        window.location.reload();
    });

    const className = ["menu-item history", "menu-item user", "separator", "menu-item changePass"];
    const textContent = ["History", "User List", null, "Change Password"]

    for(let i = 0; i < className.length; i++)
    {
        newChild = document.createElement('li');
        newChild.className = className[i];

        if(className[i] == "separator")
        {
            const hr = document.createElement('hr');
            newChild.appendChild(hr);
        }
        else
        {
            newChild.textContent = textContent[i];
        }
        sideMenu.appendChild(newChild);
    }

    if(currentUser.role == "user")
    {
        const userLi = document.querySelector(".menu-item.user");
        if (userLi) userLi.style.display = "none";
    }
}

// Load and display events
async function loadEvents() {
    pageTitle.textContent = "活動列表 (Events)";
    try {
        const response = await fetch(`${API_URL}/events`);
        const events = await response.json();
        
        if (response.ok) {
            allEvents = events; // Store all events
            displayEvents(events);
        } else {
            eventsList.innerHTML = '<p style="color: var(--muted);">Failed to load events.</p>';
        }
    } catch (err) {
        console.error(err);
        eventsList.innerHTML = '<p style="color: var(--muted);">No events available.</p>';
    }
}

async function loadHistory() {
    pageTitle.textContent = "歷史活動 (History)";
    try {
        const response = await fetch(`${API_URL}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const events = await response.json();

        if (response.ok) {
            allEvents = events; 
            displayEvents(events);
        } else {
            eventsList.innerHTML = '<p style="color: var(--muted);">Failed to load history.</p>';
        }
    } catch (err) {
        console.error(err);
        eventsList.innerHTML = '<p style="color: var(--muted);">No history available.</p>';
    }
}

function searchEvents(query) {
    if (!query.trim()) {
        // If search is empty, display all events
        displayEvents(allEvents);
        return;
    }
    
    // Filter events by title (case-insensitive)
    const filteredEvents = allEvents.filter(event => 
        event.title.toLowerCase().includes(query.toLowerCase())
    );
    
    displayEvents(filteredEvents);
}

function triggerSearch() {
    const query = searchInput.value;
    searchEvents(query);
}

function displayEvents(events) {
    if (events.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--muted);">No data found.</p>';
        return;
    }
    
    eventsList.innerHTML = events.map(event => `
        <div class="event" style="cursor: pointer;" onclick="window.location.href='event.html?id=${event.id}'">
            <h3>${getEventIcon(event.title)} ${event.title}</h3>
            ${event.imagePath ? `<img src="${event.imagePath}" alt="${event.title}" style="max-width:220px; border-radius:6px; display:block; margin-bottom:8px;">` : ''}
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

// Search functionality
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchEvents(e.target.value);
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = "";
    triggerSearch(); // Reload full list after clearing
}

// Apply for an event
async function applyEvent(eventId, eventTitle) {
    if (!currentUser) {
        alert('Please sign in to apply for events');
        window.location.href = 'signin.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/events/${eventId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Successfully applied for "${eventTitle}"!`);
        } else {
            alert(data.error || 'Failed to apply for event');
        }
    } catch (err) {
        console.error(err);
        alert('Connection error. Please try again.');
    }
}

hamburgerMenu.addEventListener('click', () => {
    sidePanel.classList.add('open');
});

// Close panel
closeSidePanel.addEventListener('click', () => {
    closeSlidePanel();
});

// Clicking outside closes it (optional)
document.addEventListener('click', (e) => {
    if (!sidePanel.contains(e.target) && !hamburgerMenu.contains(e.target)) {
        closeSlidePanel();
    }
});

sideMenu.addEventListener("click", e => {

    const item = e.target.closest(".menu-item");
    if (!item) return;  // click wasn't on an li

    if (item.classList.contains("events")) {
        loadEvents();
    }
    if (item.classList.contains("history")) {
        loadHistory();
    }
    if (item.classList.contains("changePass")) {
        window.location.href = 'changePass.html';
    }

    closeSlidePanel();
});
