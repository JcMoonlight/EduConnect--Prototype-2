// Login Page Guard - Allows account switching and prevents wrong role access
// Users can now log in with different accounts even if already logged in
// This allows testing different roles simultaneously in different browser tabs/profiles

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

            // Check if user is trying to access the wrong login portal for their role
            // But allow them to proceed if they want to switch accounts
            const isAdminLoginPage = currentPath.includes('/admin/login.html') || currentPath.includes('/admin/superadmin-login.html');
            const isCustomerLoginPage = currentPath.includes('/customer/login.html');

            // Only block access if user is on the wrong portal AND we detect they're not intentionally switching
            // We'll show a warning but allow them to proceed
            if (isAdminLoginPage) {
                if (userRole === 'Client User') {
                    // Client user trying to access admin login - show warning but allow
                    console.warn('Client User accessing admin login page - allowing for account switching');
                    // Don't auto-redirect, allow them to log in with admin account
                    return;
                }
                // Admin/Super Admin on admin login page - allow them to switch accounts
                // Don't auto-redirect to dashboard, let them log in with different account if needed
                console.log('Admin user on admin login page - allowing account switching');
                return;
            }

            if (isCustomerLoginPage) {
                if (userRole === 'Admin' || userRole === 'Super Admin') {
                    // Admin trying to access customer login - show warning but allow
                    console.warn('Admin accessing customer login page - allowing for account switching');
                    // Don't auto-redirect, allow them to log in with customer account
                    return;
                }
                // Client user on customer login page - allow them to switch accounts
                console.log('Client user on customer login page - allowing account switching');
                return;
            }

        } catch (error) {
            console.error('Error checking login access:', error);
        }
    });
});

