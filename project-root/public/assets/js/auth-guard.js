// Authentication Guard - For Admin Pages Only
// This guard is ONLY used on admin pages and blocks Client Users completely

let isCheckingAuth = false;
let lastAuthCheck = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    auth.onAuthStateChanged(async function(user) {
        // Prevent multiple simultaneous checks
        if (isCheckingAuth) {
            return;
        }

        const currentPath = window.location.pathname;
        
        // This guard only runs on admin pages
        if (!currentPath.includes('/admin/')) {
            return; // Let client-auth-guard.js handle customer pages
        }

        if (!user) {
            // User is not logged in, redirect to admin login
            window.location.href = 'login.html';
            return;
        }

        // Prevent duplicate checks for the same user
        const currentCheck = user.uid + currentPath;
        if (lastAuthCheck === currentCheck) {
            return;
        }

        isCheckingAuth = true;
        lastAuthCheck = currentCheck;

        // User is logged in, verify role and access
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // User document doesn't exist, sign out
                isCheckingAuth = false;
                await auth.signOut();
                sessionStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Client User';

            // CRITICAL SECURITY: Block Client Users from ALL admin pages
            if (userRole === 'Client User') {
                isCheckingAuth = false;
                await auth.signOut();
                sessionStorage.removeItem('user');
                alert('Access denied. This area is restricted to administrators only. Client users can only access the student portal.');
                window.location.href = '../customer/login.html';
                return;
            }

            // Admin pages - only Admin and Super Admin can access
            if (userRole !== 'Admin' && userRole !== 'Super Admin') {
                isCheckingAuth = false;
                await auth.signOut();
                sessionStorage.removeItem('user');
                alert('Access denied. This area is for administrators only.');
                window.location.href = 'login.html';
                return;
            }

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: userRole,
                username: userData.username || user.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || ''
            }));

            // Check for Super Admin only pages
            if (currentPath.includes('audit-trail.html') && userRole !== 'Super Admin') {
                isCheckingAuth = false;
                alert('Access denied. Audit Trail is only accessible to Super Administrators.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Check for User Maintenance - only Super Admin can access
            if (currentPath.includes('user-maintenance.html') && userRole !== 'Super Admin') {
                isCheckingAuth = false;
                alert('Access denied. User Maintenance is only accessible to Super Administrators.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Check for Events, Attendance, and Reports - only Admin can access (not Super Admin)
            if (userRole === 'Super Admin') {
                if (currentPath.includes('events.html') || 
                    currentPath.includes('attendance.html') || 
                    currentPath.includes('reports.html')) {
                    isCheckingAuth = false;
                    alert('Access denied. Events, Attendance, and Reports are only accessible to Administrators.');
                    window.location.href = 'dashboard.html';
                    return;
                }
            }

            // Update UI with user info
            updateUserInfo(userData, userRole);
            isCheckingAuth = false;

        } catch (error) {
            console.error('Error checking user access:', error);
            
            // Only sign out on critical errors, not network errors
            const errorCode = error.code || error.message || '';
            const isNetworkError = errorCode.includes('network') || 
                                  errorCode.includes('unavailable') ||
                                  errorCode.includes('failed-precondition') ||
                                  errorCode === 'unavailable';
            
            if (isNetworkError) {
                // Network error - don't sign out, just log and retry
                console.warn('Network error during auth check, will retry on next auth state change');
                isCheckingAuth = false;
                return;
            }
            
            // Critical error - sign out
            isCheckingAuth = false;
            await auth.signOut();
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
});

// Update user information in the UI
function updateUserInfo(userData, userRole) {
    // Wait for DOM to be ready
    setTimeout(function() {
        const userNameElements = document.querySelectorAll('#userName, #welcomeName');
        const displayName = userData.firstName 
            ? `${userData.firstName} ${userData.lastName || ''}`.trim()
            : userData.username || userData.email || 'User';

        userNameElements.forEach(el => {
            if (el) el.textContent = displayName;
        });

        // Show/hide elements based on role
        if (userRole === 'Super Admin') {
            // Show Super Admin only elements
            const superAdminElements = document.querySelectorAll('#auditTrailLink, #viewAllLink, #auditActionBtn, #userMaintenanceLink, #addUserActionBtn, #manageUsersActionBtn');
            superAdminElements.forEach(el => {
                if (el) {
                    el.style.display = 'block';
                }
            });
            
            // Hide Admin-only elements (Events, Attendance, Reports) for Super Admin
            const adminOnlyElements = document.querySelectorAll('#eventsLink, #attendanceLink, #reportsLink, #eventsWidget, #attendanceWidget, #reportsWidget, #createEventAction, #markAttendanceAction, #generateReportAction');
            adminOnlyElements.forEach(el => {
                if (el) {
                    el.style.display = 'none';
                }
            });
        } else if (userRole === 'Admin') {
            // Hide Super Admin elements for regular admins
            const superAdminElements = document.querySelectorAll('#auditTrailLink, #viewAllLink, #auditActionBtn, #userMaintenanceLink, #addUserActionBtn, #manageUsersActionBtn');
            superAdminElements.forEach(el => {
                if (el) {
                    el.style.display = 'none';
                }
            });
            
            // Show Admin-only elements
            const adminOnlyElements = document.querySelectorAll('#eventsLink, #attendanceLink, #reportsLink');
            adminOnlyElements.forEach(el => {
                if (el) {
                    el.style.display = 'block';
                }
            });
        }
    }, 100);
}

// Logout functionality
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    // Log logout to audit trail
                    const user = auth.currentUser;
                    if (user) {
                        try {
                            await db.collection('auditTrail').add({
                                userId: user.uid,
                                action: 'logout',
                                details: 'User logged out successfully',
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                ipAddress: await getClientIP()
                            });
                        } catch (error) {
                            console.error('Error logging audit trail:', error);
                        }
                    }

                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    
                    // Redirect to appropriate login page
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/admin/')) {
                        window.location.href = 'login.html';
                    } else {
                        window.location.href = 'login.html';
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Error logging out. Please try again.');
                }
            }
        });
    }
});

// Get client IP
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}

