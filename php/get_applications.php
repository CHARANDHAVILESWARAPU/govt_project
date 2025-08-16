<?php
require_once 'config.php';

// Check admin authentication
session_start();
if (!isset($_SESSION['admin_id'])) {
    sendResponse(false, 'Unauthorized access');
}

try {
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Get new applications (FIFO order)
    $stmt = $db->prepare("
        SELECT aa.*, r.father_name, r.city, r.village, r.pincode
        FROM admin_applications aa
        JOIN registrations r ON aa.application_id = r.application_id
        WHERE aa.status = 'new'
        ORDER BY aa.created_at ASC
    ");
    $stmt->execute();
    $applications = $stmt->fetchAll();
    
    sendResponse(true, 'Applications loaded successfully', $applications);
    
} catch (Exception $e) {
    error_log("Get applications error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while loading applications');
}
?>