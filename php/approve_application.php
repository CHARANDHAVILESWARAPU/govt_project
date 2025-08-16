<?php
require_once 'config.php';

// Check admin authentication
session_start();
if (!isset($_SESSION['admin_id'])) {
    sendResponse(false, 'Unauthorized access');
}

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
    
    $applicationId = sanitizeInput($input['applicationId'] ?? '');
    $action = sanitizeInput($input['action'] ?? '');
    $reason = sanitizeInput($input['reason'] ?? '');
    
    if (empty($applicationId) || empty($action)) {
        sendResponse(false, 'Application ID and action are required');
    }
    
    if (!in_array($action, ['approve', 'reject'])) {
        sendResponse(false, 'Invalid action');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        if ($action === 'approve') {
            // Generate unique ID for approved application
            $stmt = $db->prepare("SELECT district FROM admin_applications WHERE application_id = ?");
            $stmt->execute([$applicationId]);
            $app = $stmt->fetch();
            
            if (!$app) {
                throw new Exception('Application not found');
            }
            
            // Generate unique ID: DISTRICT_NAME + RANDOM_NUMBERS
            $districtCode = strtoupper(substr($app['district'], 0, 3));
            $randomNumbers = str_pad(random_int(1, 999999), 6, '0', STR_PAD_LEFT);
            $uniqueId = $districtCode . $randomNumbers;
            
            // Update application status to approved
            $stmt = $db->prepare("
                UPDATE admin_applications 
                SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), 
                    unique_id = ?, updated_at = NOW()
                WHERE application_id = ?
            ");
            $stmt->execute([$_SESSION['admin_id'], $uniqueId, $applicationId]);
            
            // Get applicant details for SMS
            $stmt = $db->prepare("
                SELECT r.full_name, r.phone_number, r.email
                FROM registrations r
                WHERE r.application_id = ?
            ");
            $stmt->execute([$applicationId]);
            $applicant = $stmt->fetch();
            
            if ($applicant) {
                // Send approval SMS with unique ID
                sendApprovalSMS($applicant['phone_number'], $applicant['full_name'], $uniqueId);
                sendApprovalEmail($applicant['email'], $applicant['full_name'], $uniqueId, $applicationId);
            }
            
            $message = 'Application approved successfully';
            
        } else { // reject
            if (empty($reason)) {
                throw new Exception('Rejection reason is required');
            }
            
            // Update application status to rejected
            $stmt = $db->prepare("
                UPDATE admin_applications 
                SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), 
                    rejection_reason = ?, updated_at = NOW()
                WHERE application_id = ?
            ");
            $stmt->execute([$_SESSION['admin_id'], $reason, $applicationId]);
            
            $message = 'Application rejected successfully';
        }
        
        // Log activity
        logActivity($_SESSION['admin_id'], 'admin', 'APPLICATION_' . strtoupper($action), 
                   "Application $applicationId " . ($action === 'approve' ? 'approved' : 'rejected'));
        
        // Commit transaction
        $db->commit();
        
        sendResponse(true, $message);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Application approval error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while processing the application');
}

function sendApprovalSMS($phoneNumber, $name, $uniqueId) {
    // In real implementation, integrate with SMS gateway
    error_log("Approval SMS to $phoneNumber: Dear $name, your housing application has been APPROVED! Your Unique ID is: $uniqueId. You can now add your bank details. -AP Housing Corporation");
    
    $message = "Dear $name, your housing application has been APPROVED! Your Unique ID is: $uniqueId. You can now add your bank details. -AP Housing Corporation";
    
    // Implement actual SMS sending here
}

function sendApprovalEmail($email, $name, $uniqueId, $applicationId) {
    // In real implementation, send email
    error_log("Approval email to $email for application $applicationId with unique ID $uniqueId");
    
    $subject = "Housing Application Approved - $applicationId";
    $message = "
        Dear $name,
        
        Congratulations! Your housing application has been APPROVED.
        
        Application ID: $applicationId
        Unique ID: $uniqueId
        
        Next Steps:
        1. Visit our portal and check your application status
        2. Add your bank details using your Unique ID
        3. Wait for subsidy transfer notification
        
        Thank you,
        Andhra Pradesh Housing Corporation
    ";
    
    // Implement actual email sending here
}
?>