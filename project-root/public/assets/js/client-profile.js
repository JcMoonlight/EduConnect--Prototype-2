// Client Profile Management Script - For Client Users
let currentUser = null;
let currentUserData = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth guard
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            currentUser = user;
            await loadProfile();
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing profile:', error);
        }
    }, 1000);
});

// Load Profile Data
async function loadProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            alert('User profile not found. Please contact support.');
            window.location.href = 'dashboard.html';
            return;
        }

        currentUserData = userDoc.data();
        
        // Verify user is Client User
        if (currentUserData.role !== 'Client User') {
            alert('Access denied. This page is for students only.');
            window.location.href = 'dashboard.html';
            return;
        }

        displayProfile(currentUserData);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile. Please refresh the page.', 'error');
    }
}

// Display Profile Information
function displayProfile(userData) {
    const displayName = userData.firstName && userData.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData.username || userData.email || 'User';

    // Profile Header
    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileRole').textContent = userData.role || 'Student';
    document.getElementById('profileEmail').textContent = userData.email || 'N/A';

    // Profile Details (View Mode)
    document.getElementById('displayFirstName').textContent = userData.firstName || 'N/A';
    document.getElementById('displayLastName').textContent = userData.lastName || 'N/A';
    document.getElementById('displayEmail').textContent = userData.email || 'N/A';
    document.getElementById('displayUsername').textContent = userData.username || 'N/A';
    document.getElementById('displayStudentId').textContent = userData.studentId || 'N/A';
    
    const status = userData.status || 'active';
    document.getElementById('displayStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);

    // Populate form fields (for edit mode)
    document.getElementById('firstName').value = userData.firstName || '';
    document.getElementById('lastName').value = userData.lastName || '';
    document.getElementById('email').value = userData.email || '';
    document.getElementById('username').value = userData.username || '';
    document.getElementById('studentId').value = userData.studentId || '';
}

// Setup Event Listeners
function setupEventListeners() {
    // Edit Profile Button
    document.getElementById('editProfileBtn').addEventListener('click', toggleEditMode);

    // Cancel Button
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

    // Profile Form Submit
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);

    // Password Form Submit
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // Password Toggle Buttons
    document.getElementById('toggleCurrentPassword').addEventListener('click', function() {
        togglePasswordVisibility('currentPassword', this);
    });

    document.getElementById('toggleNewPassword').addEventListener('click', function() {
        togglePasswordVisibility('newPassword', this);
    });

    document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
        togglePasswordVisibility('confirmPassword', this);
    });
}

// Toggle Edit Mode
function toggleEditMode() {
    isEditMode = !isEditMode;

    if (isEditMode) {
        // Show form, hide details
        document.getElementById('profileDetails').style.display = 'none';
        document.getElementById('profileForm').style.display = 'block';
        document.getElementById('editProfileBtn').textContent = 'Cancel Edit';
        document.getElementById('editProfileBtn').querySelector('svg').innerHTML = `
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        `;
    } else {
        // Show details, hide form
        document.getElementById('profileDetails').style.display = 'grid';
        document.getElementById('profileForm').style.display = 'none';
        document.getElementById('editProfileBtn').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Profile
        `;
        // Reset form to original values
        displayProfile(currentUserData);
        clearFormErrors('profileForm');
    }
}

// Cancel Edit
function cancelEdit() {
    isEditMode = false;
    document.getElementById('profileDetails').style.display = 'grid';
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('editProfileBtn').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit Profile
    `;
    displayProfile(currentUserData);
    clearFormErrors('profileForm');
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    clearFormErrors('profileForm');

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const studentId = document.getElementById('studentId').value.trim();

    // Validation
    if (!firstName) {
        showFieldError('firstName', 'First name is required');
        return;
    }

    if (!lastName) {
        showFieldError('lastName', 'Last name is required');
        return;
    }

    if (!username) {
        showFieldError('username', 'Username is required');
        return;
    }

    // Check if username is already taken by another user
    try {
        const usernameCheck = await db.collection('users')
            .where('username', '==', username)
            .get();

        let usernameTaken = false;
        usernameCheck.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                usernameTaken = true;
            }
        });

        if (usernameTaken) {
            showFieldError('username', 'Username is already taken');
            return;
        }
    } catch (error) {
        console.error('Error checking username:', error);
    }

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Update user document in Firestore
        await db.collection('users').doc(currentUser.uid).update({
            firstName: firstName,
            lastName: lastName,
            username: username,
            studentId: studentId || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log to audit trail
        await logAuditTrail(currentUser.uid, 'update', 'Updated profile information');

        // Reload profile data
        await loadProfile();
        
        // Exit edit mode
        toggleEditMode();
        
        showNotification('Profile updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile. Please try again.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Handle Password Change
async function handlePasswordChange(e) {
    e.preventDefault();
    clearFormErrors('passwordForm');

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!currentPassword) {
        showFieldError('currentPassword', 'Current password is required');
        return;
    }

    if (!newPassword) {
        showFieldError('newPassword', 'New password is required');
        return;
    }

    if (newPassword.length < 6) {
        showFieldError('newPassword', 'Password must be at least 6 characters long');
        return;
    }

    if (newPassword !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        return;
    }

    if (currentPassword === newPassword) {
        showFieldError('newPassword', 'New password must be different from current password');
        return;
    }

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = 'Changing...';

    try {
        // Re-authenticate user with current password
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );

        await currentUser.reauthenticateWithCredential(credential);

        // Update password
        await currentUser.updatePassword(newPassword);

        // Log to audit trail
        await logAuditTrail(currentUser.uid, 'update', 'Changed password');

        // Clear form
        document.getElementById('passwordForm').reset();
        
        showNotification('Password changed successfully!', 'success');

    } catch (error) {
        console.error('Error changing password:', error);
        
        let errorMessage = 'Error changing password. Please try again.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect';
            showFieldError('currentPassword', errorMessage);
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
            showFieldError('newPassword', errorMessage);
        } else {
            showNotification(errorMessage, 'error');
        }
        
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = 'Change Password';
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    // Update icon
    const svg = button.querySelector('svg');
    if (isPassword) {
        svg.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        svg.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// Clear Form Errors
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });

    const inputElements = form.querySelectorAll('input');
    inputElements.forEach(el => {
        el.classList.remove('error');
    });
}

// Show Field Error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Log Audit Trail
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

// Get Client IP
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}

// Show Notification
function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

