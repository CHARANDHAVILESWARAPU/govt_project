// Portal login page functionality

document.addEventListener('DOMContentLoaded', function() {
    initializePortalLogin();
});

function initializePortalLogin() {
    const quickLoginForm = document.getElementById('quickLoginForm');
    const portalTypeSelect = document.getElementById('portalType');
    const submitBtn = quickLoginForm.querySelector('button[type="submit"]');
    
    // Enable/disable submit button based on portal selection
    portalTypeSelect.addEventListener('change', function() {
        if (this.value) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
    });
    
    // Handle quick login form submission
    quickLoginForm.addEventListener('submit', handleQuickLogin);
    
    // Add hover effects to portal cards
    addPortalCardEffects();
}

function addPortalCardEffects() {
    const portalCards = document.querySelectorAll('.portal-card');
    
    portalCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

async function handleQuickLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const portalType = form.portalType.value;
    const username = form.username.value.trim();
    const password = form.password.value;
    
    // Validate form
    if (!validateQuickLoginForm(form)) {
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        // Determine the correct endpoint based on portal type
        let endpoint;
        switch (portalType) {
            case 'admin':
                endpoint = 'php/admin_login.php';
                break;
            case 'worker':
                endpoint = 'php/worker_login.php';
                break;
            case 'beneficiary':
                endpoint = 'php/beneficiary_login.php';
                break;
            default:
                throw new Error('Invalid portal type');
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                workerId: username, // For worker login
                beneficiaryId: username, // For beneficiary login
                password: password,
                quickLogin: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Login successful! Redirecting...');
            
            // Store session data
            const sessionData = {
                username: username,
                portalType: portalType,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem(`${portalType}Session`, JSON.stringify(sessionData));
            
            // Redirect based on portal type
            setTimeout(() => {
                switch (portalType) {
                    case 'admin':
                        window.location.href = 'admin-dashboard.html';
                        break;
                    case 'worker':
                        window.location.href = 'worker-dashboard.html';
                        break;
                    case 'beneficiary':
                        window.location.href = 'beneficiary-dashboard.html';
                        break;
                }
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

function validateQuickLoginForm(form) {
    let isValid = true;
    
    // Validate portal type
    const portalType = form.portalType.value;
    if (!portalType) {
        showNotification('Please select a portal type', 'error');
        isValid = false;
    }
    
    // Validate username
    const username = form.username.value.trim();
    if (!username) {
        showNotification('Username/ID is required', 'error');
        isValid = false;
    } else if (username.length < 3) {
        showNotification('Username/ID must be at least 3 characters long', 'error');
        isValid = false;
    }
    
    // Validate password
    const password = form.password.value;
    if (!password) {
        showNotification('Password is required', 'error');
        isValid = false;
    } else if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Add portal-specific validation
function validatePortalCredentials(portalType, username) {
    switch (portalType) {
        case 'admin':
            // Admin usernames should be alphanumeric
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                showNotification('Admin username should only contain letters, numbers, and underscores', 'error');
                return false;
            }
            break;
            
        case 'worker':
            // Worker IDs should follow a specific pattern (e.g., WRK001)
            if (!/^WRK\d{3,}$/i.test(username)) {
                showNotification('Worker ID should be in format WRK001, WRK002, etc.', 'error');
                return false;
            }
            break;
            
        case 'beneficiary':
            // Beneficiary IDs could be Aadhar numbers or application IDs
            if (!/^(\d{12}|APP\d{6,})$/i.test(username.replace(/\s/g, ''))) {
                showNotification('Please enter a valid Aadhar number or Application ID', 'error');
                return false;
            }
            break;
    }
    
    return true;
}

// Enhanced form validation with portal-specific rules
function enhancedValidateQuickLoginForm(form) {
    let isValid = true;
    
    const portalType = form.portalType.value;
    const username = form.username.value.trim();
    const password = form.password.value;
    
    // Basic validation
    if (!portalType) {
        showNotification('Please select a portal type', 'error');
        return false;
    }
    
    if (!username) {
        showNotification('Username/ID is required', 'error');
        return false;
    }
    
    if (!password) {
        showNotification('Password is required', 'error');
        return false;
    }
    
    // Portal-specific validation
    if (!validatePortalCredentials(portalType, username)) {
        return false;
    }
    
    return isValid;
}

// Add real-time portal type change handler
document.addEventListener('DOMContentLoaded', function() {
    const portalTypeSelect = document.getElementById('portalType');
    const usernameInput = document.getElementById('username');
    const usernameLabel = document.querySelector('label[for="username"]');
    
    if (portalTypeSelect && usernameInput && usernameLabel) {
        portalTypeSelect.addEventListener('change', function() {
            const portalType = this.value;
            
            // Update placeholder and label based on portal type
            switch (portalType) {
                case 'admin':
                    usernameLabel.textContent = 'Admin Username';
                    usernameInput.placeholder = 'Enter admin username';
                    break;
                case 'worker':
                    usernameLabel.textContent = 'Worker ID';
                    usernameInput.placeholder = 'Enter worker ID (e.g., WRK001)';
                    break;
                case 'beneficiary':
                    usernameLabel.textContent = 'Aadhar Number / Application ID';
                    usernameInput.placeholder = 'Enter Aadhar number or Application ID';
                    break;
                default:
                    usernameLabel.textContent = 'Username / ID';
                    usernameInput.placeholder = 'Enter your username or ID';
            }
            
            // Clear previous input
            usernameInput.value = '';
        });
    }
});

// Add CSS for shake animation
const portalShakeCSS = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    .portal-card {
        transition: all 0.3s ease;
    }
`;

const portalStyle = document.createElement('style');
portalStyle.textContent = portalShakeCSS;
document.head.appendChild(portalStyle);