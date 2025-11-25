// Reports Management Script
let currentUser = null;
let currentUserRole = null;
let reports = [];
let filteredReports = [];
let events = [];
let users = [];
let currentPage = 1;
const reportsPerPage = 10;

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser = user;
            currentUserRole = userData.role;

            if (currentUserRole !== 'Admin' && currentUserRole !== 'Super Admin') {
                alert('Access denied. This page is for administrators only.');
                window.location.href = 'dashboard.html';
                return;
            }

            await loadEvents();
            await loadUsers();
            await loadReports();
            setupEventListeners();

        } catch (error) {
            console.error('Error initializing reports:', error);
        }
    }, 1000);
});

// Load events for dropdown
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events').get();
        events = [];
        eventsSnapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        const eventSelect = document.getElementById('eventId');
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.eventName || 'Untitled Event';
            eventSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load users for dropdown
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'Client User')
            .get();
        
        users = [];
        usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        const userSelect = document.getElementById('userId');
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            const displayName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName} (${user.email})`
                : user.email || 'Unknown User';
            option.textContent = displayName;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load all reports
async function loadReports() {
    try {
        const tbody = document.getElementById('reportsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading reports...</td></tr>';

        const reportsSnapshot = await db.collection('reports')
            .orderBy('timestamp', 'desc')
            .get();

        reports = [];
        reportsSnapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        filteredReports = [...reports];
        displayReports();
        updatePagination();
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('reportsTableBody').innerHTML = 
            '<tr><td colspan="5" class="table-error">Error loading reports. Please refresh the page.</td></tr>';
    }
}

// Display reports in table
function displayReports() {
    const tbody = document.getElementById('reportsTableBody');
    
    if (filteredReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No reports found</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const pageReports = filteredReports.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    pageReports.forEach(async (report, index) => {
        const row = await createReportRow(report, startIndex + index);
        tbody.appendChild(row);
    });
}

// Create report table row
async function createReportRow(report, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    const typeLabels = {
        'attendance_summary': 'Attendance Summary',
        'event_attendance': 'Event Attendance',
        'user_attendance': 'User Attendance'
    };

    const type = typeLabels[report.reportType] || report.reportType;

    // Format parameters
    let paramsText = 'N/A';
    if (report.parameters) {
        const params = [];
        if (report.parameters.dateFrom) params.push(`From: ${new Date(report.parameters.dateFrom).toLocaleDateString()}`);
        if (report.parameters.dateTo) params.push(`To: ${new Date(report.parameters.dateTo).toLocaleDateString()}`);
        if (report.parameters.eventId) {
            const event = events.find(e => e.id === report.parameters.eventId);
            params.push(`Event: ${event ? event.eventName : 'Unknown'}`);
        }
        if (report.parameters.userId) {
            const user = users.find(u => u.id === report.parameters.userId);
            params.push(`User: ${user ? user.email : 'Unknown'}`);
        }
        paramsText = params.length > 0 ? params.join(', ') : 'No parameters';
    }

    // Get generated by info
    let generatedByName = 'Unknown';
    try {
        const generatedByDoc = await db.collection('users').doc(report.generatedBy).get();
        if (generatedByDoc.exists) {
            const generatedByData = generatedByDoc.data();
            generatedByName = generatedByData.firstName && generatedByData.lastName
                ? `${generatedByData.firstName} ${generatedByData.lastName}`
                : generatedByData.email || 'Unknown';
        }
    } catch (error) {
        console.error('Error loading generated by:', error);
    }

    let dateText = 'N/A';
    if (report.timestamp) {
        const date = report.timestamp.toDate();
        dateText = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    row.innerHTML = `
        <td><strong>${type}</strong></td>
        <td>${paramsText}</td>
        <td>${generatedByName}</td>
        <td>${dateText}</td>
        <td>
            <div class="table-actions">
                <button class="btn-action btn-info" onclick="viewReport('${report.id}')" title="View Report">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('generateReportBtn').addEventListener('click', openModal);
    document.getElementById('reportType').addEventListener('change', handleReportTypeChange);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('reportForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('closeViewReportModalBtn').addEventListener('click', closeViewReportModal);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            if (this.closest('#reportModal')) closeModal();
            if (this.closest('#viewReportModal')) closeViewReportModal();
        });
    });
}

