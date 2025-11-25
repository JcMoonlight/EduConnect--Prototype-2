// Client-Specific Authentication Guard - Only for Customer Pages
// This ensures Client Users can ONLY access customer pages and landing page

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
        
        // Allow access to landing page without authentication
        if (currentPath === '/index.html' || currentPath.endsWith('/index.html') || 
            currentPath === '/' || currentPath.endsWith('/')) {
            return; // Landing page is public
        }

        if (!user) {
            // User is not logged in, redirect to customer login
            if (currentPath.includes('/customer/')) {
                window.location.href = 'login.html';
            } else {
                // If somehow on admin page, redirect to customer login
                window.location.href = '../customer/login.html';
            }
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
                window.location.href = 'login.html';
                return;
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Client User';

            // CRITICAL: Block Client Users from accessing ANY admin pages
            if (currentPath.includes('/admin/')) {
                isCheckingAuth = false;
                await auth.signOut();
                sessionStorage.removeItem('user');
                alert('Access denied. This area is restricted to administrators only.');
                window.location.href = '../customer/login.html';
                return;
            }

            // CRITICAL: Only Client Users can access customer pages
            if (currentPath.includes('/customer/')) {
                if (userRole !== 'Client User') {
                    isCheckingAuth = false;
                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    alert('Access denied. This area is for students only.');
                    window.location.href = '../admin/login.html';
                    return;
                }
            }

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: userRole,
                username: userData.username || user.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                studentId: userData.studentId || ''
            }));

            // Update UI with user info
            updateClientUserInfo(userData, userRole);
            isCheckingAuth = false;

        } catch (error) {
            console.error('Error checking client user access:', error);
            
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

// Update user information in the UI (Client-specific)
function updateClientUserInfo(userData, userRole) {
    // Wait for DOM to be ready
    setTimeout(function() {
        const userNameElements = document.querySelectorAll('#userName, #welcomeName');
        const displayName = userData.firstName 
            ? `${userData.firstName} ${userData.lastName || ''}`.trim()
            : userData.username || userData.email || 'Student';

        userNameElements.forEach(el => {
            if (el) el.textContent = displayName;
        });
    }, 100);
}

// Logout functionality for client users
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
                                details: 'Student logged out successfully',
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                ipAddress: await getClientIP()
                            });
                        } catch (error) {
                            console.error('Error logging audit trail:', error);
                        }
                    }

                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    
                    // Redirect to landing page (index.html)
                    window.location.href = '../../index.html';
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

