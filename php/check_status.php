<?php
require_once 'config.php';

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method');
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(false, 'Invalid JSON data');
    }
    
    $method = sanitizeInput($input['method'] ?? '');
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'phone') {
        $fullName = sanitizeInput($input['fullName'] ?? '');
        $phoneNumber = sanitizeInput($input['phoneNumber'] ?? '');
        $district = sanitizeInput($input['district'] ?? '');
        $pincode = sanitizeInput($input['pincode'] ?? '');
        $otp = sanitizeInput($input['otp'] ?? '');
        
        // Validate OTP first
        $stmt = $db->prepare("
            SELECT id FROM otp_logs 
            WHERE phone_number = ? AND otp = ? AND status = 'sent' AND purpose = 'status_check'
            AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$phoneNumber, $otp, OTP_EXPIRY_MINUTES]);
        $otpRecord = $stmt->fetch();
        
        if (!$otpRecord) {
            sendResponse(false, 'Invalid or expired OTP');
        }
        
        // Mark OTP as verified
        $stmt = $db->prepare("UPDATE otp_logs SET status = 'verified' WHERE id = ?");
        $stmt->execute([$otpRecord['id']]);
        
        // Find application by phone number and other details
        $stmt = $db->prepare("
            SELECT r.*, p.transaction_id, p.amount as amount_paid, p.payment_date,
                   aa.status as admin_status, aa.reviewed_at, aa.unique_id
            FROM registrations r
            LEFT JOIN payments p ON r.application_id = p.application_id
            LEFT JOIN admin_applications aa ON r.application_id = aa.application_id
            WHERE r.phone_number = ? AND r.full_name LIKE ? AND r.district = ?
            ORDER BY r.created_at DESC LIMIT 1
        ");
        $stmt->execute([$phoneNumber, "%$fullName%", $district]);
        $application = $stmt->fetch();
        
    } else if ($method === 'transaction') {
        $transactionId = sanitizeInput($input['transactionId'] ?? '');
        $fullName = sanitizeInput($input['fullName'] ?? '');
        $district = sanitizeInput($input['district'] ?? '');
        $pincode = sanitizeInput($input['pincode'] ?? '');
        
        // Find application by transaction ID
        $stmt = $db->prepare("
            SELECT r.*, p.transaction_id, p.amount as amount_paid, p.payment_date,
                   aa.status as admin_status, aa.reviewed_at, aa.unique_id
            FROM registrations r
            LEFT JOIN payments p ON r.application_id = p.application_id
            LEFT JOIN admin_applications aa ON r.application_id = aa.application_id
            WHERE p.transaction_id = ? AND r.full_name LIKE ? AND r.district = ?
            ORDER BY r.created_at DESC LIMIT 1
        ");
        $stmt->execute([$transactionId, "%$fullName%", $district]);
        $application = $stmt->fetch();
        
    } else {
        sendResponse(false, 'Invalid method');
    }
    
    if (!$application) {
        sendResponse(false, 'No application found with the provided details');
    }
    
    // Determine current status
    $currentStatus = 'pending';
    if ($application['payment_status'] === 'completed') {
        $currentStatus = 'paid';
    }
    if ($application['admin_status'] === 'reviewed') {
        $currentStatus = 'under_review';
    }
    if ($application['admin_status'] === 'approved') {
        $currentStatus = 'approved';
    }
    if ($application['admin_status'] === 'rejected') {
        $currentStatus = 'rejected';
    }
    
    // Prepare response data
    $responseData = [
        'applicationId' => $application['application_id'],
        'uniqueId' => $application['unique_id'],
        'transactionId' => $application['transaction_id'],
        'status' => $currentStatus,
        'submittedDate' => date('d/m/Y', strtotime($application['created_at'])),
        'paymentDate' => $application['payment_date'] ? date('d/m/Y', strtotime($application['payment_date'])) : null,
        'reviewDate' => $application['reviewed_at'] ? date('d/m/Y', strtotime($application['reviewed_at'])) : null,
        'approvalDate' => ($application['admin_status'] === 'approved' && $application['reviewed_at']) ? 
                         date('d/m/Y', strtotime($application['reviewed_at'])) : null
    ];
    
    // Log activity
    logActivity($application['id'], 'applicant', 'STATUS_CHECKED', "Status checked for application {$application['application_id']}");
    
    sendResponse(true, 'Status retrieved successfully', $responseData);
    
} catch (Exception $e) {
    error_log("Status check error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while checking status. Please try again.');
}
?>