// Handle Report Type Change
function handleReportTypeChange() {
    const reportType = document.getElementById('reportType').value;
    const eventIdGroup = document.getElementById('eventIdGroup');
    const userIdGroup = document.getElementById('userIdGroup');
    const eventId = document.getElementById('eventId');
    const userId = document.getElementById('userId');

    // Reset and hide groups
    eventIdGroup.style.display = 'none';
    userIdGroup.style.display = 'none';
    eventId.required = false;
    userId.required = false;

    if (reportType === 'event_attendance') {
        eventIdGroup.style.display = 'block';
        eventId.required = true;
    } else if (reportType === 'user_attendance') {
        userIdGroup.style.display = 'block';
        userId.required = true;
    }
}

// Apply Filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    filteredReports = reports.filter(report => {
        const typeLabels = {
            'attendance_summary': 'Attendance Summary',
            'event_attendance': 'Event Attendance',
            'user_attendance': 'User Attendance'
        };
        const typeText = typeLabels[report.reportType] || report.reportType;
        
        if (searchTerm && !typeText.toLowerCase().includes(searchTerm)) {
            return false;
        }
        if (typeFilter && report.reportType !== typeFilter) {
            return false;
        }
        return true;
    });

    currentPage = 1;
    displayReports();
    updatePagination();
}

// Open Modal
function openModal() {
    document.getElementById('reportForm').reset();
    document.getElementById('eventIdGroup').style.display = 'none';
    document.getElementById('userIdGroup').style.display = 'none';
    clearFormErrors();
    document.getElementById('reportModal').style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
    clearFormErrors();
}

