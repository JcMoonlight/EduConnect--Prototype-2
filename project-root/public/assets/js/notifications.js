// Notifications Management Script
let currentUser = null;
let currentUserRole = null;
let notifications = [];
let filteredNotifications = [];
let allUsers = [];
let currentPage = 1;
const notificationsPerPage = 10;
let notificationToDelete = null;

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser = user;
            currentUserRole = userData.role;

            if (currentUserRole !== 'Admin' && currentUserRole !== 'Super Admin') {
                alert('Access denied. This page is for administrators only.');
                window.location.href = 'dashboard.html';
                return;
            }

            await loadUsers();
            await loadNotifications();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }, 1000);
});

// Load all users
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        allUsers = [];
        usersSnapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        populateUsersList();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Populate users list in modal
function populateUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    allUsers.forEach(user => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'user-checkbox';
        checkbox.value = user.id;
        checkbox.dataset.role = user.role;
        
        const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email || 'Unknown User';
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${displayName} (${user.role})`));
        usersList.appendChild(label);
    });
}

// Load all notifications
async function loadNotifications() {
    try {
        const tbody = document.getElementById('notificationsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading notifications...</td></tr>';

        const notificationsSnapshot = await db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .get();

        notifications = [];
        notificationsSnapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        filteredNotifications = [...notifications];
        displayNotifications();
        updatePagination();
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationsTableBody').innerHTML = 
            '<tr><td colspan="5" class="table-error">Error loading notifications. Please refresh the page.</td></tr>';
    }
}

// Display notifications in table
function displayNotifications() {
    const tbody = document.getElementById('notificationsTableBody');
    
    if (filteredNotifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No notifications found</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * notificationsPerPage;
    const endIndex = startIndex + notificationsPerPage;
    const pageNotifications = filteredNotifications.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    pageNotifications.forEach((notification, index) => {
        const row = createNotificationRow(notification, startIndex + index);
        tbody.appendChild(row);
    });
}

// Create notification table row
function createNotificationRow(notification, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    const message = notification.message || 'No message';
    const type = notification.type || 'system_update';
    const recipientsCount = notification.targetUserIds ? notification.targetUserIds.length : 0;
    
    let dateText = 'N/A';
    if (notification.timestamp) {
        const date = notification.timestamp.toDate();
        dateText = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const typeLabels = {
        'attendance_alert': 'Attendance Alert',
        'event_reminder': 'Event Reminder',
        'system_update': 'System Update'
    };

    row.innerHTML = `
        <td><strong>${message.length > 50 ? message.substring(0, 50) + '...' : message}</strong></td>
        <td><span class="status-badge status-info">${typeLabels[type] || type}</span></td>
        <td>${recipientsCount} ${recipientsCount === 1 ? 'recipient' : 'recipients'}</td>
        <td>${dateText}</td>
        <td>
            <div class="table-actions">
                <button class="btn-action btn-delete" onclick="openDeleteModal('${notification.id}')" title="Delete Notification">
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
    document.getElementById('sendNotificationBtn').addEventListener('click', openModal);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('notificationForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Select all checkboxes
    document.getElementById('selectAllUsers').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });

    document.getElementById('selectAllStudents').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.user-checkbox[data-role="Client User"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });

    document.getElementById('selectAllAdmins').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.user-checkbox[data-role="Admin"], .user-checkbox[data-role="Super Admin"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            if (this.closest('#notificationModal')) closeModal();
            if (this.closest('#deleteModal')) closeDeleteModal();
        });
    });
}

// Apply Filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    filteredNotifications = notifications.filter(notification => {
        if (searchTerm && !notification.message.toLowerCase().includes(searchTerm)) {
            return false;
        }
        if (typeFilter && notification.type !== typeFilter) {
            return false;
        }
        return true;
    });

    currentPage = 1;
    displayNotifications();
    updatePagination();
}

// Open Modal
function openModal() {
    document.getElementById('notificationForm').reset();
    document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
    clearFormErrors();
    document.getElementById('notificationModal').style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('notificationModal').style.display = 'none';
    document.getElementById('notificationForm').reset();
    clearFormErrors();
}

// Open Delete Modal
function openDeleteModal(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    notificationToDelete = notification;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    notificationToDelete = null;
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const message = document.getElementById('message').value.trim();
    const type = document.getElementById('type').value;
    const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);

    if (!message) {
        showFieldError('message', 'Message is required');
        return;
    }

    if (!type) {
        showFieldError('type', 'Type is required');
        return;
    }

    if (selectedUsers.length === 0) {
        showFieldError('targetUsers', 'At least one recipient is required');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const readStatus = {};
        selectedUsers.forEach(userId => {
            readStatus[userId] = false;
        });

        await db.collection('notifications').add({
            message: message,
            type: type,
            targetUserIds: selectedUsers,
            readStatus: readStatus,
            createdBy: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAuditTrail(currentUser.uid, 'create', `Sent notification: ${type} to ${selectedUsers.length} recipient(s)`);

        closeModal();
        await loadNotifications();
        showNotification('Notification sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Error sending notification. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Notification';
    }
}

// Confirm Delete
async function confirmDelete() {
    if (!notificationToDelete) return;

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    try {
        await db.collection('notifications').doc(notificationToDelete.id).delete();
        await logAuditTrail(currentUser.uid, 'delete', `Deleted notification: ${notificationToDelete.message.substring(0, 50)}`);

        closeDeleteModal();
        await loadNotifications();
        showNotification('Notification deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting notification:', error);
        showNotification('Error deleting notification. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Notification';
    }
}

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
    const pagination = document.getElementById('notificationsPagination');
    const prevBtn = document.getElementById('notificationsPrevBtn');
    const nextBtn = document.getElementById('notificationsNextBtn');
    const paginationInfo = document.getElementById('notificationsPaginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

document.getElementById('notificationsPrevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayNotifications();
        updatePagination();
    }
});

document.getElementById('notificationsNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayNotifications();
        updatePagination();
    }
});

// Clear Form Errors
function clearFormErrors() {
    document.querySelectorAll('#notificationForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#notificationForm input, #notificationForm select, #notificationForm textarea').forEach(el => {
        el.classList.remove('error');
    });
}

// Show Field Error
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
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
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.openDeleteModal = openDeleteModal;

