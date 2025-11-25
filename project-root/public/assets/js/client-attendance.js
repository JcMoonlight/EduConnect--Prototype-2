// Client Attendance Script - View Own Attendance
let currentUser = null;
let attendanceLogs = [];
let events = [];
let filteredLogs = [];

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async function() {
        const user = auth.currentUser;
        if (!user) return;

        currentUser = user;
        await loadEvents();
        await loadAttendanceLogs();
        setupEventListeners();
    }, 1000);
});

// Load all events for reference
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events').get();
        events = [];
        eventsSnapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load user's attendance logs
async function loadAttendanceLogs() {
    try {
        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = '<tr><td colspan="3" class="table-loading">Loading attendance records...</td></tr>';

        const logsSnapshot = await db.collection('attendanceLogs')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();

        attendanceLogs = [];
        logsSnapshot.forEach(doc => {
            attendanceLogs.push({ id: doc.id, ...doc.data() });
        });

        filteredLogs = [...attendanceLogs];
        updateStats();
        displayAttendanceLogs();

    } catch (error) {
        console.error('Error loading attendance logs:', error);
        document.getElementById('attendanceTableBody').innerHTML = 
            '<tr><td colspan="3" class="table-error">Error loading attendance records. Please refresh the page.</td></tr>';
    }
}

// Update statistics
function updateStats() {
    const totalRecords = attendanceLogs.length;
    let presentCount = 0;

    attendanceLogs.forEach(log => {
        if (log.status === 'present') {
            presentCount++;
        }
    });

    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
}

// Display attendance logs
function displayAttendanceLogs() {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="table-empty">No attendance records found</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    filteredLogs.forEach((log, index) => {
        const row = createAttendanceRow(log, index);
        tbody.appendChild(row);
    });
}

// Create attendance table row
function createAttendanceRow(log, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';

    // Get event info
    const event = events.find(e => e.id === log.eventId);
    const eventName = event ? event.eventName : 'Unknown Event';

    // Format timestamp
    let dateTimeText = 'N/A';
    if (log.timestamp) {
        const logDate = log.timestamp.toDate();
        dateTimeText = logDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Status badge class
    const statusClass = `status-${log.status || 'present'}`;

    row.innerHTML = `
        <td><strong>${eventName}</strong></td>
        <td>${dateTimeText}</td>
        <td><span class="status-badge ${statusClass}">${(log.status || 'present').charAt(0).toUpperCase() + (log.status || 'present').slice(1)}</span></td>
    `;

    return row;
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('scanQRBtn').addEventListener('click', function() {
        alert('QR Code scanner will be implemented. For now, please contact your administrator to mark your attendance.');
    });
}

// Apply Filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredLogs = attendanceLogs.filter(log => {
        // Search filter
        if (searchTerm) {
            const event = events.find(e => e.id === log.eventId);
            const eventName = event ? event.eventName : '';
            if (!eventName.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }

        // Status filter
        if (statusFilter && log.status !== statusFilter) {
            return false;
        }

        return true;
    });

    displayAttendanceLogs();
}

