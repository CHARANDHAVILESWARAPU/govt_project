<?php
require_once 'config.php';

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method');
}

try {
    // Sanitize and validate input data
    $firstName = sanitizeInput($_POST['firstName'] ?? '');
    $lastName = sanitizeInput($_POST['lastName'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $phone = sanitizeInput($_POST['phone'] ?? '');
    $subject = sanitizeInput($_POST['subject'] ?? '');
    $message = sanitizeInput($_POST['message'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($firstName) || strlen($firstName) < 2) {
        $errors[] = 'First name is required and must be at least 2 characters';
    }
    
    if (empty($lastName) || strlen($lastName) < 2) {
        $errors[] = 'Last name is required and must be at least 2 characters';
    }
    
    if (!validateEmail($email)) {
        $errors[] = 'Invalid email address';
    }
    
    if (!validatePhone($phone)) {
        $errors[] = 'Invalid phone number';
    }
    
    if (empty($subject)) {
        $errors[] = 'Subject is required';
    }
    
    if (empty($message) || strlen($message) < 10) {
        $errors[] = 'Message is required and must be at least 10 characters';
    }
    
    if (strlen($message) > 1000) {
        $errors[] = 'Message must be less than 1000 characters';
    }
    
    if (!empty($errors)) {
        sendResponse(false, implode(', ', $errors));
    }
    
    // Check for spam - limit messages per IP per hour
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("
        SELECT COUNT(*) as message_count 
        FROM contact_messages 
        WHERE ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute([$_SERVER['REMOTE_ADDR'] ?? 'unknown']);
    $result = $stmt->fetch();
    
    if ($result['message_count'] >= 5) {
        sendResponse(false, 'Too many messages sent. Please try again after 1 hour.');
    }
    
    // Insert contact message
    $stmt = $db->prepare("
        INSERT INTO contact_messages (
            first_name, last_name, email, phone, subject, message, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $phone,
        $subject,
        $message,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    
    $messageId = $db->lastInsertId();
    
    // Log activity
    logActivity($messageId, 'visitor', 'CONTACT_MESSAGE_SENT', "Contact message from $email");
    
    // Send auto-reply email (in a real application)
    sendAutoReplyEmail($email, $firstName, $messageId);
    
    // Send notification to admin (in a real application)
    sendAdminNotification($firstName, $lastName, $email, $subject, $message);
    
    sendResponse(true, 'Message sent successfully. We will get back to you soon.', [
        'messageId' => $messageId
    ]);
    
} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while sending your message. Please try again.');
}

function sendAutoReplyEmail($email, $name, $messageId) {
    // In a real application, implement email sending using PHPMailer or similar
    error_log("Auto-reply email would be sent to $email for message ID $messageId");
    
    $subject = "Thank you for contacting AP Housing Corporation";
    $message = "
        Dear $name,
        
        Thank you for contacting Andhra Pradesh Housing Corporation.
        
        We have received your message and will respond within 24-48 hours.
        
        Reference ID: MSG" . str_pad($messageId, 6, '0', STR_PAD_LEFT) . "
        
        For urgent matters, please call us at +91-1234567890.
        
        Best regards,
        AP Housing Corporation Support Team
    ";
    
    // Implement actual email sending here
}

function sendAdminNotification($firstName, $lastName, $email, $subject, $message) {
    // In a real application, send notification to admin
    error_log("Admin notification: New contact message from $firstName $lastName ($email) - Subject: $subject");
    
    // Could send email to admin or create internal notification
}
?>