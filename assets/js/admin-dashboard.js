// Admin Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    loadDashboardData();
});

let currentPage = 1;
let applicationsPerPage = 10;
let allApplications = [];
let filteredApplications = [];

function initializeAdminDashboard() {
    // Check admin authentication
    checkAdminAuth();
    
    // Load initial data
    loadApplicationsData();
    loadStatistics();
    
    // Set up real-time updates
    setInterval(loadApplicationsData, 30000); // Refresh every 30 seconds
}

function checkAdminAuth() {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    try {
        const session = JSON.parse(adminSession);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        // Session valid for 24 hours
        if (hoursDiff > 24) {
            localStorage.removeItem('adminSession');
            window.location.href = 'admin-login.html';
            return;
        }
    } catch (error) {
        localStorage.removeItem('adminSession');
        window.location.href = 'admin-login.html';
        return;
    }
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked link
    event.target.classList.add('active');
    
    // Load section-specific data
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'applications':
            loadApplicationsData();
            break;
        case 'approved':
            loadApprovedApplications();
            break;
        case 'rejected':
            loadRejectedApplications();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('php/admin_dashboard_data.php');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(data) {
    document.getElementById('totalApplications').textContent = data.total || 0;
    document.getElementById('pendingApplications').textContent = data.pending || 0;
    document.getElementById('approvedApplications').textContent = data.approved || 0;
    document.getElementById('rejectedApplications').textContent = data.rejected || 0;
}

async function loadApplicationsData() {
    try {
        const response = await fetch('php/get_applications.php');
        const result = await response.json();
        
        if (result.success) {
            allApplications = result.data;
            filteredApplications = [...allApplications];
            displayApplications();
        }
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

function displayApplications() {
    const tbody = document.getElementById('applicationsTableBody');
    const startIndex = (currentPage - 1) * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    const pageApplications = filteredApplications.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageApplications.forEach((app, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${app.application_id}</td>
            <td>${app.full_name}</td>
            <td>${app.phone_number}</td>
            <td>${app.district}</td>
            <td>${app.transaction_id}</td>
            <td>₹${app.amount_paid}</td>
            <td>${new Date(app.created_at).toLocaleDateString()}</td>
            <td>
                <button onclick="approveApplication('${app.application_id}')" class="action-btn approve-btn">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button onclick="rejectApplication('${app.application_id}')" class="action-btn reject-btn">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button onclick="viewApplication('${app.application_id}')" class="action-btn view-btn">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayApplications();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayApplications();
    }
}

function filterApplications() {
    const districtFilter = document.getElementById('districtFilter').value.toLowerCase();
    const cityFilter = document.getElementById('cityFilter').value.toLowerCase();
    const pincodeFilter = document.getElementById('pincodeFilter').value.toLowerCase();
    const villageFilter = document.getElementById('villageFilter').value.toLowerCase();
    
    filteredApplications = allApplications.filter(app => {
        return (
            (districtFilter === '' || app.district.toLowerCase().includes(districtFilter)) &&
            (cityFilter === '' || (app.city && app.city.toLowerCase().includes(cityFilter))) &&
            (pincodeFilter === '' || (app.pincode && app.pincode.includes(pincodeFilter))) &&
            (villageFilter === '' || (app.village && app.village.toLowerCase().includes(villageFilter)))
        );
    });
    
    currentPage = 1;
    displayApplications();
}

async function approveApplication(applicationId) {
    if (!confirm('Are you sure you want to approve this application?')) {
        return;
    }
    
    try {
        const response = await fetch('php/approve_application.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applicationId: applicationId,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Application approved successfully');
            loadApplicationsData(); // Refresh data
            loadStatistics(); // Update stats
        } else {
            showNotification(result.message || 'Failed to approve application', 'error');
        }
    } catch (error) {
        console.error('Error approving application:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function rejectApplication(applicationId) {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) {
        return;
    }
    
    try {
        const response = await fetch('php/approve_application.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applicationId: applicationId,
                action: 'reject',
                reason: reason
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Application rejected successfully');
            loadApplicationsData(); // Refresh data
            loadStatistics(); // Update stats
        } else {
            showNotification(result.message || 'Failed to reject application', 'error');
        }
    } catch (error) {
        console.error('Error rejecting application:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function viewApplication(applicationId) {
    try {
        const response = await fetch(`php/get_application_details.php?id=${applicationId}`);
        const result = await response.json();
        
        if (result.success) {
            displayApplicationDetails(result.data);
        } else {
            showNotification('Failed to load application details', 'error');
        }
    } catch (error) {
        console.error('Error loading application details:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function displayApplicationDetails(data) {
    const modal = document.getElementById('applicationModal');
    const detailsContainer = document.getElementById('applicationDetails');
    
    detailsContainer.innerHTML = `
        <h2>Application Details</h2>
        <div class="application-info">
            <div class="info-section">
                <h3>Personal Information</h3>
                <p><strong>Application ID:</strong> ${data.application_id}</p>
                <p><strong>Full Name:</strong> ${data.full_name}</p>
                <p><strong>Father's Name:</strong> ${data.father_name || 'N/A'}</p>
                <p><strong>Phone:</strong> ${data.phone_number}</p>
                <p><strong>Email:</strong> ${data.email}</p>
            </div>
            <div class="info-section">
                <h3>Address Information</h3>
                <p><strong>District:</strong> ${data.district}</p>
                <p><strong>City:</strong> ${data.city || 'N/A'}</p>
                <p><strong>Village:</strong> ${data.village || 'N/A'}</p>
                <p><strong>Pincode:</strong> ${data.pincode || 'N/A'}</p>
            </div>
            <div class="info-section">
                <h3>Payment Information</h3>
                <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
                <p><strong>Amount Paid:</strong> ₹${data.amount_paid}</p>
                <p><strong>Payment Date:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('applicationModal').style.display = 'none';
}

async function loadApprovedApplications() {
    try {
        const response = await fetch('php/get_approved_applications.php');
        const result = await response.json();
        
        if (result.success) {
            displayApprovedApplications(result.data);
        }
    } catch (error) {
        console.error('Error loading approved applications:', error);
    }
}

function displayApprovedApplications(applications) {
    const tbody = document.getElementById('approvedTableBody');
    tbody.innerHTML = '';
    
    applications.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.unique_id}</td>
            <td>${app.application_id}</td>
            <td>${app.full_name}</td>
            <td>${app.phone_number}</td>
            <td>${app.district}</td>
            <td>${new Date(app.approved_date).toLocaleDateString()}</td>
            <td><span class="status-badge approved">Approved</span></td>
        `;
        tbody.appendChild(row);
    });
}

async function loadRejectedApplications() {
    try {
        const response = await fetch('php/get_rejected_applications.php');
        const result = await response.json();
        
        if (result.success) {
            displayRejectedApplications(result.data);
        }
    } catch (error) {
        console.error('Error loading rejected applications:', error);
    }
}

function displayRejectedApplications(applications) {
    const tbody = document.getElementById('rejectedTableBody');
    tbody.innerHTML = '';
    
    applications.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.application_id}</td>
            <td>${app.full_name}</td>
            <td>${app.phone_number}</td>
            <td>${app.district}</td>
            <td>${new Date(app.rejected_date).toLocaleDateString()}</td>
            <td>${app.rejection_reason || 'No reason provided'}</td>
        `;
        tbody.appendChild(row);
    });
}

async function loadReportsData() {
    try {
        const response = await fetch('php/get_reports_data.php');
        const result = await response.json();
        
        if (result.success) {
            displayReportsData(result.data);
        }
    } catch (error) {
        console.error('Error loading reports data:', error);
    }
}

function displayReportsData(data) {
    // Display district summary
    const districtSummary = document.getElementById('districtSummary');
    districtSummary.innerHTML = '';
    
    data.districtSummary.forEach(district => {
        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <h4>${district.district}</h4>
            <p>Total: ${district.total} | Approved: ${district.approved} | Rejected: ${district.rejected}</p>
        `;
        districtSummary.appendChild(item);
    });
    
    // Display monthly trends
    const monthlyTrends = document.getElementById('monthlyTrends');
    monthlyTrends.innerHTML = '';
    
    data.monthlyTrends.forEach(month => {
        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <h4>${month.month}</h4>
            <p>Applications: ${month.count}</p>
        `;
        monthlyTrends.appendChild(item);
    });
}

async function loadStatistics() {
    try {
        const response = await fetch('php/get_statistics.php');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function filterByDate() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (!fromDate || !toDate) {
        showNotification('Please select both from and to dates', 'error');
        return;
    }
    
    // Filter applications by date range
    filteredApplications = allApplications.filter(app => {
        const appDate = new Date(app.created_at).toISOString().split('T')[0];
        return appDate >= fromDate && appDate <= toDate;
    });
    
    currentPage = 1;
    displayApplications();
    showNotification(`Filtered ${filteredApplications.length} applications`);
}

function exportData(type) {
    let data = [];
    let filename = '';
    
    switch (type) {
        case 'approved':
            // This would be loaded from the approved applications
            filename = 'approved_applications.csv';
            break;
        case 'rejected':
            // This would be loaded from the rejected applications
            filename = 'rejected_applications.csv';
            break;
        default:
            data = filteredApplications;
            filename = 'applications.csv';
    }
    
    // Create CSV content
    const csvContent = convertToCSV(data);
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showNotification(`${filename} exported successfully`);
}

function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value}"` : value;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// Export functions
window.showSection = showSection;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.filterApplications = filterApplications;
window.approveApplication = approveApplication;
window.rejectApplication = rejectApplication;
window.viewApplication = viewApplication;
window.closeModal = closeModal;
window.filterByDate = filterByDate;
window.exportData = exportData;