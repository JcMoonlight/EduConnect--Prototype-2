// Client Notifications Script - View Own Notifications
let currentUser = null;
let notifications = [];
let filteredNotifications = [];
let currentFilter = 'all';
let currentTypeFilter = '';

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) {
            console.error('No user found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;
        console.log('Loading notifications for user:', user.uid);
        await loadNotifications();
        setupEventListeners();
    }, 1000);
});

// Load user's notifications
async function loadNotifications() {
    try {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;
        
        notificationsList.innerHTML = '<div class="table-loading">Loading notifications...</div>';

        // Check if currentUser is set
        if (!currentUser || !currentUser.uid) {
            console.error('Current user not available');
            notificationsList.innerHTML = '<div class="table-error">User not authenticated. Please login again.</div>';
            return;
        }

        notifications = [];
        const userId = currentUser.uid;
        
        console.log('Querying notifications for user ID:', userId);
        
        let notificationsSnapshot;
        
        try {
            // Query notifications where the user is in targetUserIds
            // This works with Firestore security rules
            // Try with orderBy first (requires composite index)
            console.log('Attempting query with orderBy...');
            notificationsSnapshot = await db.collection('notifications')
                .where('targetUserIds', 'array-contains', userId)
                .orderBy('timestamp', 'desc')
                .get();
            console.log('Query with orderBy succeeded, got', notificationsSnapshot.size, 'notifications');
        } catch (error) {
            // If index doesn't exist, try without orderBy
            // This will still work with security rules, we'll sort client-side
            if (error.code === 'failed-precondition' || error.message.includes('index') || error.code === 'unavailable') {
                // Index missing is expected - we'll sort client-side instead
                // Only log if in development mode
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.info('Composite index not found. Fetching without orderBy (will sort client-side).');
                    console.info('To enable server-side sorting, create the index:', error.message.match(/https:\/\/[^\s]+/)?.[0] || 'See Firebase Console');
                }
                try {
                    notificationsSnapshot = await db.collection('notifications')
                        .where('targetUserIds', 'array-contains', userId)
                        .get();
                    console.log('Query succeeded, got', notificationsSnapshot.size, 'notifications');
                } catch (error2) {
                    console.error('Query failed:', error2.code, error2.message);
                    throw error2; // Re-throw to be handled by outer catch
                }
            } else {
                // For other errors (like permissions), throw immediately
                console.error('Query failed with error:', error.code, error.message);
                throw error;
            }
        }
        
        // Get user data to check role-based notifications
        let userData = null;
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            }
        } catch (error) {
            console.warn('Could not fetch user data:', error);
        }
        
        notificationsSnapshot.forEach(doc => {
            const notification = doc.data();
            
            // Since we're using where('targetUserIds', 'array-contains', userId),
            // all returned documents should already be for this user.
            // However, we'll do a safety check in case the query fell back to getting all notifications.
            let shouldInclude = false;
            
            // Check if user is in targetUserIds
            if (notification.targetUserIds) {
                const targetUserIds = Array.isArray(notification.targetUserIds) 
                    ? notification.targetUserIds 
                    : [notification.targetUserIds];
                
                // Convert to strings for comparison
                const targetUserIdsStrings = targetUserIds.map(id => String(id).trim());
                const userIdString = String(userId).trim();
                
                // Check if user ID is in the array (case-insensitive)
                shouldInclude = targetUserIdsStrings.some(id => 
                    id === userIdString || 
                    id.toLowerCase() === userIdString.toLowerCase()
                );
            }
            
            // Also check if notification is role-based (for backward compatibility)
            if (!shouldInclude && notification.targetRole && userData && userData.role) {
                shouldInclude = notification.targetRole === userData.role || 
                               (notification.targetRole === 'Client User' && userData.role === 'Client User');
            }
            
            // Include notification if it matches
            if (shouldInclude) {
                const userIdString = String(userId).trim();
                const isRead = notification.readStatus && 
                              typeof notification.readStatus === 'object' && 
                              (notification.readStatus[userId] === true || 
                               notification.readStatus[userIdString] === true);
                
                notifications.push({
                    id: doc.id,
                    ...notification,
                    isRead: isRead
                });
            }
        });

        // Sort notifications: unread first, then by timestamp
        notifications.sort((a, b) => {
            if (a.isRead !== b.isRead) {
                return a.isRead ? 1 : -1;
            }
            if (a.timestamp && b.timestamp) {
                try {
                    return b.timestamp.toDate() - a.timestamp.toDate();
                } catch (e) {
                    return 0;
                }
            }
            return 0;
        });

        filteredNotifications = [...notifications];
        updateStats();
        applyFilters();

        console.log(`Loaded ${notifications.length} notifications for user ${userId}`);
        
        // Debug: Log if no notifications found
        if (notifications.length === 0) {
            console.log('No notifications found. Checking notification structure...');
            const sampleNotification = notificationsSnapshot.docs[0];
            if (sampleNotification) {
                const sampleData = sampleNotification.data();
                console.log('Sample notification structure:', {
                    hasTargetUserIds: !!sampleData.targetUserIds,
                    targetUserIdsType: typeof sampleData.targetUserIds,
                    targetUserIdsValue: sampleData.targetUserIds,
                    currentUserId: userId
                });
            }
        }

    } catch (error) {
        console.error('Error loading notifications:', error);
        console.error('Error details:', error.message, error.code, error.stack);
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            let errorMessage = 'Error loading notifications. ';
            
            if (error.code === 'permission-denied' || error.message.includes('permissions')) {
                errorMessage += 'You do not have permission to view notifications. Please contact an administrator.';
            } else if (error.code === 'failed-precondition') {
                errorMessage += 'A required index is missing. Please contact an administrator to create the index.';
            } else {
                errorMessage += 'Please refresh the page or contact support if the problem persists.';
            }
            
            notificationsList.innerHTML = `<div class="table-error">${errorMessage}</div>`;
        }
    }
}

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

    // Type filter
    document.getElementById('typeFilter').addEventListener('change', function() {
        currentTypeFilter = this.value;
        applyFilters();
    });

    // Mark all as read button
    document.getElementById('markAllReadBtn').addEventListener('click', markAllAsRead);
}

