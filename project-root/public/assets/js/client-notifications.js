// Client Notifications Script - View Own Notifications
let currentUser = null;
let notifications = [];

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        currentUser = user;
        await loadNotifications();
    }, 1000);
});

// Load user's notifications
async function loadNotifications() {
    try {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '<div class="table-loading">Loading notifications...</div>';

        const notificationsSnapshot = await db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .get();

        notifications = [];
        notificationsSnapshot.forEach(doc => {
            const notification = doc.data();
            // Only include notifications where user is in targetUserIds
            if (notification.targetUserIds && notification.targetUserIds.includes(currentUser.uid)) {
                notifications.push({
                    id: doc.id,
                    ...notification,
                    isRead: notification.readStatus && notification.readStatus[currentUser.uid] === true
                });
            }
        });

        if (notifications.length === 0) {
            notificationsList.innerHTML = '<div class="table-empty">No notifications found</div>';
            return;
        }

        notificationsList.innerHTML = '';

        notifications.forEach(notification => {
            const notificationCard = createNotificationCard(notification);
            notificationsList.appendChild(notificationCard);
        });

    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationsList').innerHTML = 
            '<div class="table-error">Error loading notifications. Please refresh the page.</div>';
    }
}

// Create notification card
function createNotificationCard(notification) {
    const card = document.createElement('div');
    card.className = `notification-card ${notification.isRead ? 'read' : 'unread'}`;

    const typeLabels = {
        'attendance_alert': 'Attendance Alert',
        'event_reminder': 'Event Reminder',
        'system_update': 'System Update'
    };

    const type = typeLabels[notification.type] || notification.type;

    let dateText = 'Just now';
    if (notification.timestamp) {
        const date = notification.timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

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
        <div class="notification-card-header">
            <div class="notification-type-badge">${type}</div>
            ${!notification.isRead ? '<span class="unread-indicator"></span>' : ''}
        </div>
        <div class="notification-card-body">
            <p class="notification-message">${notification.message || 'No message'}</p>
            <span class="notification-time">${dateText}</span>
        </div>
    `;

    // Mark as read on click
    card.addEventListener('click', async function() {
        if (!notification.isRead) {
            await markAsRead(notification.id);
            card.classList.remove('unread');
            card.classList.add('read');
            const indicator = card.querySelector('.unread-indicator');
            if (indicator) indicator.remove();
        }
    });

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
    }
}

