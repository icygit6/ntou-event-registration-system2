const API_URL = 'http://localhost:5500';

// Check if user is logged in
const token = localStorage.getItem('authToken');
let currentUser = null;

if (token) {
    const userData = parseJwt(token);
    if (userData && userData.email) {
        currentUser = userData;
    } else {
        localStorage.removeItem('authToken');
    }
}

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
const eventImageInput = document.getElementById('eventImage');
const eventImagePreview = document.getElementById('eventImagePreview');
const searchInput = document.getElementById('searchInput');
const imageCheckbox = document.getElementById('removeImageCheckbox');

let editingEventId = null;
let allEvents = []; // Store all events for search filtering

// Utility Functions
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

function handleTokenError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showError('Your session has expired. Please sign in again.');
    setTimeout(() => {
        window.location.href = 'signin.html';
    }, 2000);
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

// Image preview
if (eventImageInput) {
    eventImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                eventImagePreview.src = e.target.result;
                eventImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            eventImagePreview.src = '';
            eventImagePreview.style.display = 'none';
        }
    });
}

// Show/Hide Form
function showForm(isEdit = false, eventData = null) {
    eventFormContainer.style.display = 'block';
    formTitle.textContent = isEdit ? 'Edit Event' : 'Add New Event';
    submitEventBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
    
    if (eventData) {
        console.log('showForm - loading event data with id:', eventData.id);
        document.getElementById('eventTitle').value = eventData.title;
        document.getElementById('eventDate').value = eventData.date;
        document.getElementById('eventLocation').value = eventData.location;
        document.getElementById('eventDescription').value = eventData.description || '';
        
        // Handle existing image
        if (eventData.imagePath) {
            eventImagePreview.src = eventData.imagePath;
            eventImagePreview.style.display = 'block';

            checkBoxLabel.style.display = 'inline-block';
        } else {
            eventImagePreview.src = '';
            eventImagePreview.style.display = 'none';

            checkBoxLabel.style.display = 'none';
            document.getElementById('removeImageCheckbox').checked = false;
        }

        editingEventId = eventData.id;
        console.log('editingEventId set to:', editingEventId);
    } else {
        eventForm.reset();
        eventImagePreview.src = '';
        eventImagePreview.style.display = 'none';
        checkBoxLabel.style.display = 'none';
        document.getElementById('removeImageCheckbox').checked = false;
        editingEventId = null;
    }
}

function hideForm() {
    eventFormContainer.style.display = 'none';
    eventForm.reset();
    eventImagePreview.src = '';
    eventImagePreview.style.display = 'none';
    editingEventId = null;
}

// Fetch and Display Events
async function loadEvents() {
    try {
        const response = await fetch(`${API_URL}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const events = await response.json();
        
        if (response.ok) {
            allEvents = events; // Store all events for search
            displayEvents(events);
        } else if (response.status === 401) {
            handleTokenError();
        } else {
            showError(events.error || 'Failed to load events');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error. Make sure your server is running.');
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

function clearSearch() {
    document.getElementById('searchInput').value = "";
    triggerSearch(); // Reload full list after clearing
}

function displayEvents(events) {
    if (events.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--muted);">No events yet. Create your first event!</p>';
        return;
    }
    
    console.log('Displaying events:', events);
    eventsList.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-content">
                <h3>${event.title}</h3>
                ${event.imagePath ? `<img src="${event.imagePath}" alt="${event.title}" class="event-card-image" style="max-width:200px; border-radius:6px; margin-bottom:8px;">` : ''}
                <div class="event-details">
                    <span>📅 ${formatDate(event.date)}</span>
                    <span>📍 ${event.location}</span>
                </div>
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            </div>
            <div class="event-actions">
                <button class="edit-btn" onclick="showEditEventForm(${event.id})">Edit</button>
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
        const formData = new FormData();
        formData.append('title', eventData.title);
        formData.append('date', eventData.date);
        formData.append('location', eventData.location);
        formData.append('description', eventData.description || '');

        
        if (eventImageInput?.files[0]) {
            formData.append('image', eventImageInput.files[0]);
        }

        const response = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            showSuccess('Event created successfully!');
            hideForm();
            loadEvents();
        } else if (response.status === 401) {
            handleTokenError();
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
        const formData = new FormData();
        formData.append('title', eventData.title);
        formData.append('date', eventData.date);
        formData.append('location', eventData.location);
        formData.append('description', eventData.description || '');

        if (eventImageInput?.files[0]) {
            formData.append('image', eventImageInput.files[0]); // optional
        }

        const removeImage = imageCheckbox?.checked || false;
        formData.append('removeImage', removeImage);

        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }, // no Content-Type needed
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) handleTokenError();
            else showError(data.error || 'Failed to update event');
            return;
        }

        showSuccess('Event updated successfully!');
        hideForm();
        loadEvents();
    } catch (err) {
        console.error('Update error:', err);
        showError('Connection error. Make sure your server is running.');
    }
}

// Edit Event
async function showEditEventForm(id) {
    try {
        window.scrollTo(0, 0);
        console.log('Fetching event with id:', id);
        const response = await fetch(`${API_URL}/events/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const event = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                handleTokenError();
            } else {
                showError('Failed to load event details: ' + (event.error || 'Unknown error'));
            }
            return;
        }
        
        console.log('Event fetched:', event);
        showForm(true, event);
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
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showSuccess('Event deleted successfully!');
            hideForm();
            loadEvents();
        } else if (response.status === 401) {
            handleTokenError();
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

// Search functionality
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchEvents(e.target.value);
    });
}

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
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

// Load events on page load
loadEvents();
window.showEditEventForm = showEditEventForm;
window.deleteEvent = deleteEvent;