<?php
require_once 'config.php';

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method');
}

try {
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Sanitize and validate input data
    $fullName = sanitizeInput($_POST['fullName'] ?? '');
    $fatherName = sanitizeInput($_POST['fatherName'] ?? '');
    $aadharNumber = preg_replace('/\s+/', '', sanitizeInput($_POST['aadharNumber'] ?? ''));
    $phoneNumber = sanitizeInput($_POST['phoneNumber'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $constitution = sanitizeInput($_POST['constitution'] ?? '');
    $state = sanitizeInput($_POST['state'] ?? '');
    $district = sanitizeInput($_POST['district'] ?? '');
    $city = sanitizeInput($_POST['city'] ?? '');
    $mandal = sanitizeInput($_POST['mandal'] ?? '');
    $village = sanitizeInput($_POST['village'] ?? '');
    $pincode = sanitizeInput($_POST['pincode'] ?? '');
    $otp = sanitizeInput($_POST['otp'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($fullName) || strlen($fullName) < 2) {
        $errors[] = 'Full name is required and must be at least 2 characters';
    }
    
    if (empty($fatherName) || strlen($fatherName) < 2) {
        $errors[] = 'Father name is required and must be at least 2 characters';
    }
    
    if (!validateAadhar($aadharNumber)) {
        $errors[] = 'Invalid Aadhar number';
    }
    
    if (!validatePhone($phoneNumber)) {
        $errors[] = 'Invalid phone number';
    }
    
    if (!validateEmail($email)) {
        $errors[] = 'Invalid email address';
    }
    
    if (empty($constitution)) {
        $errors[] = 'Constitution is required';
    }
    
    if (empty($state)) {
        $errors[] = 'State is required';
    }
    
    if (empty($district)) {
        $errors[] = 'District is required';
    }
    
    if (empty($city)) {
        $errors[] = 'City is required';
    }
    
    if (empty($mandal)) {
        $errors[] = 'Mandal is required';
    }
    
    if (empty($village)) {
        $errors[] = 'Village is required';
    }
    
    if (empty($pincode) || strlen($pincode) !== 6) {
        $errors[] = 'Valid pincode is required';
    }
    
    if (empty($otp) || strlen($otp) !== 6) {
        $errors[] = 'Valid OTP is required';
    }
    
    if (!empty($errors)) {
        sendResponse(false, implode(', ', $errors));
    }
    
    // Check if Aadhar number already exists
    $stmt = $db->prepare("SELECT id FROM registrations WHERE aadhar_number = ?");
    $stmt->execute([$aadharNumber]);
    if ($stmt->fetch()) {
        sendResponse(false, 'A registration with this Aadhar number already exists');
    }
    
    // Verify OTP
    $stmt = $db->prepare("
        SELECT id FROM otp_logs 
        WHERE phone_number = ? AND otp = ? AND status = 'sent' AND purpose = 'registration'
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY created_at DESC LIMIT 1
    ");
    $stmt->execute([$phoneNumber, $otp, OTP_EXPIRY_MINUTES]);
    $otpRecord = $stmt->fetch();
    
    if (!otpRecord) {
        sendResponse(false, 'Invalid or expired OTP');
    }
    
    // Generate unique application ID
    $applicationId = generateApplicationId();
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Insert registration
        $stmt = $db->prepare("
            INSERT INTO registrations (
                application_id, full_name, father_name, aadhar_number, phone_number, 
                email, constitution, state, district, city, mandal, village, pincode, 
                otp_verified, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'pending_payment')
        ");
        
        $stmt->execute([
            $applicationId,
            $fullName,
            $fatherName,
            $aadharNumber,
            $phoneNumber,
            $email,
            $constitution,
            $state,
            $district,
            $city,
            $mandal,
            $village,
            $pincode
        ]);
        
        $newRegistrationId = $db->lastInsertId();
        
        // Mark OTP as verified
        $stmt = $db->prepare("
            UPDATE otp_logs SET status = 'verified', verified_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$otpRecord['id']]);
        
        // Log activity
        logActivity($newRegistrationId, 'applicant', 'REGISTRATION_SUBMITTED', "Registration $applicationId submitted");
        
        // Commit transaction
        $db->commit();
        
        // Send confirmation email
        sendRegistrationConfirmationEmail($email, $fullName, $applicationId);
        
        // Send confirmation SMS
        sendRegistrationConfirmationSMS($phoneNumber, $applicationId);
        
        sendResponse(true, 'Registration submitted successfully', [
            'applicationId' => $applicationId,
            'fullName' => $fullName,
            'phoneNumber' => $phoneNumber,
            'email' => $email,
            'district' => $district
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Registration submission error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while processing your registration. Please try again.');
}

function sendRegistrationConfirmationEmail($email, $name, $applicationId) {
    error_log("Registration confirmation email would be sent to $email for application $applicationId");
    
    $subject = "Housing Registration Submitted - $applicationId";
    $message = "
        Dear $name,
        
        Your housing registration has been successfully submitted.
        
        Application ID: $applicationId
        Status: Pending Payment
        
        Please complete the payment to proceed with your application.
        
        Thank you,
        Andhra Pradesh Housing Corporation
    ";
}

function sendRegistrationConfirmationSMS($phone, $applicationId) {
    error_log("Registration confirmation SMS would be sent to $phone for application $applicationId");
    
    $message = "Your housing registration $applicationId has been submitted. Please complete payment to proceed. -AP Housing Corporation";
}
?>