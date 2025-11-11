const API_URL = 'http://localhost:5500';

// Check if user is logged in
const currentUser = sessionStorage.getItem('currentUser');
if (!currentUser) {
    window.location.href = 'signin.html';
}

// DOM Elements
const addEventBtn = document.getElementById('addEventBtn');
const eventFormContainer = document.getElementById('eventFormContainer');
const eventForm = document.getElementById('eventForm');
const formTitle = document.getElementById('formTitle');
const submitEventBtn = document.getElementById('submitEventBtn');
const cancelBtn = document.getElementById('cancelBtn');
const eventsList = document.getElementById('eventsList');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const logoutBtn = document.getElementById('logoutBtn');

let editingEventId = null;

// Utility Functions
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

// Show/Hide Form
function showForm(isEdit = false, eventData = null) {
    eventFormContainer.style.display = 'block';
    formTitle.textContent = isEdit ? 'Edit Event' : 'Add New Event';
    submitEventBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
    
    if (eventData) {
        document.getElementById('eventTitle').value = eventData.title;
        document.getElementById('eventDate').value = eventData.date;
        document.getElementById('eventLocation').value = eventData.location;
        document.getElementById('eventDescription').value = eventData.description || '';
        editingEventId = eventData.id;
    } else {
        eventForm.reset();
        editingEventId = null;
    }
    
    eventFormContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideForm() {
    eventFormContainer.style.display = 'none';
    eventForm.reset();
    editingEventId = null;
}

// Fetch and Display Events
async function loadEvents() {
    try {
        const response = await fetch(`${API_URL}/events`);
        const events = await response.json();
        
        if (response.ok) {
            displayEvents(events);
        } else {
            showError('Failed to load events');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error. Make sure your server is running.');
    }
}

function displayEvents(events) {
    if (events.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--muted);">No events yet. Create your first event!</p>';
        return;
    }
    
    eventsList.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-content">
                <h3>${event.title}</h3>
                <div class="event-details">
                    <span>📅 ${formatDate(event.date)}</span>
                    <span>📍 ${event.location}</span>
                </div>
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            </div>
            <div class="event-actions">
                <button class="edit-btn" onclick="editEvent(${event.id})">Edit</button>
                <button class="delete-btn" onclick="deleteEvent(${event.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Create Event
async function createEvent(eventData) {
    try {
        const response = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Event created successfully!');
            hideForm();
            loadEvents();
        } else {
            showError(data.error || 'Failed to create event');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error. Make sure your server is running.');
    }
}

// Update Event
async function updateEvent(id, eventData) {
    try {
        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Event updated successfully!');
            hideForm();
            loadEvents();
        } else {
            showError(data.error || 'Failed to update event');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error. Make sure your server is running.');
    }
}

// Edit Event
async function editEvent(id) {
    try {
        const response = await fetch(`${API_URL}/events/${id}`);
        const event = await response.json();
        
        if (response.ok) {
            showForm(true, event);
        } else {
            showError('Failed to load event details');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error.');
    }
}

// Delete Event
async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Event deleted successfully!');
            loadEvents();
        } else {
            showError('Failed to delete event');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error.');
    }
}

// Event Listeners
addEventBtn.addEventListener('click', () => showForm());

cancelBtn.addEventListener('click', hideForm);

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventData = {
        title: document.getElementById('eventTitle').value.trim(),
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value.trim(),
        description: document.getElementById('eventDescription').value.trim()
    };
    
    submitEventBtn.disabled = true;
    submitEventBtn.textContent = 'Processing...';
    
    if (editingEventId) {
        await updateEvent(editingEventId, eventData);
    } else {
        await createEvent(eventData);
    }
    
    submitEventBtn.disabled = false;
    submitEventBtn.textContent = editingEventId ? 'Update Event' : 'Save Event';
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

// Load events on page load
loadEvents();