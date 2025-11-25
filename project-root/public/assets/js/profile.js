// Profile Management Script for Administrators
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
    document.getElementById('profileRole').textContent = userData.role || 'N/A';
    document.getElementById('profileEmail').textContent = userData.email || 'N/A';

    // Profile Details
    document.getElementById('displayFirstName').textContent = userData.firstName || 'N/A';
    document.getElementById('displayLastName').textContent = userData.lastName || 'N/A';
    document.getElementById('displayEmail').textContent = userData.email || 'N/A';
    document.getElementById('displayUsername').textContent = userData.username || userData.email || 'N/A';
    document.getElementById('displayRole').textContent = userData.role || 'N/A';
    document.getElementById('displayStatus').textContent = userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : 'N/A';

    // Populate Edit Form
    document.getElementById('editFirstName').value = userData.firstName || '';
    document.getElementById('editLastName').value = userData.lastName || '';
    document.getElementById('editEmail').value = userData.email || '';
    document.getElementById('editUsername').value = userData.username || '';
    document.getElementById('editRole').value = userData.role || '';
    document.getElementById('editStatus').value = userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : '';
}

// Setup Event Listeners
function setupEventListeners() {
    // Edit Profile Button
    document.getElementById('editProfileBtn').addEventListener('click', toggleEditMode);

    // Cancel Edit Button
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    // Profile Form Submit
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);

    // Password Form Submit
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // Clear Password Button
    document.getElementById('clearPasswordBtn').addEventListener('click', clearPasswordForm);

    // Password Toggles
    setupPasswordToggles();
}

// Toggle Edit Mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        document.getElementById('profileDetails').style.display = 'none';
        document.getElementById('profileForm').style.display = 'block';
        document.getElementById('editProfileBtn').textContent = 'Cancel';
        document.getElementById('editProfileBtn').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel
        `;
    } else {
        cancelEdit();
    }
}

// Cancel Edit
function cancelEdit() {
    isEditMode = false;
    document.getElementById('profileDetails').style.display = 'block';
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('editProfileBtn').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit Profile
    `;
    
    // Reset form to original values
    if (currentUserData) {
        displayProfile(currentUserData);
    }
    clearFormErrors('profileForm');
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    clearFormErrors('profileForm');

    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const username = document.getElementById('editUsername').value.trim();

    // Validation
    if (!firstName) {
        showFieldError('editFirstName', 'First name is required');
        return;
    }

    if (!lastName) {
        showFieldError('editLastName', 'Last name is required');
        return;
    }

    const submitBtn = document.getElementById('saveProfileBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        // Update Firestore
        const updateData = {
            firstName: firstName,
            lastName: lastName,
            username: username || currentUserData.email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(currentUser.uid).update(updateData);

        // Log to audit trail
        await logAuditTrail(currentUser.uid, 'update', 'Updated own profile information');

        // Reload profile
        await loadProfile();
        
        // Exit edit mode
        cancelEdit();

        showNotification('Profile updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
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
        showFieldError('newPassword', 'Password must be at least 6 characters');
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

    const submitBtn = document.getElementById('savePasswordBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Changing...';

    try {
        // Re-authenticate user
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
        clearPasswordForm();

        showNotification('Password changed successfully!', 'success');

    } catch (error) {
        console.error('Error changing password:', error);
        const errorMessage = getPasswordErrorMessage(error);
        document.getElementById('passwordFormError').textContent = errorMessage;
        document.getElementById('passwordFormError').style.display = 'block';
        showNotification(errorMessage, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password';
    }
}

// Get Password Error Message
function getPasswordErrorMessage(error) {
    const errorCode = error.code || error.message;
    
    if (errorCode === 'auth/wrong-password') {
        return 'Current password is incorrect';
    } else if (errorCode === 'auth/weak-password') {
        return 'Password is too weak. Please choose a stronger password';
    } else if (errorCode === 'auth/requires-recent-login') {
        return 'Please logout and login again before changing password';
    } else {
        return 'Error changing password. Please try again';
    }
}

// Clear Password Form
function clearPasswordForm() {
    document.getElementById('passwordForm').reset();
    clearFormErrors('passwordForm');
    document.getElementById('passwordFormError').textContent = '';
    document.getElementById('passwordFormError').style.display = 'none';
}

// Setup Password Toggles
function setupPasswordToggles() {
    const toggles = [
        { toggle: 'currentPasswordToggle', input: 'currentPassword', eye: 'currentEyeIcon', eyeOff: 'currentEyeOffIcon' },
        { toggle: 'newPasswordToggle', input: 'newPassword', eye: 'newEyeIcon', eyeOff: 'newEyeOffIcon' },
        { toggle: 'confirmPasswordToggle', input: 'confirmPassword', eye: 'confirmEyeIcon', eyeOff: 'confirmEyeOffIcon' }
    ];

    toggles.forEach(({ toggle, input, eye, eyeOff }) => {
        const toggleBtn = document.getElementById(toggle);
        const inputField = document.getElementById(input);
        const eyeIcon = document.getElementById(eye);
        const eyeOffIcon = document.getElementById(eyeOff);

        if (toggleBtn && inputField) {
            toggleBtn.addEventListener('click', function() {
                const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                inputField.setAttribute('type', type);
                
                if (type === 'text') {
                    if (eyeIcon) eyeIcon.style.display = 'none';
                    if (eyeOffIcon) eyeOffIcon.style.display = 'block';
                } else {
                    if (eyeIcon) eyeIcon.style.display = 'block';
                    if (eyeOffIcon) eyeOffIcon.style.display = 'none';
                }
            });
        }
    });
}

// Clear Form Errors
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
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

