// User Management Script - CRUD Operations
let currentUser = null;
let currentUserRole = null;
let users = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let userToDelete = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth guard
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser = user;
            currentUserRole = userData.role;

            // Check if user has access - Only Super Admin
            if (currentUserRole !== 'Super Admin') {
                alert('Access denied. User Maintenance is only accessible to Super Administrators.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Show Super Admin option if user is Super Admin
            if (currentUserRole === 'Super Admin') {
                document.getElementById('superAdminOption').style.display = 'block';
            }

            // Initialize
            await loadUsers();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing user management:', error);
        }
    }, 1000);
});

// Load all users from Firestore
async function loadUsers() {
    try {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading users...</td></tr>';

        const usersSnapshot = await db.collection('users').get();
        users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData
            });
        });

        // Sort by creation date (newest first)
        users.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
        });

        filteredUsers = [...users];
        displayUsers();
        updatePagination();

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = 
            '<tr><td colspan="6" class="table-error">Error loading users. Please refresh the page.</td></tr>';
    }
}

// Display users in table
function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No users found</td></tr>';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    pageUsers.forEach((user, index) => {
        const row = createUserRow(user, startIndex + index);
        tbody.appendChild(row);
    });
}

// Create user table row
function createUserRow(user, index) {
    const tr = document.createElement('tr');
    tr.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
    const email = user.email || 'N/A';
    const username = user.username || email;
    const role = user.role || 'Client User';
    const status = user.status || 'active';

    // Role badge
    let roleBadgeClass = 'role-badge role-client';
    if (role === 'Super Admin') {
        roleBadgeClass = 'role-badge role-superadmin';
    } else if (role === 'Admin') {
        roleBadgeClass = 'role-badge role-admin';
    }

    // Status badge
    const statusBadgeClass = status === 'active' ? 'status-badge status-active' : 'status-badge status-inactive';

    tr.innerHTML = `
        <td>${fullName}</td>
        <td>${email}</td>
        <td>${username}</td>
        <td><span class="${roleBadgeClass}">${role}</span></td>
        <td><span class="${statusBadgeClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td class="table-actions">
            <button class="btn-action btn-edit" data-user-id="${user.id}" title="Edit User">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn-action btn-delete" data-user-id="${user.id}" title="Delete User">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </td>
    `;

    // Add event listeners
    const editBtn = tr.querySelector('.btn-edit');
    const deleteBtn = tr.querySelector('.btn-delete');

    editBtn.addEventListener('click', () => openEditModal(user));
    deleteBtn.addEventListener('click', () => openDeleteModal(user));

    return tr;
}

// Setup event listeners
function setupEventListeners() {
    // Add User Button
    document.getElementById('addUserBtn').addEventListener('click', openAddModal);

    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);

    // Form submission
    document.getElementById('userForm').addEventListener('submit', handleFormSubmit);

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Search input
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Filters
    document.getElementById('roleFilter').addEventListener('change', handleFilter);
    document.getElementById('statusFilter').addEventListener('change', handleFilter);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(1));

    // Password toggle in modal
    const passwordToggle = document.getElementById('modalPasswordToggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const eyeIcon = document.getElementById('modalEyeIcon');
            const eyeOffIcon = document.getElementById('modalEyeOffIcon');
            
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

    // Role change handler - show/hide student ID field
    document.getElementById('role').addEventListener('change', function() {
        const role = this.value;
        const studentIdGroup = document.getElementById('studentIdGroup');
        const studentIdInput = document.getElementById('studentId');
        
        if (role === 'Client User') {
            studentIdGroup.style.display = 'block';
            studentIdInput.setAttribute('required', 'required');
        } else {
            studentIdGroup.style.display = 'none';
            studentIdInput.removeAttribute('required');
            studentIdInput.value = '';
        }
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            if (this.closest('#userModal')) closeModal();
            if (this.closest('#deleteModal')) closeDeleteModal();
        });
    });
}

// Open Add User Modal
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('isEditMode').value = 'false';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').setAttribute('required', 'required');
    document.getElementById('studentIdGroup').style.display = 'none';
    clearFormErrors();
    document.getElementById('userModal').style.display = 'flex';
}

// Open Edit User Modal
function openEditModal(user) {
    // Check permissions
    if (currentUserRole === 'Admin' && user.role === 'Super Admin') {
        alert('Access denied. Admins cannot edit Super Admin accounts.');
        return;
    }

    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('isEditMode').value = 'true';
    document.getElementById('userId').value = user.id;
    
    // Populate form
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('role').value = user.role || 'Client User';
    document.getElementById('status').value = user.status || 'active';
    document.getElementById('studentId').value = user.studentId || '';

    // Hide password field in edit mode
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('password').removeAttribute('required');
    document.getElementById('password').value = '';

    // Show student ID if Client User
    if (user.role === 'Client User') {
        document.getElementById('studentIdGroup').style.display = 'block';
    } else {
        document.getElementById('studentIdGroup').style.display = 'none';
    }

    clearFormErrors();
    document.getElementById('userModal').style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    clearFormErrors();
}

