// Events Management Script - CRUD Operations
let currentUser = null;
let currentUserRole = null;
let events = [];
let filteredEvents = [];
let currentPage = 1;
const eventsPerPage = 10;
let eventToDelete = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth guard
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser = user;
            currentUserRole = userData.role;

            // Check if user has access - Only Admin and Super Admin
            if (currentUserRole !== 'Admin' && currentUserRole !== 'Super Admin') {
                alert('Access denied. This page is for administrators only.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Initialize
            await loadEvents();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing events management:', error);
        }
    }, 1000);
});

// Load all events from Firestore
async function loadEvents() {
    try {
        const tbody = document.getElementById('eventsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading events...</td></tr>';

        const eventsSnapshot = await db.collection('events')
            .orderBy('dateTime', 'desc')
            .get();

        events = [];
        
        eventsSnapshot.forEach(doc => {
            const eventData = doc.data();
            events.push({
                id: doc.id,
                ...eventData
            });
        });

        filteredEvents = [...events];
        displayEvents();
        updatePagination();

    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsTableBody').innerHTML = 
            '<tr><td colspan="6" class="table-error">Error loading events. Please refresh the page.</td></tr>';
    }
}

// Display events in table
function displayEvents() {
    const tbody = document.getElementById('eventsTableBody');
    
    if (filteredEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No events found</td></tr>';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const pageEvents = filteredEvents.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    pageEvents.forEach((event, index) => {
        const row = createEventRow(event, startIndex + index);
        tbody.appendChild(row);
    });
}

// Create event table row
function createEventRow(event, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    // Format date and time
    let dateTimeText = 'N/A';
    let status = 'completed';
    if (event.dateTime) {
        const eventDate = event.dateTime.toDate();
        const now = new Date();
        
        dateTimeText = eventDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determine status
        if (eventDate > now) {
            status = 'upcoming';
        } else if (eventDate <= now && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            status = 'ongoing';
        } else {
            status = 'completed';
        }
    }

    // Get attendees count
    const attendeesCount = event.attendees ? event.attendees.length : 0;

    row.innerHTML = `
        <td><strong>${event.eventName || 'Untitled Event'}</strong></td>
        <td>${dateTimeText}</td>
        <td>${event.location || 'N/A'}</td>
        <td>${attendeesCount} ${attendeesCount === 1 ? 'attendee' : 'attendees'}</td>
        <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td>
            <div class="table-actions">
                <button class="btn-action btn-edit" onclick="openEditModal('${event.id}')" title="Edit Event">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-action btn-info" onclick="viewAttendees('${event.id}')" title="View Attendees">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </button>
                <button class="btn-action btn-delete" onclick="openDeleteModal('${event.id}')" title="Delete Event">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Event Button
    document.getElementById('addEventBtn').addEventListener('click', openAddModal);

    // Search Input
    document.getElementById('searchInput').addEventListener('input', applyFilters);

    // Status Filter
    document.getElementById('statusFilter').addEventListener('change', applyFilters);

    // Form Submit
    document.getElementById('eventForm').addEventListener('submit', handleFormSubmit);

    // Modal Close Buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('closeAttendeesModalBtn').addEventListener('click', closeAttendeesModal);
    document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);

    // Delete Confirm Button
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            if (this.closest('#eventModal')) closeModal();
            if (this.closest('#attendeesModal')) closeAttendeesModal();
            if (this.closest('#deleteModal')) closeDeleteModal();
        });
    });
}

// Apply Filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredEvents = events.filter(event => {
        // Search filter
        if (searchTerm) {
            const searchableText = `${event.eventName || ''} ${event.location || ''} ${event.description || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Status filter
        if (statusFilter) {
            const now = new Date();
            const eventDate = event.dateTime ? event.dateTime.toDate() : null;
            
            if (!eventDate) return false;

            if (statusFilter === 'upcoming' && eventDate <= now) return false;
            if (statusFilter === 'ongoing' && (eventDate > now || eventDate < new Date(now.getTime() - 24 * 60 * 60 * 1000))) return false;
            if (statusFilter === 'completed' && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) return false;
        }

        return true;
    });

    currentPage = 1;
    displayEvents();
    updatePagination();
}

// Open Add Modal
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Create Event';
    document.getElementById('isEditMode').value = 'false';
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    clearFormErrors();
    document.getElementById('eventModal').style.display = 'flex';
}

