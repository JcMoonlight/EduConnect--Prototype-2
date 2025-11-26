// Client Events Script - View Events
let currentUser = null;
let allEvents = [];
let filteredEvents = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        currentUser = user;
        await loadEvents();
        setupEventListeners();
    }, 1000);
});

// Setup Event Listeners
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            applyFilters();
        });
    });
}

// Load all events
async function loadEvents() {
    try {
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '<div class="table-loading">Loading events...</div>';

        const eventsSnapshot = await db.collection('events')
            .orderBy('dateTime', 'desc')
            .get();

        if (eventsSnapshot.empty) {
            eventsGrid.innerHTML = '<div class="table-empty">No events found</div>';
            allEvents = [];
            filteredEvents = [];
            return;
        }

        allEvents = [];
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            allEvents.push({
                id: doc.id,
                ...event
            });
        });

        // Categorize events
        categorizeEvents();
        
        // Apply initial filter
        applyFilters();

    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsGrid').innerHTML = 
            '<div class="table-error">Error loading events. Please refresh the page.</div>';
    }
}

// Categorize events by status
function categorizeEvents() {
    const now = new Date();
    
    allEvents.forEach(event => {
        if (event.dateTime) {
            const eventDate = event.dateTime.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
            const eventEndTime = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour duration
            
            if (eventDate > now) {
                event.status = 'upcoming';
            } else if (eventDate <= now && eventEndTime >= now) {
                event.status = 'ongoing';
            } else {
                event.status = 'done';
            }
        } else {
            event.status = 'upcoming'; // Default to upcoming if no date
        }
    });
}

// Apply Filters
function applyFilters() {
    filteredEvents = allEvents.filter(event => {
        if (currentFilter === 'all') {
            return true;
        }
        return event.status === currentFilter;
    });

    displayEvents();
}

// Display Events
function displayEvents() {
    const eventsGrid = document.getElementById('eventsGrid');

    if (filteredEvents.length === 0) {
        let emptyMessage = 'No events found';
        if (currentFilter === 'upcoming') {
            emptyMessage = 'No upcoming events';
        } else if (currentFilter === 'ongoing') {
            emptyMessage = 'No ongoing events';
        } else if (currentFilter === 'done') {
            emptyMessage = 'No completed events';
        }
        eventsGrid.innerHTML = `<div class="table-empty">${emptyMessage}</div>`;
        return;
    }

    eventsGrid.innerHTML = '';

    filteredEvents.forEach(event => {
        const eventCard = createEventCard(event.id, event);
        eventsGrid.appendChild(eventCard);
    });
}

// Create event card
function createEventCard(eventId, event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    let dateTimeText = 'Date TBD';
    // Use the status that was already categorized, or determine it if not set
    let status = event.status || 'upcoming';
    
    if (event.dateTime) {
        const eventDate = event.dateTime.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
        
        dateTimeText = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // If status wasn't set, determine it now
        if (!event.status) {
            const now = new Date();
            const eventEndTime = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour duration
            
            if (eventDate > now) {
                status = 'upcoming';
            } else if (eventDate <= now && eventEndTime >= now) {
                status = 'ongoing';
            } else {
                status = 'done';
            }
        }
    }
    
    // Map status for display
    const statusLabels = {
        'upcoming': 'Upcoming',
        'ongoing': 'Ongoing',
        'done': 'Done',
        'completed': 'Done'
    };
    
    const statusLabel = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);

    const attendeesCount = event.attendees ? event.attendees.length : 0;
    const isAttending = event.attendees && event.attendees.includes(currentUser.uid);

    card.innerHTML = `
        <div class="event-card-header">
            <h3 class="event-card-title">${event.eventName || 'Untitled Event'}</h3>
            <span class="status-badge status-${status}">${statusLabel}</span>
        </div>
        <div class="event-card-body">
            <p class="event-card-description">${event.description || 'No description available.'}</p>
            <div class="event-card-details">
                <div class="event-detail-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${dateTimeText}</span>
                </div>
                <div class="event-detail-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${event.location || 'Location TBD'}</span>
                </div>
                <div class="event-detail-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>${attendeesCount} ${attendeesCount === 1 ? 'attendee' : 'attendees'}</span>
                </div>
            </div>
        </div>
        <div class="event-card-footer">
            ${isAttending ? '<span class="attending-badge">You are attending</span>' : ''}
        </div>
    `;

    return card;
}

