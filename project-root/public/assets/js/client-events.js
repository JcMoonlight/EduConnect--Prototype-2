// Client Events Script - View Events
let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        currentUser = user;
        await loadEvents();
    }, 1000);
});

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
            return;
        }

        eventsGrid.innerHTML = '';

        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const eventCard = createEventCard(doc.id, event);
            eventsGrid.appendChild(eventCard);
        });

    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsGrid').innerHTML = 
            '<div class="table-error">Error loading events. Please refresh the page.</div>';
    }
}

// Create event card
function createEventCard(eventId, event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    let dateTimeText = 'Date TBD';
    let status = 'upcoming';
    if (event.dateTime) {
        const eventDate = event.dateTime.toDate();
        const now = new Date();
        
        dateTimeText = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (eventDate > now) {
            status = 'upcoming';
        } else if (eventDate <= now && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            status = 'ongoing';
        } else {
            status = 'completed';
        }
    }

    const attendeesCount = event.attendees ? event.attendees.length : 0;
    const isAttending = event.attendees && event.attendees.includes(currentUser.uid);

    card.innerHTML = `
        <div class="event-card-header">
            <h3 class="event-card-title">${event.eventName || 'Untitled Event'}</h3>
            <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
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

