<?php
require_once 'config.php';

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method');
}

try {
    // Get form data
    $uniqueId = sanitizeInput($_POST['uniqueIdBank'] ?? '');
    $bankName = sanitizeInput($_POST['bankName'] ?? '');
    $ifscCode = sanitizeInput($_POST['ifscCode'] ?? '');
    $branchName = sanitizeInput($_POST['branchName'] ?? '');
    $accountNumber = sanitizeInput($_POST['accountNumber'] ?? '');
    $accountHolderName = sanitizeInput($_POST['accountHolderName'] ?? '');
    $village = sanitizeInput($_POST['village'] ?? '');
    $district = sanitizeInput($_POST['districtBank'] ?? '');
    $pincode = sanitizeInput($_POST['pincodeBank'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($uniqueId)) {
        $errors[] = 'Unique ID is required';
    }
    
    if (empty($bankName)) {
        $errors[] = 'Bank name is required';
    }
    
    if (empty($ifscCode) || !preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifscCode)) {
        $errors[] = 'Valid IFSC code is required';
    }
    
    if (empty($branchName)) {
        $errors[] = 'Branch name is required';
    }
    
    if (empty($accountNumber) || strlen($accountNumber) < 9 || strlen($accountNumber) > 18) {
        $errors[] = 'Valid account number is required (9-18 digits)';
    }
    
    if (empty($accountHolderName)) {
        $errors[] = 'Account holder name is required';
    }
    
    if (empty($village)) {
        $errors[] = 'Village is required';
    }
    
    if (empty($district)) {
        $errors[] = 'District is required';
    }
    
    if (empty($pincode) || strlen($pincode) !== 6) {
        $errors[] = 'Valid 6-digit pincode is required';
    }
    
    if (!empty($errors)) {
        sendResponse(false, implode(', ', $errors));
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Verify unique ID exists and is approved
    $stmt = $db->prepare("
        SELECT r.id, r.application_id, r.full_name
        FROM registrations r
        JOIN admin_applications aa ON r.application_id = aa.application_id
        WHERE aa.unique_id = ? AND aa.status = 'approved'
    ");
    $stmt->execute([$uniqueId]);
    $application = $stmt->fetch();
    
    if (!$application) {
        sendResponse(false, 'Invalid unique ID or application not approved');
    }
    
    // Check if bank details already exist
    $stmt = $db->prepare("SELECT id FROM bank_details WHERE unique_id = ?");
    $stmt->execute([$uniqueId]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Bank details already submitted for this application');
    }
    
    // Encrypt sensitive data (AES-256)
    $encryptionKey = hash('sha256', JWT_SECRET . $uniqueId);
    $accountNumberEncrypted = openssl_encrypt($accountNumber, 'AES-256-CBC', $encryptionKey, 0, substr($encryptionKey, 0, 16));
    $ifscCodeEncrypted = openssl_encrypt($ifscCode, 'AES-256-CBC', $encryptionKey, 0, substr($encryptionKey, 0, 16));
    
    // Insert bank details with encryption
    $stmt = $db->prepare("
        INSERT INTO bank_details (
            unique_id, application_id, bank_name, ifsc_code_encrypted, 
            branch_name, account_number_encrypted, account_holder_name, 
            village, district, pincode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $uniqueId,
        $application['application_id'],
        $bankName,
        $ifscCodeEncrypted,
        $branchName,
        $accountNumberEncrypted,
        $accountHolderName,
        $village,
        $district,
        $pincode
    ]);
    
    $bankDetailsId = $db->lastInsertId();
    
    // Log activity with security notice
    logActivity($application['id'], 'applicant', 'BANK_DETAILS_SUBMITTED', "Encrypted bank details submitted for {$application['application_id']}");
    
    // Update application status
    $stmt = $db->prepare("
        UPDATE admin_applications 
        SET bank_details_submitted = TRUE, updated_at = NOW() 
        WHERE unique_id = ?
    ");
    $stmt->execute([$uniqueId]);
    
    sendResponse(true, 'Bank details submitted successfully with AES-256 encryption', [
        'bankDetailsId' => $bankDetailsId
    ]);
    
} catch (Exception $e) {
    error_log("Bank details submission error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while submitting bank details. Please try again.');
}
?>