// Open Edit Modal
function openEditModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    document.getElementById('modalTitle').textContent = 'Edit Event';
    document.getElementById('isEditMode').value = 'true';
    document.getElementById('eventId').value = event.id;
    
    // Populate form
    document.getElementById('eventName').value = event.eventName || '';
    document.getElementById('description').value = event.description || '';
    
    // Format datetime for input
    if (event.dateTime) {
        const eventDate = event.dateTime.toDate();
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        const hours = String(eventDate.getHours()).padStart(2, '0');
        const minutes = String(eventDate.getMinutes()).padStart(2, '0');
        document.getElementById('dateTime').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    document.getElementById('location').value = event.location || '';

    clearFormErrors();
    document.getElementById('eventModal').style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.getElementById('eventForm').reset();
    clearFormErrors();
}

// View Attendees
async function viewAttendees(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const attendeesList = document.getElementById('attendeesList');
    attendeesList.innerHTML = '<p>Loading attendees...</p>';

    document.getElementById('attendeesModal').style.display = 'flex';

    try {
        const attendees = event.attendees || [];
        
        if (attendees.length === 0) {
            attendeesList.innerHTML = '<p class="table-empty">No attendees yet</p>';
            return;
        }

        // Get user details for each attendee
        const userPromises = attendees.map(userId => 
            db.collection('users').doc(userId).get()
        );

        const userDocs = await Promise.all(userPromises);
        let html = '<div class="attendees-grid">';
        
        userDocs.forEach((userDoc, index) => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                const displayName = userData.firstName && userData.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData.username || userData.email || 'Unknown User';
                
                html += `
                    <div class="attendee-item">
                        <div class="attendee-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div class="attendee-info">
                            <p class="attendee-name">${displayName}</p>
                            <p class="attendee-email">${userData.email || 'N/A'}</p>
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        attendeesList.innerHTML = html;

    } catch (error) {
        console.error('Error loading attendees:', error);
        attendeesList.innerHTML = '<p class="table-error">Error loading attendees</p>';
    }
}

// Close Attendees Modal
function closeAttendeesModal() {
    document.getElementById('attendeesModal').style.display = 'none';
}

// Open Delete Modal
function openDeleteModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    eventToDelete = event;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    eventToDelete = null;
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const isEditMode = document.getElementById('isEditMode').value === 'true';
    const eventId = document.getElementById('eventId').value;

    // Get form values
    const eventData = {
        eventName: document.getElementById('eventName').value.trim(),
        description: document.getElementById('description').value.trim(),
        dateTime: document.getElementById('dateTime').value,
        location: document.getElementById('location').value.trim()
    };

    // Validation
    if (!eventData.eventName) {
        showFieldError('eventName', 'Event name is required');
        return;
    }

    if (!eventData.description) {
        showFieldError('description', 'Description is required');
        return;
    }

    if (!eventData.dateTime) {
        showFieldError('dateTime', 'Date and time is required');
        return;
    }

    if (!eventData.location) {
        showFieldError('location', 'Location is required');
        return;
    }

    // Convert datetime-local to Firestore Timestamp
    const dateTimeObj = new Date(eventData.dateTime);
    const timestamp = firebase.firestore.Timestamp.fromDate(dateTimeObj);

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        if (isEditMode) {
            await updateEvent(eventId, {
                ...eventData,
                dateTime: timestamp,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await createEvent({
                ...eventData,
                dateTime: timestamp,
                createdBy: currentUser.uid,
                attendees: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        closeModal();
        await loadEvents();
        
        // Show success message
        showNotification(isEditMode ? 'Event updated successfully!' : 'Event created successfully!', 'success');

    } catch (error) {
        console.error('Error saving event:', error);
        showNotification('Error saving event. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Event';
    }
}

// Create Event
async function createEvent(eventData) {
    const eventRef = await db.collection('events').add(eventData);
    const eventId = eventRef.id;

    // Log detailed event creation to audit trail
    await logAuditTrailDetailed(
        currentUser.uid,
        'create',
        'event',
        `Created event: ${eventData.eventName}`,
        ['Event Name', 'Description', 'Date/Time', 'Location'],
        {},
        {
            eventName: eventData.eventName,
            description: eventData.description || 'N/A',
            dateTime: eventData.dateTime ? eventData.dateTime.toDate().toLocaleString() : 'N/A',
            location: eventData.location || 'N/A'
        }
    );
}

// Update Event
async function updateEvent(eventId, eventData) {
    // Get existing event data for comparison
    const existingEventDoc = await db.collection('events').doc(eventId).get();
    const existingEvent = existingEventDoc.exists ? existingEventDoc.data() : {};
    
    await db.collection('events').doc(eventId).update(eventData);

    // Track changes for audit trail
    const changes = [];
    const oldValues = {};
    const newValues = {};

    if (eventData.eventName && eventData.eventName !== existingEvent.eventName) {
        oldValues.eventName = existingEvent.eventName || 'N/A';
        newValues.eventName = eventData.eventName;
        changes.push('Event Name');
    }

    if (eventData.description && eventData.description !== existingEvent.description) {
        oldValues.description = existingEvent.description || 'N/A';
        newValues.description = eventData.description;
        changes.push('Description');
    }

    if (eventData.dateTime && eventData.dateTime.toMillis() !== existingEvent.dateTime?.toMillis()) {
        oldValues.dateTime = existingEvent.dateTime ? existingEvent.dateTime.toDate().toLocaleString() : 'N/A';
        newValues.dateTime = eventData.dateTime.toDate().toLocaleString();
        changes.push('Date/Time');
    }

    if (eventData.location && eventData.location !== existingEvent.location) {
        oldValues.location = existingEvent.location || 'N/A';
        newValues.location = eventData.location;
        changes.push('Location');
    }

    // Log detailed update to audit trail
    if (changes.length > 0) {
        await logAuditTrailDetailed(
            currentUser.uid,
            'update',
            'event',
            `Updated event: ${eventData.eventName || existingEvent.eventName} - ${changes.join(', ')}`,
            changes,
            oldValues,
            newValues
        );
    } else {
        // Fallback to simple log if no changes detected
        await logAuditTrail(currentUser.uid, 'update', `Updated event: ${eventData.eventName || existingEvent.eventName}`);
    }
}

// Confirm Delete
async function confirmDelete() {
    if (!eventToDelete) return;

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    try {
        await db.collection('events').doc(eventToDelete.id).delete();

        // Log to audit trail
        await logAuditTrail(currentUser.uid, 'delete', `Deleted event: ${eventToDelete.eventName}`);

        closeDeleteModal();
        await loadEvents();
        
        showNotification('Event deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Error deleting event. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Event';
    }
}

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    const pagination = document.getElementById('eventsPagination');
    const prevBtn = document.getElementById('eventsPrevBtn');
    const nextBtn = document.getElementById('eventsNextBtn');
    const paginationInfo = document.getElementById('eventsPaginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

document.getElementById('eventsPrevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayEvents();
        updatePagination();
    }
});

document.getElementById('eventsNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayEvents();
        updatePagination();
    }
});

// Clear Form Errors
function clearFormErrors() {
    const errorElements = document.querySelectorAll('#eventForm .error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });

    const inputElements = document.querySelectorAll('#eventForm input, #eventForm textarea');
    inputElements.forEach(el => {
        el.classList.remove('error');
    });
}

// Show Field Error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Log Audit Trail
async function logAuditTrail(userId, action, details) {
    try {
        await db.collection('auditTrail').add({
            userId: userId,
            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ipAddress: await getClientIP()
        });
    } catch (error) {
        console.error('Error logging audit trail:', error);
    }
}

// Log Audit Trail with Detailed Field Changes
async function logAuditTrailDetailed(userId, action, resourceType, details, changedFields, oldValues, newValues) {
    try {
        await db.collection('auditTrail').add({
            userId: userId,
            action: action,
            resourceType: resourceType, // e.g., 'event', 'profile', 'password'
            details: details,
            changedFields: changedFields, // Array of field names that changed
            oldValues: oldValues, // Object with old values
            newValues: newValues, // Object with new values
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ipAddress: await getClientIP()
        });
    } catch (error) {
        console.error('Error logging detailed audit trail:', error);
    }
}

// Get Client IP
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}

// Show Notification
function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Make functions globally accessible for onclick handlers
window.openEditModal = openEditModal;
window.viewAttendees = viewAttendees;
window.openDeleteModal = openDeleteModal;

