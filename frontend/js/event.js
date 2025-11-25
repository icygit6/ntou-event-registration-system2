const API_URL = 'http://localhost:5500';
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

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

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
    setTimeout(() => errorMsg.style.display = 'none', 5000);
}

function showSuccess(msg) {
    successMsg.textContent = msg;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
    setTimeout(() => successMsg.style.display = 'none', 3000);
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

async function renderEvent(event) {
    const imgSrc = event.imagePath;

    let userApplied = false;
    if (currentUser) {
        try {
            const resp = await fetch(`${API_URL}/events/${event.id}/applied`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            userApplied = data.applied;
        } catch (err) {
            console.error('Check applied error:', err);
        }
    }

    eventContainer.innerHTML = `
        <div class="event-detail-card">
            <h2 style="margin-top:12px;">${event.title}</h2>
            ${imgSrc ? `<img src="${imgSrc}" alt="Event Image" style="width:100%; max-height:300px; object-fit:cover; border-radius:6px;"/>` : ``}
            <p><strong>📅</strong> ${new Date(event.date).toLocaleDateString()} &nbsp; <strong>📍</strong> ${event.location}</p>
            ${event.description ? `<p style="margin-top:8px;">${event.description}</p>` : ''}

            <div style="margin-top:16px;">
                ${currentUser ? 
                `<button id="actionBtn" class="submit-btn" style="${userApplied ? 'background-color:red;' : ''}">
                    ${userApplied ? 'Retract' : 'Apply'}
                </button>` 
                : `<a href="signin.html"><button class="submit-btn">Sign in to apply</button></a>`}
            </div>
        </div>
    `;

    const actionBtn = document.getElementById('actionBtn');
    if(!actionBtn) return;

    if (!userApplied) {
        actionBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_URL}/events/${event.id}/apply`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (!response.ok) {
                    showError(data.error || 'Failed to apply for event');
                    return;
                }

                showSuccess(data.message || 'Applied successfully!');
                renderEvent(event); // re-render to switch button to "Retract"
            } catch (err) {
                console.error('Apply error:', err);
                showError('Connection error. Make sure your server is running.');
            }
        });
    } else {
        actionBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_URL}/events/${event.id}/apply`, {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 0 })
                });
                const data = await response.json();

                if (!response.ok) {
                    showError(data.error || 'Failed to retract application');
                    return;
                }

                showSuccess(data.message || 'Application retracted.');
                renderEvent(event); // re-render to switch button back to "Apply"
            } catch (err) {
                console.error('Retract error:', err);
                showError('Connection error. Make sure your server is running.');
            }
        });
    }
}

loadEvent();
