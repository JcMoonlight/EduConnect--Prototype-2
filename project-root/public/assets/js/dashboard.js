// Dashboard Script - Loads dashboard data and statistics
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth guard to complete and DOM to be ready
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            const userRole = userData.role;

            if (userRole === 'Admin' || userRole === 'Super Admin') {
                await loadAdminDashboard(user.uid);
            } else if (userRole === 'Client User') {
                await loadStudentDashboard(user.uid);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Show error message in UI
            const activityList = document.getElementById('recentActivityList');
            if (activityList) {
                activityList.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-content">
                            <p class="activity-text" style="color: var(--color-error);">Error loading dashboard data. Please refresh the page.</p>
                        </div>
                    </div>
                `;
            }
        }
    }, 1000); // Increased delay to ensure auth guard completes
});

// Load Admin Dashboard Data
async function loadAdminDashboard(userId) {
    try {
        // Get user role to determine what to load
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        const userRole = userData.role;

        // Only load Events, Attendance, and Reports data for Admin (not Super Admin)
        if (userRole === 'Admin') {
            // Get total events count
            const eventsSnapshot = await db.collection('events').get();
            const totalEvents = eventsSnapshot.size;
            const totalEventsEl = document.getElementById('totalEvents');
            if (totalEventsEl) totalEventsEl.textContent = totalEvents;

            // Get upcoming events (events with dateTime >= today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);
            
            try {
                const upcomingEventsSnapshot = await db.collection('events')
                    .where('dateTime', '>=', todayTimestamp)
                    .orderBy('dateTime', 'asc')
                    .get();
                
                const upcomingEvents = upcomingEventsSnapshot.size;
                const upcomingEventsEl = document.getElementById('upcomingEvents');
                if (upcomingEventsEl) upcomingEventsEl.textContent = upcomingEvents;
            } catch (error) {
                // If index doesn't exist, count manually
                let upcomingCount = 0;
                eventsSnapshot.forEach(doc => {
                    const event = doc.data();
                    if (event.dateTime && event.dateTime.toDate() >= today) {
                        upcomingCount++;
                    }
                });
                const upcomingEventsEl = document.getElementById('upcomingEvents');
                if (upcomingEventsEl) upcomingEventsEl.textContent = upcomingCount;
            }

            // Get total attendance logs count
            const attendanceLogsSnapshot = await db.collection('attendanceLogs').get();
            const totalAttendanceLogs = attendanceLogsSnapshot.size;
            const totalAttendanceLogsEl = document.getElementById('totalAttendanceLogs');
            if (totalAttendanceLogsEl) totalAttendanceLogsEl.textContent = totalAttendanceLogs;
        } else if (userRole === 'Super Admin') {
            // Hide Events and Attendance widgets for Super Admin
            const eventsWidget = document.getElementById('eventsWidget');
            const upcomingEventsWidget = document.getElementById('upcomingEventsWidget');
            const attendanceWidget = document.getElementById('attendanceWidget');
            
            if (eventsWidget) eventsWidget.style.display = 'none';
            if (upcomingEventsWidget) upcomingEventsWidget.style.display = 'none';
            if (attendanceWidget) attendanceWidget.style.display = 'none';
        }

        // Get unread notifications count for current user (both Admin and Super Admin)
        const notificationsSnapshot = await db.collection('notifications').get();
        let unreadCount = 0;
        notificationsSnapshot.forEach(doc => {
            const notification = doc.data();
            const readStatus = notification.readStatus || {};
            if (notification.targetUserIds && notification.targetUserIds.includes(userId)) {
                if (!readStatus[userId]) {
                    unreadCount++;
                }
            }
        });
        const unreadNotificationsEl = document.getElementById('unreadNotifications');
        if (unreadNotificationsEl) unreadNotificationsEl.textContent = unreadCount;

        // Load recent activities
        await loadRecentActivities(5);

    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        // Set default values on error
        const totalEventsEl = document.getElementById('totalEvents');
        if (totalEventsEl) totalEventsEl.textContent = '0';
        const upcomingEventsEl = document.getElementById('upcomingEvents');
        if (upcomingEventsEl) upcomingEventsEl.textContent = '0';
        const totalAttendanceLogsEl = document.getElementById('totalAttendanceLogs');
        if (totalAttendanceLogsEl) totalAttendanceLogsEl.textContent = '0';
        const unreadNotificationsEl = document.getElementById('unreadNotifications');
        if (unreadNotificationsEl) unreadNotificationsEl.textContent = '0';
    }
}

// Load Student Dashboard Data
async function loadStudentDashboard(userId) {
    try {
        // Get user's attendance logs
        const attendanceLogsSnapshot = await db.collection('attendanceLogs')
            .where('userId', '==', userId)
            .get();

        const totalLogs = attendanceLogsSnapshot.size;
        let presentCount = 0;
        attendanceLogsSnapshot.forEach(doc => {
            const log = doc.data();
            if (log.status === 'present') {
                presentCount++;
            }
        });

        // Calculate attendance rate
        const attendanceRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0;
        const attendanceRateEl = document.getElementById('attendanceRate');
        if (attendanceRateEl) attendanceRateEl.textContent = `${attendanceRate}%`;

        // Get events attended count
        const eventsAttended = new Set();
        attendanceLogsSnapshot.forEach(doc => {
            const log = doc.data();
            if (log.eventId && log.status === 'present') {
                eventsAttended.add(log.eventId);
            }
        });
        const eventsAttendedEl = document.getElementById('eventsAttended');
        if (eventsAttendedEl) eventsAttendedEl.textContent = eventsAttended.size;

        // Get upcoming events count - Always use manual filtering to avoid index issues
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const eventsSnapshot = await db.collection('events').get();
        let upcomingCount = 0;
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            if (event.dateTime) {
                const eventDate = event.dateTime.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
                if (eventDate >= today) {
                    upcomingCount++;
                }
            }
        });
        const upcomingEventsEl = document.getElementById('upcomingEvents');
        if (upcomingEventsEl) upcomingEventsEl.textContent = upcomingCount;

        // Get unread notifications count
        // Use where clause to work with security rules
        let unreadCount = 0;
        let totalNotifications = 0;
        
        try {
            const notificationsSnapshot = await db.collection('notifications')
                .where('targetUserIds', 'array-contains', userId)
                .get();
            
            notificationsSnapshot.forEach(doc => {
                const notification = doc.data();
                totalNotifications++;
                const readStatus = notification.readStatus || {};
                if (!readStatus[userId]) {
                    unreadCount++;
                }
            });
        } catch (error) {
            // If query fails (e.g., index missing), try without where clause
            // But this will fail with permissions, so we'll just set to 0
            console.warn('Could not load notifications count:', error);
            unreadCount = 0;
            totalNotifications = 0;
        }
        
        const notificationsEl = document.getElementById('notifications');
        if (notificationsEl) notificationsEl.textContent = unreadCount;

        // Load upcoming events list
        await loadUpcomingEventsList(userId, 5);

    } catch (error) {
        console.error('Error loading student dashboard:', error);
        console.error('Error details:', error.message, error.stack);
        // Set default values on error
        const attendanceRateEl = document.getElementById('attendanceRate');
        if (attendanceRateEl) attendanceRateEl.textContent = '0%';
        const eventsAttendedEl = document.getElementById('eventsAttended');
        if (eventsAttendedEl) eventsAttendedEl.textContent = '0';
        const upcomingEventsEl = document.getElementById('upcomingEvents');
        if (upcomingEventsEl) upcomingEventsEl.textContent = '0';
        const notificationsEl = document.getElementById('notifications');
        if (notificationsEl) notificationsEl.textContent = '0';
    }
}

// Load Recent Activities
async function loadRecentActivities(limit = 5, userId = null) {
    try {
        let activitiesQuery = db.collection('auditTrail')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        // If userId provided, filter by user
        if (userId) {
            activitiesQuery = activitiesQuery.where('userId', '==', userId);
        }

        const activitiesSnapshot = await activitiesQuery.get();
        const activityList = document.getElementById('recentActivityList');

        if (activitiesSnapshot.empty) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <p class="activity-text">No recent activities</p>
                    </div>
                </div>
            `;
            return;
        }

        activityList.innerHTML = '';

        activitiesSnapshot.forEach(doc => {
            const activity = doc.data();
            const activityItem = createActivityItem(activity);
            activityList.appendChild(activityItem);
        });

    } catch (error) {
        console.error('Error loading recent activities:', error);
        document.getElementById('recentActivityList').innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <p class="activity-text">Error loading activities</p>
                </div>
            </div>
        `;
    }
}

// Create Activity Item Element
function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';

    // Determine icon class based on action
    let iconClass = 'activity-login';
    if (activity.action === 'create') {
        iconClass = 'activity-create';
    } else if (activity.action === 'update') {
        iconClass = 'activity-update';
    } else if (activity.action === 'delete') {
        iconClass = 'activity-delete';
    }

    // Format timestamp
    let timeText = 'Just now';
    if (activity.timestamp) {
        const timestamp = activity.timestamp.toDate();
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            timeText = 'Just now';
        } else if (diffMins < 60) {
            timeText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            timeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            timeText = timestamp.toLocaleDateString();
        }
    }

    item.innerHTML = `
        <div class="activity-icon ${iconClass}"></div>
        <div class="activity-content">
            <p class="activity-text">${activity.details || activity.action}</p>
            <span class="activity-time">${timeText}</span>
        </div>
    `;

    return item;
}

// Dashboard events state
let dashboardEvents = [];
let dashboardEventsFilter = 'upcoming';

// Load Events List for Students Dashboard
async function loadUpcomingEventsList(userId, limit = 5) {
    try {
        // Always use manual filtering to avoid index issues
        const allEventsSnapshot = await db.collection('events').get();
        dashboardEvents = [];
        
        const now = new Date();
        
        allEventsSnapshot.forEach(doc => {
            const event = doc.data();
            if (event.dateTime) {
                const eventDate = event.dateTime.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
                const eventEndTime = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour duration
                
                let status = 'upcoming';
                if (eventDate > now) {
                    status = 'upcoming';
                } else if (eventDate <= now && eventEndTime >= now) {
                    status = 'ongoing';
                } else {
                    status = 'done';
                }
                
                dashboardEvents.push({ 
                    id: doc.id, 
                    ...event, 
                    dateTime: event.dateTime,
                    status: status
                });
            }
        });
        
        // Sort by date (upcoming first, then by date)
        dashboardEvents.sort((a, b) => {
            const dateA = a.dateTime.toDate ? a.dateTime.toDate() : new Date(a.dateTime);
            const dateB = b.dateTime.toDate ? b.dateTime.toDate() : new Date(b.dateTime);
            
            // Upcoming events first, then by date
            if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
            if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
            
            return dateA - dateB;
        });

        // Setup filter listeners if not already set up
        setupDashboardEventFilters();
        
        // Apply current filter
        applyDashboardEventFilter(limit);

    } catch (error) {
        console.error('Error loading events:', error);
        console.error('Error details:', error.message, error.stack);
        const eventsList = document.getElementById('upcomingEventsList');
        if (eventsList) {
            eventsList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <p class="activity-text">Error loading events</p>
                    </div>
                </div>
            `;
        }
    }
}

