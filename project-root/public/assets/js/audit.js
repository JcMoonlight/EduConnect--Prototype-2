// Audit Trail Script - Super Admin Only
let currentUser = null;
let currentUserRole = null;
let auditRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 20;
let allUsers = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth guard
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser = user;
            currentUserRole = userData.role;

            // Verify Super Admin access
            if (currentUserRole !== 'Super Admin') {
                alert('Access denied. Audit Trail is only accessible to Super Administrators.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Load users for filter
            await loadUsers();
            
            // Initialize
            await loadAuditTrail();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing audit trail:', error);
        }
    }, 1000);
});

// Load all users for filter dropdown
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const userSelect = document.getElementById('userFilter');
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            const displayName = userData.firstName 
                ? `${userData.firstName} ${userData.lastName || ''}`.trim()
                : userData.email || 'Unknown User';
            option.textContent = `${displayName} (${userData.email})`;
            userSelect.appendChild(option);
            allUsers.push({ id: doc.id, ...userData });
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load Audit Trail Records
async function loadAuditTrail() {
    try {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '<div class="timeline-loading">Loading audit records...</div>';

        const auditSnapshot = await db.collection('auditTrail')
            .orderBy('timestamp', 'desc')
            .limit(500) // Limit to recent 500 records for performance
            .get();

        auditRecords = [];
        
        auditSnapshot.forEach(doc => {
            const record = doc.data();
            auditRecords.push({
                id: doc.id,
                ...record
            });
        });

        filteredRecords = [...auditRecords];
        applyFilters();
        displayTimeline();
        updateStats();

    } catch (error) {
        console.error('Error loading audit trail:', error);
        document.getElementById('timelineContainer').innerHTML = 
            '<div class="timeline-error">Error loading audit records. Please refresh the page.</div>';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Date filters
    document.getElementById('dateFrom').addEventListener('change', applyFilters);
    document.getElementById('dateTo').addEventListener('change', applyFilters);
    
    // User and action filters
    document.getElementById('userFilter').addEventListener('change', applyFilters);
    document.getElementById('actionFilter').addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Pagination
    document.getElementById('timelinePrevBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('timelineNextBtn').addEventListener('click', () => changePage(1));
    
    // Export button (placeholder)
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

// Apply Filters
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const userId = document.getElementById('userFilter').value;
    const actionType = document.getElementById('actionFilter').value;

    filteredRecords = auditRecords.filter(record => {
        // Date filter
        if (dateFrom || dateTo) {
            if (!record.timestamp) return false;
            const recordDate = record.timestamp.toDate();
            
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (recordDate < fromDate) return false;
            }
            
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (recordDate > toDate) return false;
            }
        }

        // User filter
        if (userId && record.userId !== userId) {
            return false;
        }

        // Action filter
        if (actionType && record.action !== actionType) {
            return false;
        }

        return true;
    });

    currentPage = 1;
    displayTimeline();
    updateStats();
    updatePagination();
}

// Clear All Filters
function clearFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('userFilter').value = '';
    document.getElementById('actionFilter').value = '';
    applyFilters();
}

