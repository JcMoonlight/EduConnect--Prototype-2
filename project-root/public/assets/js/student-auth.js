// Student/Customer Authentication Script
document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exitBtn = document.getElementById('exitBtn');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const loginError = document.getElementById('loginError');
    const passwordToggle = document.getElementById('passwordToggle');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    
    // Check if user is already logged in and show notice
    checkCurrentUser();
    
    // Switch Account button handler
    const switchAccountBtn = document.getElementById('switchAccountBtn');
    if (switchAccountBtn) {
        switchAccountBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to switch accounts? This will sign you out of the current session.')) {
                try {
                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    // Reload page to clear the notice
                    window.location.reload();
                } catch (error) {
                    console.error('Error signing out:', error);
                    alert('Error signing out. Please try again.');
                }
            }
        });
    }
    
    // Function to check and display current user
    async function checkCurrentUser() {
        const user = auth.currentUser;
        const currentUserNotice = document.getElementById('currentUserNotice');
        const currentUserEmail = document.getElementById('currentUserEmail');
        
        if (user && currentUserNotice && currentUserEmail) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const displayEmail = userData.email || user.email || 'Current User';
                    currentUserEmail.textContent = displayEmail;
                    currentUserNotice.style.display = 'block';
                }
            } catch (error) {
                console.error('Error checking current user:', error);
            }
        }
    }

    // Set max lengths
    emailInput.setAttribute('maxlength', '100');
    passwordInput.setAttribute('maxlength', '50');

    // Password toggle functionality
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            if (type === 'text') {
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            } else {
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            }
        });
    }

    // Clear error messages
    function clearErrors() {
        emailError.textContent = '';
        passwordError.textContent = '';
        loginError.textContent = '';
        loginError.style.display = 'none';
        emailInput.classList.remove('error');
        passwordInput.classList.remove('error');
    }

    // Validate input fields
    function validateInputs() {
        let isValid = true;
        clearErrors();

        // Validate email/username
        if (!emailInput.value.trim()) {
            emailError.textContent = 'Student ID/Email is required';
            emailInput.classList.add('error');
            isValid = false;
        }

        // Validate password
        if (!passwordInput.value.trim()) {
            passwordError.textContent = 'Password is required';
            passwordInput.classList.add('error');
            isValid = false;
        }

        return isValid;
    }

    // Login function - Only allows Client User role
    async function handleLogin() {
        clearErrors();

        if (!validateInputs()) {
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        try {
            let userCredential = null;
            const isEmail = email.includes('@');
            
            if (isEmail) {
                userCredential = await auth.signInWithEmailAndPassword(email, password);
            } else {
                // Check Firestore for username
                const usersRef = db.collection('users');
                const userSnapshot = await usersRef.where('username', '==', email).limit(1).get();
                
                if (userSnapshot.empty) {
                    throw new Error('Invalid student ID or password');
                }
                
                const userDoc = userSnapshot.docs[0].data();
                const userEmail = userDoc.email;
                
                userCredential = await auth.signInWithEmailAndPassword(userEmail, password);
            }

            // Get user role from Firestore
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            
            if (!userDoc.exists) {
                throw new Error('User data not found');
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Client User';

            // Validate role - Only Client User can login here
            if (userRole !== 'Client User') {
                await auth.signOut();
                throw new Error('Access denied. This portal is for students only. Please use the appropriate login page.');
            }

            // Log login activity to audit trail
            await logAuditTrail(userCredential.user.uid, 'login', 'Student logged in successfully');

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                role: userRole,
                username: userData.username || email,
                studentId: userData.studentId || email
            }));

            // Redirect to student dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = getErrorMessage(error);
            loginError.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    // Get user-friendly error message
    function getErrorMessage(error) {
        const errorCode = error.code || error.message;
        
        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            return 'Invalid student ID/email or password';
        } else if (errorCode === 'auth/invalid-email') {
            return 'Invalid email format';
        } else if (errorCode === 'auth/user-disabled') {
            return 'This account has been disabled';
        } else if (errorCode === 'auth/too-many-requests') {
            return 'Too many failed attempts. Please try again later';
        } else if (typeof errorCode === 'string' && errorCode.includes('Access denied')) {
            return errorCode;
        } else if (typeof errorCode === 'string' && errorCode.includes('Invalid')) {
            return errorCode;
        } else {
            return 'Login failed. Please check your credentials and try again';
        }
    }

    // Log audit trail
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

    // Event listeners
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    resetBtn.addEventListener('click', function() {
        emailInput.value = '';
        passwordInput.value = '';
        clearErrors();
        emailInput.focus();
    });

    exitBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to exit?')) {
            window.close();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'about:blank';
            }
        }
    });

    // Real-time validation
    emailInput.addEventListener('blur', function() {
        if (!emailInput.value.trim()) {
            emailError.textContent = 'Student ID/Email is required';
            emailInput.classList.add('error');
        } else {
            emailError.textContent = '';
            emailInput.classList.remove('error');
        }
    });

    passwordInput.addEventListener('blur', function() {
        if (!passwordInput.value.trim()) {
            passwordError.textContent = 'Password is required';
            passwordInput.classList.add('error');
        } else {
            passwordError.textContent = '';
            passwordInput.classList.remove('error');
        }
    });

    emailInput.addEventListener('input', function() {
        if (emailInput.value.trim()) {
            emailError.textContent = '';
            emailInput.classList.remove('error');
        }
    });

    passwordInput.addEventListener('input', function() {
        if (passwordInput.value.trim()) {
            passwordError.textContent = '';
            passwordInput.classList.remove('error');
        }
    });
});

