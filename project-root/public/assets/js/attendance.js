// Attendance Management Script - CRUD Operations
let currentUser = null;
let currentUserRole = null;
let attendanceLogs = [];
let filteredLogs = [];
let events = [];
let users = [];
let currentPage = 1;
const logsPerPage = 10;
let logToDelete = null;

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
            await loadUsers();
            await loadAttendanceLogs();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing attendance management:', error);
        }
    }, 1000);
});

// Load all events for dropdown
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events')
            .orderBy('dateTime', 'desc')
            .get();

        events = [];
        eventsSnapshot.forEach(doc => {
            events.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Populate event filter dropdown
        const eventFilter = document.getElementById('eventFilter');
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.eventName || 'Untitled Event';
            eventFilter.appendChild(option);
        });

        // Populate event dropdown in modal
        const eventSelect = document.getElementById('eventId');
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.eventName || 'Untitled Event';
            eventSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load all users (Client Users only) for dropdown
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'Client User')
            .get();

        users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Populate user dropdown in modal
        const userSelect = document.getElementById('userId');
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            const displayName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName} (${user.email})`
                : user.email || 'Unknown User';
            option.textContent = displayName;
            userSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load all attendance logs from Firestore
async function loadAttendanceLogs() {
    try {
        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading attendance records...</td></tr>';

        const logsSnapshot = await db.collection('attendanceLogs')
            .orderBy('timestamp', 'desc')
            .get();

        attendanceLogs = [];
        
        logsSnapshot.forEach(doc => {
            const logData = doc.data();
            attendanceLogs.push({
                id: doc.id,
                ...logData
            });
        });

        filteredLogs = [...attendanceLogs];
        displayAttendanceLogs();
        updatePagination();

    } catch (error) {
        console.error('Error loading attendance logs:', error);
        document.getElementById('attendanceTableBody').innerHTML = 
            '<tr><td colspan="6" class="table-error">Error loading attendance records. Please refresh the page.</td></tr>';
    }
}

// Display attendance logs in table
function displayAttendanceLogs() {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No attendance records found</td></tr>';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const pageLogs = filteredLogs.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    // Load user and event data for display
    pageLogs.forEach(async (log, index) => {
        const row = await createAttendanceRow(log, startIndex + index);
        tbody.appendChild(row);
    });
}

// Create attendance table row
async function createAttendanceRow(log, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    // Get user info
    const user = users.find(u => u.id === log.userId);
    const userName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Unknown User';

    // Get event info
    const event = events.find(e => e.id === log.eventId);
    const eventName = event ? event.eventName : 'Unknown Event';

    // Format timestamp
    let dateTimeText = 'N/A';
    if (log.timestamp) {
        const logDate = log.timestamp.toDate();
        dateTimeText = logDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get recorded by info
    let recordedByName = 'System';
    if (log.recordedBy) {
        try {
            const recordedByDoc = await db.collection('users').doc(log.recordedBy).get();
            if (recordedByDoc.exists) {
                const recordedByData = recordedByDoc.data();
                recordedByName = recordedByData.firstName && recordedByData.lastName
                    ? `${recordedByData.firstName} ${recordedByData.lastName}`
                    : recordedByData.email || 'Unknown';
            }
        } catch (error) {
            console.error('Error loading recorded by:', error);
        }
    }

    // Status badge class
    const statusClass = `status-${log.status || 'present'}`;

    row.innerHTML = `
        <td><strong>${userName}</strong></td>
        <td>${eventName}</td>
        <td>${dateTimeText}</td>
        <td><span class="status-badge ${statusClass}">${(log.status || 'present').charAt(0).toUpperCase() + (log.status || 'present').slice(1)}</span></td>
        <td>${recordedByName}</td>
        <td>
            <div class="table-actions">
                <button class="btn-action btn-edit" onclick="openEditModal('${log.id}')" title="Edit Record">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-action btn-delete" onclick="openDeleteModal('${log.id}')" title="Delete Record">
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
    // Mark Attendance Button
    document.getElementById('markAttendanceBtn').addEventListener('click', openAddModal);

    // Search Input
    document.getElementById('searchInput').addEventListener('input', applyFilters);

    // Filters
    document.getElementById('eventFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFrom').addEventListener('change', applyFilters);
    document.getElementById('dateTo').addEventListener('change', applyFilters);

    // Form Submit
    document.getElementById('attendanceForm').addEventListener('submit', handleFormSubmit);

    // Modal Close Buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);

    // Delete Confirm Button
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            if (this.closest('#attendanceModal')) closeModal();
            if (this.closest('#deleteModal')) closeDeleteModal();
        });
    });
}