// Display Timeline
function displayTimeline() {
    const container = document.getElementById('timelineContainer');
    
    if (filteredRecords.length === 0) {
        container.innerHTML = '<div class="timeline-empty">No audit records found matching the filters.</div>';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const pageRecords = filteredRecords.slice(startIndex, endIndex);

    container.innerHTML = '';

    pageRecords.forEach((record, index) => {
        const timelineItem = createTimelineItem(record, startIndex + index);
        container.appendChild(timelineItem);
    });
}

// Create Timeline Item
function createTimelineItem(record, index) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    // Get user info
    const user = allUsers.find(u => u.id === record.userId);
    const userName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Unknown User';
    const userEmail = user ? user.email : 'N/A';

    // Format timestamp
    const timestamp = record.timestamp ? record.timestamp.toDate() : new Date();
    const dateStr = timestamp.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    // Determine action color and icon
    let actionClass = 'action-login';
    let actionColor = 'var(--color-info)';
    let actionLabel = record.action || 'Unknown';

    switch(record.action) {
        case 'create':
            actionClass = 'action-create';
            actionColor = 'var(--color-success)';
            break;
        case 'update':
            actionClass = 'action-update';
            actionColor = 'var(--color-primary)';
            break;
        case 'delete':
            actionClass = 'action-delete';
            actionColor = 'var(--color-error)';
            break;
        case 'login':
            actionClass = 'action-login';
            actionColor = 'var(--color-info)';
            break;
        case 'logout':
            actionClass = 'action-logout';
            actionColor = 'var(--color-text-secondary)';
            break;
        default:
            actionClass = 'action-default';
            actionColor = 'var(--color-text-secondary)';
    }

    // Build detailed changes display if available
    let changesHTML = '';
    if (record.changedFields && record.changedFields.length > 0 && record.oldValues && record.newValues) {
        changesHTML = '<div class="timeline-changes">';
        changesHTML += '<strong class="changes-title">Changed Fields:</strong><ul class="changes-list">';
        
        record.changedFields.forEach(field => {
            // Try different field name formats
            const fieldKey = field.toLowerCase().replace(/\s+/g, '');
            const fieldKeyAlt = field.toLowerCase().replace(/\s+/g, '_');
            const oldVal = record.oldValues[fieldKey] || record.oldValues[fieldKeyAlt] || record.oldValues[field] || 'N/A';
            const newVal = record.newValues[fieldKey] || record.newValues[fieldKeyAlt] || record.newValues[field] || 'N/A';
            
            // Format display values (hide sensitive data)
            const displayOld = (oldVal === '[REDACTED]' || field.toLowerCase().includes('password')) ? '[REDACTED]' : (oldVal || 'N/A');
            const displayNew = (newVal === '[REDACTED]' || field.toLowerCase().includes('password')) ? '[REDACTED]' : (newVal || 'N/A');
            
            changesHTML += `<li class="change-item">
                <span class="change-field">${field}:</span>
                <span class="change-old">${displayOld}</span>
                <span class="change-arrow">→</span>
                <span class="change-new">${displayNew}</span>
            </li>`;
        });
        
        changesHTML += '</ul></div>';
    }

    item.innerHTML = `
        <div class="timeline-line"></div>
        <div class="timeline-node" style="background: ${actionColor};">
            <div class="timeline-node-inner"></div>
        </div>
        <div class="timeline-content">
            <div class="timeline-header">
                <div class="timeline-action">
                    <span class="action-badge ${actionClass}">${actionLabel.toUpperCase()}</span>
                    <span class="timeline-user">${userName}</span>
                    ${record.resourceType ? `<span class="timeline-resource">(${record.resourceType})</span>` : ''}
                </div>
                <div class="timeline-meta">
                    <span class="timeline-date">${dateStr}</span>
                    <span class="timeline-time">${timeStr}</span>
                </div>
            </div>
            <div class="timeline-body">
                <p class="timeline-details">${record.details || 'No details available'}</p>
                ${changesHTML}
                <div class="timeline-info">
                    <span class="info-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${userEmail}
                    </span>
                    ${record.ipAddress ? `
                        <span class="info-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            ${record.ipAddress}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    return item;
}

// Update Statistics
function updateStats() {
    document.getElementById('totalRecords').textContent = `Total: ${auditRecords.length}`;
    document.getElementById('filteredRecords').textContent = `Showing: ${filteredRecords.length}`;
}

// Pagination
function changePage(direction) {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayTimeline();
        updatePagination();
        
        // Scroll to top of timeline
        document.getElementById('timelineContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    const pagination = document.getElementById('timelinePagination');
    const prevBtn = document.getElementById('timelinePrevBtn');
    const nextBtn = document.getElementById('timelineNextBtn');
    const paginationInfo = document.getElementById('timelinePaginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

// Export Data (Placeholder)
function exportData() {
    // This would export the filtered records to CSV/JSON
    alert('Export functionality will be implemented. This will download the filtered audit records as a CSV file.');
    
    // Future implementation:
    // const csv = convertToCSV(filteredRecords);
    // downloadCSV(csv, 'audit-trail-export.csv');
}

