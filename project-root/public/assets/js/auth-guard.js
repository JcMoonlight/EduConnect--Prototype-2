// Authentication Guard - Protects pages that require login
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            // User is not logged in, redirect to appropriate login
            const currentPath = window.location.pathname;
            
            if (currentPath.includes('/admin/')) {
                window.location.href = 'login.html';
            } else if (currentPath.includes('/customer/')) {
                window.location.href = 'login.html';
            } else {
                window.location.href = '../admin/login.html';
            }
            return;
        }

        // User is logged in, verify role and access
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // User document doesn't exist, sign out
                await auth.signOut();
                window.location.href = '../admin/login.html';
                return;
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Client User';
            const currentPath = window.location.pathname;

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: userRole,
                username: userData.username || user.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || ''
            }));

            // Check role-based access
            if (currentPath.includes('/admin/')) {
                // Admin pages - only Admin and Super Admin can access
                if (userRole !== 'Admin' && userRole !== 'Super Admin') {
                    await auth.signOut();
                    alert('Access denied. This area is for administrators only.');
                    window.location.href = '../customer/login.html';
                    return;
                }

                // Check for Super Admin only pages
                if (currentPath.includes('audit-trail.html') && userRole !== 'Super Admin') {
                    alert('Access denied. Audit Trail is only accessible to Super Administrators.');
                    window.location.href = 'dashboard.html';
                    return;
                }
            } else if (currentPath.includes('/customer/')) {
                // Customer pages - only Client User can access
                if (userRole !== 'Client User') {
                    await auth.signOut();
                    alert('Access denied. This area is for students only.');
                    window.location.href = '../admin/login.html';
                    return;
                }
            }

            // Update UI with user info
            updateUserInfo(userData, userRole);

        } catch (error) {
            console.error('Error checking user access:', error);
            await auth.signOut();
            window.location.href = '../admin/login.html';
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

        // Show/hide Super Admin only elements
        if (userRole === 'Super Admin') {
            const superAdminElements = document.querySelectorAll('#auditTrailLink, #viewAllLink, #auditActionBtn');
            superAdminElements.forEach(el => {
                if (el) {
                    el.style.display = 'block';
                }
            });
        } else {
            // Hide Super Admin elements for regular admins
            const superAdminElements = document.querySelectorAll('#auditTrailLink, #viewAllLink, #auditActionBtn');
            superAdminElements.forEach(el => {
                if (el) {
                    el.style.display = 'none';
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