// Close View Report Modal
function closeViewReportModal() {
    document.getElementById('viewReportModal').style.display = 'none';
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const reportType = document.getElementById('reportType').value;
    const eventId = document.getElementById('eventId').value;
    const userId = document.getElementById('userId').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    if (!reportType) {
        showFieldError('reportType', 'Report type is required');
        return;
    }

    if (reportType === 'event_attendance' && !eventId) {
        showFieldError('eventId', 'Event is required');
        return;
    }

    if (reportType === 'user_attendance' && !userId) {
        showFieldError('userId', 'User is required');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    try {
        const parameters = {};
        if (dateFrom) parameters.dateFrom = dateFrom;
        if (dateTo) parameters.dateTo = dateTo;
        if (eventId) parameters.eventId = eventId;
        if (userId) parameters.userId = userId;

        // Generate report results
        const results = await generateReportResults(reportType, parameters);

        // Save report to Firestore
        await db.collection('reports').add({
            generatedBy: currentUser.uid,
            reportType: reportType,
            parameters: parameters,
            results: results,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAuditTrail(currentUser.uid, 'create', `Generated report: ${reportType}`);

        closeModal();
        await loadReports();
        showNotification('Report generated successfully!', 'success');

    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Report';
    }
}

// Generate Report Results
async function generateReportResults(reportType, parameters) {
    const results = {
        summary: {},
        details: []
    };

    try {
        if (reportType === 'attendance_summary') {
            // Get all attendance logs within date range
            let logsQuery = db.collection('attendanceLogs');
            
            if (parameters.dateFrom || parameters.dateTo) {
                if (parameters.dateFrom) {
                    const fromDate = new Date(parameters.dateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    logsQuery = logsQuery.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(fromDate));
                }
                if (parameters.dateTo) {
                    const toDate = new Date(parameters.dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    logsQuery = logsQuery.where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(toDate));
                }
            }

            const logsSnapshot = await logsQuery.get();
            
            let totalLogs = 0;
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            let excusedCount = 0;

            logsSnapshot.forEach(doc => {
                const log = doc.data();
                totalLogs++;
                if (log.status === 'present') presentCount++;
                else if (log.status === 'absent') absentCount++;
                else if (log.status === 'late') lateCount++;
                else if (log.status === 'excused') excusedCount++;
            });

            results.summary = {
                totalRecords: totalLogs,
                present: presentCount,
                absent: absentCount,
                late: lateCount,
                excused: excusedCount,
                attendanceRate: totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0
            };

        } else if (reportType === 'event_attendance') {
            const eventId = parameters.eventId;
            const logsSnapshot = await db.collection('attendanceLogs')
                .where('eventId', '==', eventId)
                .get();

            const event = events.find(e => e.id === eventId);
            results.summary = {
                eventName: event ? event.eventName : 'Unknown Event',
                totalAttendees: logsSnapshot.size,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0
            };

            logsSnapshot.forEach(doc => {
                const log = doc.data();
                if (log.status === 'present') results.summary.present++;
                else if (log.status === 'absent') results.summary.absent++;
                else if (log.status === 'late') results.summary.late++;
                else if (log.status === 'excused') results.summary.excused++;
            });

        } else if (reportType === 'user_attendance') {
            const userId = parameters.userId;
            let logsQuery = db.collection('attendanceLogs').where('userId', '==', userId);
            
            if (parameters.dateFrom || parameters.dateTo) {
                if (parameters.dateFrom) {
                    const fromDate = new Date(parameters.dateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    logsQuery = logsQuery.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(fromDate));
                }
                if (parameters.dateTo) {
                    const toDate = new Date(parameters.dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    logsQuery = logsQuery.where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(toDate));
                }
            }

            const logsSnapshot = await logsQuery.get();
            const user = users.find(u => u.id === userId);

            let presentCount = 0;
            let totalCount = logsSnapshot.size;

            logsSnapshot.forEach(doc => {
                const log = doc.data();
                if (log.status === 'present') presentCount++;
            });

            results.summary = {
                userName: user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email) : 'Unknown User',
                totalRecords: totalCount,
                present: presentCount,
                attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
            };
        }
    } catch (error) {
        console.error('Error generating report results:', error);
        results.error = 'Error generating report data';
    }

    return results;
}

// View Report
async function viewReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.getElementById('viewReportModal');
    const title = document.getElementById('viewReportTitle');
    const content = document.getElementById('reportContent');

    const typeLabels = {
        'attendance_summary': 'Attendance Summary',
        'event_attendance': 'Event Attendance',
        'user_attendance': 'User Attendance'
    };

    title.textContent = typeLabels[report.reportType] || report.reportType;
    content.innerHTML = '<p>Loading report...</p>';

    modal.style.display = 'flex';

    try {
        const results = report.results || {};
        let html = '<div class="report-content">';

        if (results.summary) {
            html += '<div class="report-summary"><h4>Summary</h4><div class="summary-grid">';
            
            Object.entries(results.summary).forEach(([key, value]) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                html += `<div class="summary-item"><strong>${label}:</strong> ${value}</div>`;
            });
            
            html += '</div></div>';
        }

        if (results.details && results.details.length > 0) {
            html += '<div class="report-details"><h4>Details</h4><ul>';
            results.details.forEach(detail => {
                html += `<li>${detail}</li>`;
            });
            html += '</ul></div>';
        }

        if (results.error) {
            html += `<div class="report-error"><p>${results.error}</p></div>`;
        }

        html += '</div>';
        content.innerHTML = html;

    } catch (error) {
        console.error('Error loading report:', error);
        content.innerHTML = '<p class="table-error">Error loading report details</p>';
    }
}

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    const pagination = document.getElementById('reportsPagination');
    const prevBtn = document.getElementById('reportsPrevBtn');
    const nextBtn = document.getElementById('reportsNextBtn');
    const paginationInfo = document.getElementById('reportsPaginationInfo');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
    } else {
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

document.getElementById('reportsPrevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayReports();
        updatePagination();
    }
});

document.getElementById('reportsNextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayReports();
        updatePagination();
    }
});

// Clear Form Errors
function clearFormErrors() {
    document.querySelectorAll('#reportForm .error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('#reportForm input, #reportForm select').forEach(el => {
        el.classList.remove('error');
    });
}

// Show Field Error
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
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
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.viewReport = viewReport;