// Setup Dashboard Event Filter Listeners
function setupDashboardEventFilters() {
    // Remove existing listeners to avoid duplicates
    const filterTabs = document.querySelectorAll('.content-card .filter-tab');
    filterTabs.forEach(tab => {
        // Clone to remove old listeners
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        // Add new listener
        newTab.addEventListener('click', function() {
            document.querySelectorAll('.content-card .filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            dashboardEventsFilter = this.dataset.filter;
            applyDashboardEventFilter(5);
        });
    });
}

// Apply Dashboard Event Filter
function applyDashboardEventFilter(limit = 5) {
    const eventsList = document.getElementById('upcomingEventsList');
    if (!eventsList) return;

    // Filter events by status
    let filteredEvents = dashboardEvents.filter(event => {
        if (dashboardEventsFilter === 'upcoming') {
            return event.status === 'upcoming';
        } else if (dashboardEventsFilter === 'ongoing') {
            return event.status === 'ongoing';
        } else if (dashboardEventsFilter === 'done') {
            return event.status === 'done';
        }
        return true;
    });

    // Sort filtered events
    filteredEvents.sort((a, b) => {
        const dateA = a.dateTime.toDate ? a.dateTime.toDate() : new Date(a.dateTime);
        const dateB = b.dateTime.toDate ? b.dateTime.toDate() : new Date(b.dateTime);
        return dateA - dateB;
    });

    if (filteredEvents.length === 0) {
        let emptyMessage = 'No events found';
        if (dashboardEventsFilter === 'upcoming') {
            emptyMessage = 'No upcoming events';
        } else if (dashboardEventsFilter === 'ongoing') {
            emptyMessage = 'No ongoing events';
        } else if (dashboardEventsFilter === 'done') {
            emptyMessage = 'No completed events';
        }
        eventsList.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <p class="activity-text">${emptyMessage}</p>
                </div>
            </div>
        `;
        return;
    }

    eventsList.innerHTML = '';

    // Show only the first 'limit' events
    filteredEvents.slice(0, limit).forEach(event => {
        const eventItem = createEventItem(event, event.id);
        eventsList.appendChild(eventItem);
    });
}

// Create Event Item Element
function createEventItem(event, eventId) {
    const item = document.createElement('div');
    item.className = 'activity-item';

    // Format date
    let dateText = 'Date TBD';
    if (event.dateTime) {
        try {
            const eventDate = event.dateTime.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
            if (eventDate instanceof Date && !isNaN(eventDate.getTime())) {
                dateText = eventDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            console.error('Error formatting event date:', error);
        }
    }

    item.innerHTML = `
        <div class="activity-icon activity-create"></div>
        <div class="activity-content">
            <p class="activity-text"><strong>${event.eventName || 'Untitled Event'}</strong> - ${event.location || 'Location TBD'}</p>
            <span class="activity-time">${dateText}</span>
        </div>
    `;

    return item;
}

// QR Code Scanner (for students)
document.addEventListener('DOMContentLoaded', function() {
    const scanQRBtn = document.getElementById('scanQRBtn');
    
    if (scanQRBtn) {
        scanQRBtn.addEventListener('click', function() {
            // Redirect to attendance page for QR scanning
            window.location.href = 'attendance.html';
        });
    }
});

