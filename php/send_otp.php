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
    
    $phoneNumber = sanitizeInput($input['phoneNumber'] ?? '');
    $aadharNumber = sanitizeInput($input['aadharNumber'] ?? '');
    $isResend = isset($input['resend']) && $input['resend'] === true;
    $purpose = sanitizeInput($input['purpose'] ?? 'application');
    
    // Validate phone number
    if (!validatePhone($phoneNumber)) {
        sendResponse(false, 'Invalid phone number');
    }
    
    // Validate Aadhar number (only for new OTP requests)
    if (!$isResend && !validateAadhar($aadharNumber)) {
        sendResponse(false, 'Invalid Aadhar number');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Check rate limiting - max 3 OTP requests per phone number per hour
    $stmt = $db->prepare("
        SELECT COUNT(*) as otp_count 
        FROM otp_logs 
        WHERE phone_number = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute([$phoneNumber]);
    $result = $stmt->fetch();
    
    if ($result['otp_count'] >= 3) {
        sendResponse(false, 'Too many OTP requests. Please try again after 1 hour.');
    }
    
    // Generate OTP
    $otp = generateOTP();
    
    // Store OTP in database
    $stmt = $db->prepare("
        INSERT INTO otp_logs (phone_number, otp, purpose, ip_address) 
        VALUES (?, ?, 'application', ?)
    ");
    $stmt->execute([
        $phoneNumber, 
        $otp, 
        $purpose,
    ]);
    
    // Send OTP via SMS (implement actual SMS sending)
    $smsResult = sendOTPSMS($phoneNumber, $otp);
    
    if ($smsResult) {
        // Log successful OTP send
        logActivity(null, 'system', 'OTP_SENT', "OTP sent to $phoneNumber");
        
        sendResponse(true, 'OTP sent successfully to your mobile number');
    } else {
        // Update OTP status to failed
        $stmt = $db->prepare("
            UPDATE otp_logs SET status = 'failed' 
            WHERE phone_number = ? AND otp = ? 
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$phoneNumber, $otp]);
        
        sendResponse(false, 'Failed to send OTP. Please try again.');
    }
    
} catch (Exception $e) {
    error_log("OTP sending error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while sending OTP. Please try again.');
}

function sendOTPSMS($phoneNumber, $otp) {
    // In a real application, integrate with SMS gateway like Twilio, MSG91, etc.
    // For testing, log the OTP to console/file
    error_log("OTP for $phoneNumber: $otp");
    
    $message = "Your OTP for housing application is: $otp. Valid for " . OTP_EXPIRY_MINUTES . " minutes. Do not share with anyone. -AP Housing Corporation";
    
    // For testing purposes, always return true
    // In production, implement actual SMS gateway integration
    
    // Example with a test SMS service (uncomment for actual implementation):
    /*
    $apiKey = 'your-sms-api-key';
    $senderId = 'APHC';
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://api.textlocal.in/send/',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'apikey' => $apiKey,
            'numbers' => $phoneNumber,
            'message' => $message,
            'sender' => $senderId
        ])
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    return $httpCode === 200;
    */
    
    // For testing, always return true
    return true;
}

function verifyOTP($phoneNumber, $otp) {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT id FROM otp_logs 
        WHERE phone_number = ? AND otp = ? AND status = 'sent' 
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY created_at DESC LIMIT 1
    ");
    $stmt->execute([$phoneNumber, $otp, OTP_EXPIRY_MINUTES]);
    
    return $stmt->fetch() !== false;
}
?>