// Apply Filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const eventFilter = document.getElementById('eventFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    filteredLogs = attendanceLogs.filter(log => {
        // Search filter
        if (searchTerm) {
            const user = users.find(u => u.id === log.userId);
            const event = events.find(e => e.id === log.eventId);
            const searchableText = `${user ? (user.firstName + ' ' + user.lastName + ' ' + user.email) : ''} ${event ? event.eventName : ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Event filter
        if (eventFilter && log.eventId !== eventFilter) {
            return false;
        }

        // Status filter
        if (statusFilter && log.status !== statusFilter) {
            return false;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            if (!log.timestamp) return false;
            const logDate = log.timestamp.toDate();
            
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (logDate < fromDate) return false;
            }
            
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (logDate > toDate) return false;
            }
        }

        return true;
    });

    currentPage = 1;
    displayAttendanceLogs();
    updatePagination();
}

// Open Add Modal
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Mark Attendance';
    document.getElementById('isEditMode').value = 'false';
    document.getElementById('attendanceForm').reset();
    document.getElementById('logId').value = '';
    
    // Set current date/time as default
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('timestamp').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    clearFormErrors();
    document.getElementById('attendanceModal').style.display = 'flex';
}

// Open Edit Modal
async function openEditModal(logId) {
    const log = attendanceLogs.find(l => l.id === logId);
    if (!log) return;

    document.getElementById('modalTitle').textContent = 'Edit Attendance Record';
    document.getElementById('isEditMode').value = 'true';
    document.getElementById('logId').value = log.id;
    
    // Populate form
    document.getElementById('eventId').value = log.eventId || '';
    document.getElementById('userId').value = log.userId || '';
    document.getElementById('status').value = log.status || 'present';
    
    // Format datetime for input
    if (log.timestamp) {
        const logDate = log.timestamp.toDate();
        const year = logDate.getFullYear();
        const month = String(logDate.getMonth() + 1).padStart(2, '0');
        const day = String(logDate.getDate()).padStart(2, '0');
        const hours = String(logDate.getHours()).padStart(2, '0');
        const minutes = String(logDate.getMinutes()).padStart(2, '0');
        document.getElementById('timestamp').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    document.getElementById('notes').value = log.notes || '';

    clearFormErrors();
    document.getElementById('attendanceModal').style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('attendanceModal').style.display = 'none';
    document.getElementById('attendanceForm').reset();
    clearFormErrors();
}

// Open Delete Modal
function openDeleteModal(logId) {
    const log = attendanceLogs.find(l => l.id === logId);
    if (!log) return;

    logToDelete = log;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    logToDelete = null;
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const isEditMode = document.getElementById('isEditMode').value === 'true';
    const logId = document.getElementById('logId').value;

    // Get form values
    const logData = {
        userId: document.getElementById('userId').value,
        eventId: document.getElementById('eventId').value,
        status: document.getElementById('status').value,
        timestamp: document.getElementById('timestamp').value,
        notes: document.getElementById('notes').value.trim() || null
    };

    // Validation
    if (!logData.userId) {
        showFieldError('userId', 'Student is required');
        return;
    }

    if (!logData.eventId) {
        showFieldError('eventId', 'Event is required');
        return;
    }

    if (!logData.status) {
        showFieldError('status', 'Status is required');
        return;
    }

    if (!logData.timestamp) {
        showFieldError('timestamp', 'Date and time is required');
        return;
    }

    // Convert datetime-local to Firestore Timestamp
    const timestampObj = new Date(logData.timestamp);
    const timestamp = firebase.firestore.Timestamp.fromDate(timestampObj);

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        if (isEditMode) {
            await updateAttendanceLog(logId, {
                ...logData,
                timestamp: timestamp,
                recordedBy: currentUser.uid
            });
        } else {
            await createAttendanceLog({
                ...logData,
                timestamp: timestamp,
                recordedBy: currentUser.uid
            });
        }

        closeModal();
        await loadAttendanceLogs();
        
        // Show success message
        showNotification(isEditMode ? 'Attendance record updated successfully!' : 'Attendance marked successfully!', 'success');

    } catch (error) {
        console.error('Error saving attendance:', error);
        showNotification('Error saving attendance record. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Attendance';
    }
}

// Create Attendance Log
async function createAttendanceLog(logData) {
    await db.collection('attendanceLogs').add({
        userId: logData.userId,
        eventId: logData.eventId,
        timestamp: logData.timestamp,
        status: logData.status,
        recordedBy: logData.recordedBy,
        notes: logData.notes
    });

    // Update event attendees array if status is present
    if (logData.status === 'present') {
        const eventRef = db.collection('events').doc(logData.eventId);
        const eventDoc = await eventRef.get();
        
        if (eventDoc.exists) {
            const eventData = eventDoc.data();
            const attendees = eventData.attendees || [];
            
            if (!attendees.includes(logData.userId)) {
                await eventRef.update({
                    attendees: firebase.firestore.FieldValue.arrayUnion(logData.userId)
                });
            }
        }
    }

    // Log to audit trail
    const user = users.find(u => u.id === logData.userId);
    const event = events.find(e => e.id === logData.eventId);
    await logAuditTrail(currentUser.uid, 'create', `Marked attendance: ${user ? user.email : 'Unknown'} - ${event ? event.eventName : 'Unknown Event'} - ${logData.status}`);
}

// Update Attendance Log
async function updateAttendanceLog(logId, logData) {
    await db.collection('attendanceLogs').doc(logId).update({
        userId: logData.userId,
        eventId: logData.eventId,
        timestamp: logData.timestamp,
        status: logData.status,
        recordedBy: logData.recordedBy,
        notes: logData.notes
    });

    // Log to audit trail
    const user = users.find(u => u.id === logData.userId);
    const event = events.find(e => e.id === logData.eventId);
    await logAuditTrail(currentUser.uid, 'update', `Updated attendance: ${user ? user.email : 'Unknown'} - ${event ? event.eventName : 'Unknown Event'} - ${logData.status}`);
}

// Confirm Delete
async function confirmDelete() {
    if (!logToDelete) return;

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    try {
        await db.collection('attendanceLogs').doc(logToDelete.id).delete();

        // Log to audit trail
        const user = users.find(u => u.id === logToDelete.userId);
        const event = events.find(e => e.id === logToDelete.eventId);
        await logAuditTrail(currentUser.uid, 'delete', `Deleted attendance record: ${user ? user.email : 'Unknown'} - ${event ? event.eventName : 'Unknown Event'}`);

        closeDeleteModal();
        await loadAttendanceLogs();
        
        showNotification('Attendance record deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting attendance log:', error);
        showNotification('Error deleting attendance record. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Record';
    }
}

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const pagination = document.getElementById('attendancePagination');
    const prevBtn = document.getElementById('attendancePrevBtn');
    const nextBtn = document.getElementById('attendanceNextBtn');
    const paginationInfo = document.getElementById('attendancePaginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

document.getElementById('attendancePrevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayAttendanceLogs();
        updatePagination();
    }
});

document.getElementById('attendanceNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayAttendanceLogs();
        updatePagination();
    }
});

// Clear Form Errors
function clearFormErrors() {
    const errorElements = document.querySelectorAll('#attendanceForm .error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });

    const inputElements = document.querySelectorAll('#attendanceForm input, #attendanceForm select, #attendanceForm textarea');
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
window.openDeleteModal = openDeleteModal;

