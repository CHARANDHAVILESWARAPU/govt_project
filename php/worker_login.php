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
    
    $workerId = sanitizeInput($input['workerId'] ?? '');
    $password = $input['password'] ?? '';
    $remember = isset($input['remember']) && $input['remember'] === true;
    
    // Validation
    if (empty($workerId)) {
        sendResponse(false, 'Worker ID is required');
    }
    
    if (empty($password)) {
        sendResponse(false, 'Password is required');
    }
    
    if (strlen($workerId) < 3) {
        sendResponse(false, 'Worker ID must be at least 3 characters long');
    }
    
    if (strlen($password) < 6) {
        sendResponse(false, 'Password must be at least 6 characters long');
    }
    
    // Validate Worker ID format (should start with WRK)
    if (!preg_match('/^WRK\d{3,}$/i', $workerId)) {
        sendResponse(false, 'Invalid Worker ID format. Should be like WRK001, WRK002, etc.');
    }
    
    // Get database connection
    $db = Database::getInstance()->getConnection();
    
    // Check for too many failed login attempts
    $stmt = $db->prepare("
        SELECT COUNT(*) as failed_attempts 
        FROM activity_logs 
        WHERE action = 'WORKER_LOGIN_FAILED' 
        AND details LIKE ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    ");
    $stmt->execute(["%$workerId%"]);
    $result = $stmt->fetch();
    
    if ($result['failed_attempts'] >= 5) {
        sendResponse(false, 'Too many failed login attempts. Please try again after 15 minutes.');
    }
    
    // Find worker
    $stmt = $db->prepare("
        SELECT id, username, email, password, full_name, status, last_login 
        FROM users 
        WHERE username = ? AND user_type = 'worker'
    ");
    $stmt->execute([$workerId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Log failed login attempt
        logActivity(null, 'worker', 'WORKER_LOGIN_FAILED', "Failed login attempt for worker ID: $workerId");
        sendResponse(false, 'Invalid Worker ID or password');
    }
    
    // Check if user is active
    if ($user['status'] !== 'active') {
        logActivity($user['id'], 'worker', 'WORKER_LOGIN_BLOCKED', "Login blocked for inactive worker: $workerId");
        sendResponse(false, 'Account is inactive. Please contact administrator.');
    }
    
    // Verify password
    if (!verifyPassword($password, $user['password'])) {
        // Log failed login attempt
        logActivity($user['id'], 'worker', 'WORKER_LOGIN_FAILED', "Invalid password for worker ID: $workerId");
        sendResponse(false, 'Invalid Worker ID or password');
    }
    
    // Update last login
    $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    // Create session
    $_SESSION['worker_id'] = $user['id'];
    $_SESSION['worker_username'] = $user['username'];
    $_SESSION['worker_name'] = $user['full_name'];
    $_SESSION['worker_email'] = $user['email'];
    $_SESSION['login_time'] = time();
    
    // Log successful login
    logActivity($user['id'], 'worker', 'WORKER_LOGIN_SUCCESS', "Successful login for worker ID: $workerId");
    
    // Prepare response data
    $responseData = [
        'user' => [
            'id' => $user['id'],
            'worker_id' => $user['username'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'last_login' => $user['last_login']
        ],
        'session_id' => session_id()
    ];
    
    sendResponse(true, 'Login successful', $responseData);
    
} catch (Exception $e) {
    error_log("Worker login error: " . $e->getMessage());
    sendResponse(false, 'An error occurred during login. Please try again.');
}
?>