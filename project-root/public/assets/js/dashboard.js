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
        // Get total users count
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        document.getElementById('totalUsers').textContent = totalUsers;

        // Get active users (users with status 'active' or no status field)
        let activeUsers = 0;
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.status || data.status === 'active') {
                activeUsers++;
            }
        });
        document.getElementById('activeUsers').textContent = activeUsers;

        // Get today's activities
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);

        const activitiesSnapshot = await db.collection('auditTrail')
            .where('timestamp', '>=', todayTimestamp)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const todayActivities = activitiesSnapshot.size;
        document.getElementById('todayActivities').textContent = todayActivities;

        // Load recent activities
        await loadRecentActivities(5);

    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

// Load Student Dashboard Data
async function loadStudentDashboard(userId) {
    try {
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Placeholder data - replace with actual attendance/event data when implemented
        document.getElementById('attendanceRate').textContent = '95%';
        document.getElementById('eventsAttended').textContent = '12';
        document.getElementById('upcomingEvents').textContent = '3';
        document.getElementById('notifications').textContent = '2';

        // Load recent activities
        await loadRecentActivities(5, userId);

    } catch (error) {
        console.error('Error loading student dashboard:', error);
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

// QR Code Scanner (for students)
document.addEventListener('DOMContentLoaded', function() {
    const scanQRBtn = document.getElementById('scanQRBtn');
    
    if (scanQRBtn) {
        scanQRBtn.addEventListener('click', function() {
            alert('QR Code scanner feature will be implemented in the attendance module.');
        });
    }
});

