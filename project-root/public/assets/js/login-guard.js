// Login Page Guard - Prevents already logged-in users from accessing wrong login pages
// This ensures Client Users can't access admin login pages and vice versa

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            return; // No user logged in, allow access to login page
        }

        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                return; // User doc doesn't exist, allow access
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Client User';
            const currentPath = window.location.pathname;

            // Block Client Users from accessing admin login pages
            if (currentPath.includes('/admin/login.html') || currentPath.includes('/admin/superadmin-login.html')) {
                if (userRole === 'Client User') {
                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    alert('Access denied. This login portal is for administrators only. Please use the student login page.');
                    window.location.href = '../customer/login.html';
                    return;
                }
                // If admin/super admin is already logged in, redirect to their dashboard
                if (userRole === 'Admin' || userRole === 'Super Admin') {
                    window.location.href = 'dashboard.html';
                    return;
                }
            }

            // Block Admins from accessing customer login page
            if (currentPath.includes('/customer/login.html')) {
                if (userRole === 'Admin' || userRole === 'Super Admin') {
                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    alert('Access denied. This login portal is for students only. Please use the admin login page.');
                    window.location.href = '../admin/login.html';
                    return;
                }
                // If client user is already logged in, redirect to their dashboard
                if (userRole === 'Client User') {
                    window.location.href = 'dashboard.html';
                    return;
                }
            }

        } catch (error) {
            console.error('Error checking login access:', error);
        }
    });
});

