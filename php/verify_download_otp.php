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
    
    $uniqueId = sanitizeInput($input['uniqueId'] ?? '');
    $aadharNumber = sanitizeInput($input['aadharNumber'] ?? '');
    $mobileNumber = sanitizeInput($input['mobileNumber'] ?? '');
    $otp = sanitizeInput($input['otp'] ?? '');
    
    // Validation
    if (empty($otp) || strlen($otp) !== 6) {
        sendResponse(false, 'Valid OTP is required');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Verify OTP
    $stmt = $db->prepare("
        SELECT id FROM otp_logs 
        WHERE phone_number = ? AND otp = ? AND status = 'sent' AND purpose = 'download'
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY created_at DESC LIMIT 1
    ");
    $stmt->execute([$mobileNumber, $otp, OTP_EXPIRY_MINUTES]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        sendResponse(false, 'Invalid or expired OTP');
    }
    
    // Mark OTP as verified
    $stmt = $db->prepare("UPDATE otp_logs SET status = 'verified' WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);
    
    // Get application details for logging
    $stmt = $db->prepare("
        SELECT r.id, r.application_id
        FROM registrations r
        JOIN admin_applications aa ON r.application_id = aa.application_id
        WHERE aa.unique_id = ? AND r.aadhar_number = ? AND r.phone_number = ?
    ");
    $stmt->execute([$uniqueId, $aadharNumber, $mobileNumber]);
    $application = $stmt->fetch();
    
    if ($application) {
        // Log activity
        logActivity($application['id'], 'applicant', 'DOWNLOAD_AUTHORIZED', "Download authorized for {$application['application_id']}");
    }
    
    sendResponse(true, 'OTP verified successfully. You can now download your documents.');
    
} catch (Exception $e) {
    error_log("Download OTP verification error: " . $e->getMessage());
    sendResponse(false, 'An error occurred during OTP verification. Please try again.');
}
?>