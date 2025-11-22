const API_URL = 'http://localhost:5500';

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

const token = localStorage.getItem('authToken');
let currentUser = null;
if (token) {
    const userData = parseJwt(token);
    if (userData && userData.email) currentUser = userData;
}

const eventContainer = document.getElementById('eventContainer');
const messageBox = document.getElementById('message');

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function showMessage(txt, isError = false) {
    messageBox.style.display = 'block';
    messageBox.textContent = txt;
    messageBox.style.color = isError ? 'var(--danger)' : 'var(--accent)';
    setTimeout(() => { messageBox.style.display = 'none'; }, 4000);
}

async function loadEvent() {
    const id = getQueryParam('id');
    if (!id) {
        eventContainer.innerHTML = '<p style="color: var(--muted);">No event specified.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/events/${encodeURIComponent(id)}`);
        const event = await res.json();
        if (!res.ok) {
            eventContainer.innerHTML = `<p style="color: var(--muted);">${event.error || 'Event not found'}</p>`;
            return;
        }

        renderEvent(event);
    } catch (err) {
        console.error(err);
        eventContainer.innerHTML = '<p style="color: var(--muted);">Connection error. Make sure server is running.</p>';
    }
}

function renderEvent(event) {
    const imgSrc = event.image || 'https://via.placeholder.com/800x300?text=Event+Image';

    eventContainer.innerHTML = `
        <div class="event-detail-card">
            <img src="${imgSrc}" alt="Event Image" style="width:100%; max-height:300px; object-fit:cover; border-radius:6px;"/>
            <h2 style="margin-top:12px;">${event.title}</h2>
            <p><strong>📅</strong> ${new Date(event.date).toLocaleDateString()} &nbsp; <strong>📍</strong> ${event.location}</p>
            ${event.description ? `<p style="margin-top:8px;">${event.description}</p>` : ''}
            <div style="margin-top:16px;">
                ${currentUser ? `<button id="applyBtn" class="submit-btn">Apply</button>` : `<a href="signin.html"><button class="ghost">Sign in to apply</button></a>`}
            </div>
        </div>
    `;
}

loadEvent();
