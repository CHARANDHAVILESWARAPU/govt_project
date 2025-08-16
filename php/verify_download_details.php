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
    
    // Validation
    if (empty($uniqueId)) {
        sendResponse(false, 'Unique ID is required');
    }
    
    if (!validateAadhar($aadharNumber)) {
        sendResponse(false, 'Invalid Aadhar number');
    }
    
    if (!validatePhone($mobileNumber)) {
        sendResponse(false, 'Invalid mobile number');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Verify details against approved applications
    $stmt = $db->prepare("
        SELECT r.id, r.application_id, r.full_name
        FROM registrations r
        JOIN admin_applications aa ON r.application_id = aa.application_id
        WHERE aa.unique_id = ? AND r.aadhar_number = ? AND r.phone_number = ?
        AND aa.status = 'approved'
    ");
    $stmt->execute([$uniqueId, $aadharNumber, $mobileNumber]);
    $application = $stmt->fetch();
    
    if (!$application) {
        sendResponse(false, 'Invalid details or application not approved yet');
    }
    
    // Generate and send OTP
    $otp = generateOTP();
    
    // Store OTP
    $stmt = $db->prepare("
        INSERT INTO otp_logs (phone_number, otp, purpose, ip_address) 
        VALUES (?, ?, 'download', ?)
    ");
    $stmt->execute([
        $mobileNumber,
        $otp,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    
    // Send OTP (in real implementation)
    error_log("Download verification OTP for $mobileNumber: $otp");
    
    // Log activity
    logActivity($application['id'], 'applicant', 'DOWNLOAD_VERIFICATION_INITIATED', "Download verification for {$application['application_id']}");
    
    sendResponse(true, 'Details verified successfully. OTP sent to your mobile number.');
    
} catch (Exception $e) {
    error_log("Download verification error: " . $e->getMessage());
    sendResponse(false, 'An error occurred during verification. Please try again.');
}
?>