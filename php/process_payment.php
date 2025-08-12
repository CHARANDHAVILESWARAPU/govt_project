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
    
    $transactionId = sanitizeInput($input['transactionId'] ?? '');
    $amount = floatval($input['amount'] ?? 0);
    $paymentDate = sanitizeInput($input['paymentDate'] ?? '');
    $status = sanitizeInput($input['status'] ?? '');
    $applicationData = $input['applicationData'] ?? [];
    
    // Validation
    if (empty($transactionId)) {
        sendResponse(false, 'Transaction ID is required');
    }
    
    if ($amount <= 0) {
        sendResponse(false, 'Invalid amount');
    }
    
    if (empty($applicationData['applicationId'])) {
        sendResponse(false, 'Application ID is required');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Check if transaction already exists
    $stmt = $db->prepare("SELECT id FROM payments WHERE transaction_id = ?");
    $stmt->execute([$transactionId]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Transaction already processed');
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Insert payment record
        $stmt = $db->prepare("
            INSERT INTO payments (
                transaction_id, application_id, amount, payment_date, 
                status, payment_method, created_at
            ) VALUES (?, ?, ?, NOW(), ?, 'online', NOW())
        ");
        
        $stmt->execute([
            $transactionId,
            $applicationData['applicationId'],
            $amount,
            $status
        ]);
        
        $paymentId = $db->lastInsertId();
        
        // Update registration status to paid
        $stmt = $db->prepare("
            UPDATE registrations 
            SET status = 'paid', payment_status = 'completed', updated_at = NOW() 
            WHERE application_id = ?
        ");
        $stmt->execute([$applicationData['applicationId']]);
        
        // Insert into admin panel for review
        $stmt = $db->prepare("
            INSERT INTO admin_applications (
                application_id, full_name, phone_number, email, district,
                transaction_id, amount_paid, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW())
        ");
        
        $stmt->execute([
            $applicationData['applicationId'],
            $applicationData['fullName'] ?? '',
            $applicationData['phoneNumber'] ?? '',
            $applicationData['email'] ?? '',
            $applicationData['district'] ?? '',
            $transactionId,
            $amount
        ]);
        
        // Log activity
        logActivity($paymentId, 'system', 'PAYMENT_PROCESSED', "Payment $transactionId processed for application {$applicationData['applicationId']}");
        
        // Commit transaction
        $db->commit();
        
        // Send payment confirmation
        sendPaymentConfirmation($applicationData, $transactionId, $amount);
        
        sendResponse(true, 'Payment processed successfully', [
            'transactionId' => $transactionId,
            'paymentId' => $paymentId
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Payment processing error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while processing payment. Please try again.');
}

function sendPaymentConfirmation($applicationData, $transactionId, $amount) {
    $email = $applicationData['email'] ?? '';
    $phone = $applicationData['phoneNumber'] ?? '';
    $name = $applicationData['fullName'] ?? '';
    $applicationId = $applicationData['applicationId'] ?? '';
    
    // Email confirmation
    if ($email) {
        error_log("Payment confirmation email would be sent to $email");
        
        $subject = "Payment Successful - $applicationId";
        $message = "
            Dear $name,
            
            Your payment has been successfully processed.
            
            Transaction ID: $transactionId
            Amount: ₹$amount
            Application ID: $applicationId
            
            Your application is now under review.
            
            Thank you,
            Andhra Pradesh Housing Corporation
        ";
    }
    
    // SMS confirmation
    if ($phone) {
        error_log("Payment confirmation SMS would be sent to $phone");
        
        $message = "Payment successful! TXN: $transactionId, Amount: ₹$amount for application $applicationId. Under review now. -AP Housing Corporation";
    }
}
?>