// Apply Filters
function applyFilters() {
    filteredNotifications = notifications.filter(notification => {
        // Status filter
        if (currentFilter === 'unread' && notification.isRead) {
            return false;
        }
        if (currentFilter === 'read' && !notification.isRead) {
            return false;
        }

        // Type filter
        if (currentTypeFilter && notification.type !== currentTypeFilter) {
            return false;
        }

        return true;
    });

    displayNotifications();
}

// Display Notifications
function displayNotifications() {
    const notificationsList = document.getElementById('notificationsList');

    if (filteredNotifications.length === 0) {
        let emptyMessage = 'No notifications found';
        if (currentFilter === 'unread') {
            emptyMessage = 'No unread notifications';
        } else if (currentFilter === 'read') {
            emptyMessage = 'No read notifications';
        }
        notificationsList.innerHTML = `<div class="notification-empty">${emptyMessage}</div>`;
        return;
    }

    notificationsList.innerHTML = '';

    filteredNotifications.forEach(notification => {
        const notificationCard = createNotificationCard(notification);
        notificationsList.appendChild(notificationCard);
    });
}

// Update Stats
function updateStats() {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalCount = notifications.length;

    document.getElementById('unreadCount').textContent = unreadCount;
    document.getElementById('totalCount').textContent = totalCount;

    // Show/hide mark all as read button
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (unreadCount > 0) {
        markAllReadBtn.style.display = 'flex';
    } else {
        markAllReadBtn.style.display = 'none';
    }
}

// Create notification card
function createNotificationCard(notification) {
    const card = document.createElement('div');
    card.className = `notification-card ${notification.isRead ? 'read' : 'unread'}`;
    card.dataset.notificationId = notification.id;

    const typeLabels = {
        'attendance_alert': 'Attendance Alert',
        'event_reminder': 'Event Reminder',
        'system_update': 'System Update'
    };

    const typeIcons = {
        'attendance_alert': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`,
        'event_reminder': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>`,
        'system_update': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>`
    };

    const type = typeLabels[notification.type] || notification.type;
    const icon = typeIcons[notification.type] || typeIcons['system_update'];

    let dateText = 'Just now';
    let fullDateText = '';
    if (notification.timestamp) {
        const date = notification.timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        fullDateText = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (diffMins < 1) {
            dateText = 'Just now';
        } else if (diffMins < 60) {
            dateText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            dateText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            dateText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            dateText = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    card.innerHTML = `
        <div class="notification-card-content">
            <div class="notification-icon ${notification.type}">
                ${icon}
            </div>
            <div class="notification-main">
                <div class="notification-card-header">
                    <div class="notification-type-badge ${notification.type}">${type}</div>
                    ${!notification.isRead ? '<span class="unread-indicator"></span>' : ''}
                </div>
                <div class="notification-card-body">
                    <p class="notification-message">${notification.message || 'No message'}</p>
                    <div class="notification-footer">
                        <span class="notification-time" title="${fullDateText}">${dateText}</span>
                        ${!notification.isRead ? '<button class="mark-read-btn" title="Mark as read"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></button>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Mark as read on card click or button click
    const markReadBtn = card.querySelector('.mark-read-btn');
    const handleMarkRead = async function(e) {
        if (e) e.stopPropagation();
        if (!notification.isRead) {
            await markAsRead(notification.id);
            notification.isRead = true;
            card.classList.remove('unread');
            card.classList.add('read');
            const indicator = card.querySelector('.unread-indicator');
            if (indicator) indicator.remove();
            if (markReadBtn) markReadBtn.remove();
            updateStats();
            applyFilters();
        }
    };

    card.addEventListener('click', handleMarkRead);
    if (markReadBtn) {
        markReadBtn.addEventListener('click', handleMarkRead);
    }

    return card;
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const notificationRef = db.collection('notifications').doc(notificationId);
        await notificationRef.update({
            [`readStatus.${currentUser.uid}`]: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showNotification('Error marking notification as read. Please try again.', 'error');
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
        return;
    }

    const markAllBtn = document.getElementById('markAllReadBtn');
    markAllBtn.disabled = true;
    markAllBtn.textContent = 'Marking...';

    try {
        const batch = db.batch();
        unreadNotifications.forEach(notification => {
            const notificationRef = db.collection('notifications').doc(notification.id);
            batch.update(notificationRef, {
                [`readStatus.${currentUser.uid}`]: true
            });
        });

        await batch.commit();

        // Update local state
        notifications.forEach(notification => {
            notification.isRead = true;
        });

        // Reload to reflect changes
        await loadNotifications();
        showNotification('All notifications marked as read!', 'success');

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showNotification('Error marking notifications as read. Please try again.', 'error');
        markAllBtn.disabled = false;
        markAllBtn.textContent = 'Mark All as Read';
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

