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
    $aadharNumber = preg_replace('/\s+/', '', sanitizeInput($_POST['aadharNumber'] ?? ''));
    $phoneNumber = sanitizeInput($_POST['phoneNumber'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $district = sanitizeInput($_POST['district'] ?? '');
    $income = sanitizeInput($_POST['income'] ?? '');
    $address = sanitizeInput($_POST['address'] ?? '');
    $otp = sanitizeInput($_POST['otp'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($fullName) || strlen($fullName) < 2) {
        $errors[] = 'Full name is required and must be at least 2 characters';
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
    
    if (empty($district)) {
        $errors[] = 'District is required';
    }
    
    if (empty($income)) {
        $errors[] = 'Income range is required';
    }
    
    if (empty($address) || strlen($address) < 10) {
        $errors[] = 'Address is required and must be at least 10 characters';
    }
    
    if (empty($otp) || strlen($otp) !== 6) {
        $errors[] = 'Valid OTP is required';
    }
    
    if (!empty($errors)) {
        sendResponse(false, implode(', ', $errors));
    }
    
    // Check if Aadhar number already exists
    $stmt = $db->prepare("SELECT id FROM applications WHERE aadhar_number = ?");
    $stmt->execute([$aadharNumber]);
    if ($stmt->fetch()) {
        sendResponse(false, 'An application with this Aadhar number already exists');
    }
    
    // Verify OTP
    $stmt = $db->prepare("
        SELECT id FROM otp_logs 
        WHERE phone_number = ? AND otp = ? AND status = 'sent' 
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY created_at DESC LIMIT 1
    ");
    $stmt->execute([$phoneNumber, $otp, OTP_EXPIRY_MINUTES]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        sendResponse(false, 'Invalid or expired OTP');
    }
    
    // Generate unique application ID
    $applicationId = generateApplicationId();
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Insert application
        $stmt = $db->prepare("
            INSERT INTO applications (
                application_id, full_name, aadhar_number, phone_number, 
                email, district, income_range, address, otp_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        ");
        
        $stmt->execute([
            $applicationId,
            $fullName,
            $aadharNumber,
            $phoneNumber,
            $email,
            $district,
            $income,
            $address
        ]);
        
        $newApplicationId = $db->lastInsertId();
        
        // Mark OTP as verified
        $stmt = $db->prepare("
            UPDATE otp_logs SET status = 'verified', verified_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$otpRecord['id']]);
        
        // Log activity
        logActivity($newApplicationId, 'applicant', 'APPLICATION_SUBMITTED', "Application $applicationId submitted");
        
        // Commit transaction
        $db->commit();
        
        // Send confirmation email (in a real application)
        sendConfirmationEmail($email, $fullName, $applicationId);
        
        // Send confirmation SMS (in a real application)
        sendConfirmationSMS($phoneNumber, $applicationId);
        
        sendResponse(true, 'Application submitted successfully', [
            'applicationId' => $applicationId
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Application submission error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while processing your application. Please try again.');
}

function sendConfirmationEmail($email, $name, $applicationId) {
    // In a real application, implement email sending using PHPMailer or similar
    // For now, just log the action
    error_log("Confirmation email would be sent to $email for application $applicationId");
    
    // Example email content:
    $subject = "Housing Application Submitted - $applicationId";
    $message = "
        Dear $name,
        
        Your housing application has been successfully submitted.
        
        Application ID: $applicationId
        Status: Under Review
        
        You will receive updates on your application status via SMS and email.
        
        For any queries, please contact us at info@aphc.gov.in or call +91-1234567890.
        
        Thank you,
        Andhra Pradesh Housing Corporation
    ";
    
    // Implement actual email sending here
    // mail($email, $subject, $message, $headers);
}

function sendConfirmationSMS($phone, $applicationId) {
    // In a real application, implement SMS sending using SMS gateway
    // For now, just log the action
    error_log("Confirmation SMS would be sent to $phone for application $applicationId");
    
    $message = "Your housing application $applicationId has been submitted successfully. You will receive updates on this number. -AP Housing Corporation";
    
    // Implement actual SMS sending here
    // sendSMS($phone, $message);
}
?>