// Open Delete Modal
function openDeleteModal(user) {
    // Check permissions
    if (currentUserRole === 'Admin' && user.role === 'Super Admin') {
        alert('Access denied. Admins cannot delete Super Admin accounts.');
        return;
    }

    // Prevent deleting own account
    if (user.id === currentUser.uid) {
        alert('You cannot delete your own account.');
        return;
    }

    userToDelete = user;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    userToDelete = null;
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const isEditMode = document.getElementById('isEditMode').value === 'true';
    const userId = document.getElementById('userId').value;

    // Get form values
    const userData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        username: document.getElementById('username').value.trim() || document.getElementById('email').value.trim(),
        role: document.getElementById('role').value,
        status: document.getElementById('status').value,
        studentId: document.getElementById('studentId').value.trim() || null
    };

    // Validation
    if (!validateForm(userData, isEditMode)) {
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        if (isEditMode) {
            await updateUser(userId, userData);
        } else {
            await createUser(userData);
        }

        closeModal();
        await loadUsers();
        
        // Show success message
        showNotification(isEditMode ? 'User updated successfully!' : 'User created successfully!', 'success');

    } catch (error) {
        console.error('Error saving user:', error);
        showNotification(getErrorMessage(error), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save User';
    }
}

// Validate Form
function validateForm(userData, isEditMode) {
    let isValid = true;

    if (!userData.firstName) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    }

    if (!userData.lastName) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    }

    if (!userData.email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(userData.email)) {
        showFieldError('email', 'Invalid email format');
        isValid = false;
    }

    if (!userData.role) {
        showFieldError('role', 'Role is required');
        isValid = false;
    }

    if (!isEditMode) {
        const password = document.getElementById('password').value;
        if (!password) {
            showFieldError('password', 'Password is required for new users');
            isValid = false;
        } else if (password.length < 6) {
            showFieldError('password', 'Password must be at least 6 characters');
            isValid = false;
        }
    }

    if (userData.role === 'Client User') {
        const studentId = document.getElementById('studentId').value.trim();
        if (!studentId) {
            showFieldError('studentId', 'Student ID is required for Client User role');
            isValid = false;
        } else {
            userData.studentId = studentId;
        }
    }

    return isValid;
}

// Create User
async function createUser(userData) {
    const password = document.getElementById('password').value;

    // Create user in Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(userData.email, password);
    const firebaseUser = userCredential.user;

    // Create user document in Firestore
    const userDoc = {
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        status: userData.status,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (userData.studentId) {
        userDoc.studentId = userData.studentId;
    }

    await db.collection('users').doc(firebaseUser.uid).set(userDoc);

    // Log to audit trail
    await logAuditTrail(currentUser.uid, 'create', `Created user: ${userData.email} with role: ${userData.role}`);
}

// Update User
async function updateUser(userId, userData) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new Error('User not found');
    }

    const existingUser = userDoc.data();

    // Update Firestore document
    const updateData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        role: userData.role,
        status: userData.status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (userData.studentId) {
        updateData.studentId = userData.studentId;
    } else if (userData.role !== 'Client User') {
        updateData.studentId = firebase.firestore.FieldValue.delete();
    }

    await userRef.update(updateData);

    // Update password if provided
    const password = document.getElementById('password').value;
    if (password) {
        // Note: This requires the user to be re-authenticated or use Admin SDK
        // For now, we'll just update the Firestore data
        // Password updates should be handled separately or via email reset
    }

    // Log to audit trail
    await logAuditTrail(currentUser.uid, 'update', `Updated user: ${existingUser.email}`);
}

// Confirm Delete
async function confirmDelete() {
    if (!userToDelete) return;

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    try {
        // Delete user document from Firestore
        await db.collection('users').doc(userToDelete.id).delete();

        // Note: Deleting from Firebase Auth requires Admin SDK
        // For now, we'll just delete from Firestore
        // The user won't be able to login if their document doesn't exist

        // Log to audit trail
        await logAuditTrail(currentUser.uid, 'delete', `Deleted user: ${userToDelete.email}`);

        closeDeleteModal();
        await loadUsers();
        
        showNotification('User deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete User';
    }
}

// Search and Filter
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(searchTerm);
}

function handleFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(searchTerm);
}

function applyFilters(searchTerm) {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredUsers = users.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const username = (user.username || user.email || '').toLowerCase();
        const role = user.role || '';
        const status = user.status || 'active';

        const matchesSearch = !searchTerm || 
            fullName.includes(searchTerm) || 
            email.includes(searchTerm) || 
            username.includes(searchTerm) ||
            role.toLowerCase().includes(searchTerm);

        const matchesRole = !roleFilter || role === roleFilter;
        const matchesStatus = !statusFilter || status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    currentPage = 1;
    displayUsers();
    updatePagination();
}

// Pagination
function changePage(direction) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayUsers();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const paginationInfo = document.getElementById('paginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

// Utility Functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    if (errorElement) errorElement.textContent = message;
    if (inputElement) inputElement.classList.add('error');
}

function clearFormErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('error'));
}

function getErrorMessage(error) {
    if (error.code === 'auth/email-already-in-use') {
        return 'This email is already registered. Please use a different email.';
    } else if (error.code === 'auth/invalid-email') {
        return 'Invalid email format.';
    } else if (error.code === 'auth/weak-password') {
        return 'Password is too weak. Please use a stronger password.';
    } else if (error.message) {
        return error.message;
    } else {
        return 'An error occurred. Please try again.';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

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

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}
