// Login functionality for admin and worker portals

document.addEventListener('DOMContentLoaded', function() {
    initializeLoginForms();
});

function initializeLoginForms() {
    // Admin login form
    const adminForm = document.getElementById('adminLoginForm');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }

    // Worker login form
    const workerForm = document.getElementById('workerLoginForm');
    if (workerForm) {
        workerForm.addEventListener('submit', handleWorkerLogin);
    }

    // Add real-time validation
    addLoginValidation();
}

function addLoginValidation() {
    // Username/Worker ID validation
    const usernameInputs = document.querySelectorAll('#username, #workerId');
    usernameInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateUsername(this);
        });
        
        input.addEventListener('input', function() {
            clearLoginError(this);
        });
    });

    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validatePassword(this);
        });
        
        input.addEventListener('input', function() {
            clearLoginError(this);
        });
    });
}

function validateUsername(input) {
    const value = input.value.trim();
    const errorElement = document.getElementById(input.id + 'Error');
    
    if (!value) {
        showLoginError(input, errorElement, 'This field is required');
        return false;
    }
    
    if (value.length < 3) {
        showLoginError(input, errorElement, 'Must be at least 3 characters long');
        return false;
    }
    
    clearLoginError(input);
    return true;
}

function validatePassword(input) {
    const value = input.value;
    const errorElement = document.getElementById('passwordError');
    
    if (!value) {
        showLoginError(input, errorElement, 'Password is required');
        return false;
    }
    
    if (value.length < 6) {
        showLoginError(input, errorElement, 'Password must be at least 6 characters long');
        return false;
    }
    
    clearLoginError(input);
    return true;
}

function showLoginError(input, errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    input.style.borderColor = '#dc2626';
}

function clearLoginError(input) {
    const errorElement = document.getElementById(input.id + 'Error') || 
                        document.getElementById('passwordError');
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    input.style.borderColor = 'rgba(255,255,255,0.2)';
}

async function handleAdminLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    const remember = form.remember.checked;
    
    // Validate form
    if (!validateLoginForm(form)) {
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/admin_login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                remember: remember
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Login successful! Redirecting...');
            
            // Store session data
            if (remember) {
                localStorage.setItem('adminSession', JSON.stringify({
                    username: username,
                    loginTime: new Date().toISOString()
                }));
            }
            
            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
            
        } else {
            showNotification(result.message || 'Invalid credentials', 'error');
            
            // Add shake animation to form
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

async function handleWorkerLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const workerId = form.workerId.value.trim();
    const password = form.password.value;
    const remember = form.remember.checked;
    
    // Validate form
    if (!validateLoginForm(form)) {
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/worker_login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                workerId: workerId,
                password: password,
                remember: remember
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Login successful! Redirecting...');
            
            // Store session data
            if (remember) {
                localStorage.setItem('workerSession', JSON.stringify({
                    workerId: workerId,
                    loginTime: new Date().toISOString()
                }));
            }
            
            // Redirect to worker dashboard
            setTimeout(() => {
                window.location.href = 'worker-dashboard.html';
            }, 1500);
            
        } else {
            showNotification(result.message || 'Invalid credentials', 'error');
            
            // Add shake animation to form
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function validateLoginForm(form) {
    let isValid = true;
    
    // Validate username/worker ID
    const usernameField = form.querySelector('#username, #workerId');
    if (usernameField && !validateUsername(usernameField)) {
        isValid = false;
    }
    
    // Validate password
    const passwordField = form.querySelector('input[type="password"]');
    if (passwordField && !validatePassword(passwordField)) {
        isValid = false;
    }
    
    return isValid;
}

// Add shake animation CSS
const shakeCSS = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .shake {
        animation: shake 0.5s ease-in-out;
    }
`;

// Add CSS to document
const style = document.createElement('style');
style.textContent = shakeCSS;
document.head.appendChild(style);

// Check for existing sessions on page load
document.addEventListener('DOMContentLoaded', function() {
    checkExistingSession();
});

function checkExistingSession() {
    const adminSession = localStorage.getItem('adminSession');
    const workerSession = localStorage.getItem('workerSession');
    
    if (adminSession && window.location.pathname.includes('admin-login.html')) {
        try {
            const session = JSON.parse(adminSession);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            // Session valid for 24 hours
            if (hoursDiff < 24) {
                showNotification('Existing session found. Redirecting...');
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } else {
                localStorage.removeItem('adminSession');
            }
        } catch (error) {
            localStorage.removeItem('adminSession');
        }
    }
    
    if (workerSession && window.location.pathname.includes('worker-login.html')) {
        try {
            const session = JSON.parse(workerSession);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            // Session valid for 24 hours
            if (hoursDiff < 24) {
                showNotification('Existing session found. Redirecting...');
                setTimeout(() => {
                    window.location.href = 'worker-dashboard.html';
                }, 1000);
            } else {
                localStorage.removeItem('workerSession');
            }
        } catch (error) {
            localStorage.removeItem('workerSession');
        }
    }
}

// Logout functionality
function logout(userType) {
    if (userType === 'admin') {
        localStorage.removeItem('adminSession');
    } else if (userType === 'worker') {
        localStorage.removeItem('workerSession');
    }
    
    showNotification('Logged out successfully');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Export logout function
window.logout = logout;