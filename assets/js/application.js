// Application form functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeApplicationForm();
});

function initializeApplicationForm() {
    const form = document.getElementById('applicationForm');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const submitBtn = document.getElementById('submitBtn');
    const otpSection = document.getElementById('otpSection');
    const resendOtpBtn = document.getElementById('resendOtp');
    
    if (!form) return;

    // Form validation
    const validators = {
        fullName: validateFullName,
        aadharNumber: validateAadhar,
        phoneNumber: validatePhone,
        email: validateEmail,
        district: validateDistrict,
        income: validateIncome,
        address: validateAddress,
        otp: validateOTP
    };

    // Add real-time validation
    Object.keys(validators).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.addEventListener('blur', () => validateField(fieldName, field.value));
            field.addEventListener('input', () => clearError(fieldName));
        }
    });

    // Send OTP functionality
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', handleSendOTP);
    }

    // Resend OTP functionality
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleResendOTP);
    }

    // Form submission
    form.addEventListener('submit', handleFormSubmission);
}

// Validation functions
function validateFullName(value) {
    if (!value || value.trim().length < 2) {
        return 'Full name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'Full name should only contain letters and spaces';
    }
    return null;
}

function validateAadhar(value) {
    const cleanValue = value.replace(/\s/g, '');
    if (!cleanValue) {
        return 'Aadhar number is required';
    }
    if (cleanValue.length !== 12) {
        return 'Aadhar number must be 12 digits';
    }
    if (!/^\d{12}$/.test(cleanValue)) {
        return 'Aadhar number should only contain digits';
    }
    return null;
}

function validatePhone(value) {
    if (!value) {
        return 'Phone number is required';
    }
    if (value.length !== 10) {
        return 'Phone number must be 10 digits';
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
        return 'Please enter a valid Indian mobile number';
    }
    return null;
}

function validateEmail(value) {
    if (!value) {
        return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
    }
    return null;
}

function validateDistrict(value) {
    if (!value) {
        return 'Please select your district';
    }
    return null;
}

function validateIncome(value) {
    if (!value) {
        return 'Please select your income range';
    }
    return null;
}

function validateAddress(value) {
    if (!value || value.trim().length < 10) {
        return 'Address must be at least 10 characters long';
    }
    return null;
}

function validateOTP(value) {
    if (!value) {
        return 'OTP is required';
    }
    if (value.length !== 6) {
        return 'OTP must be 6 digits';
    }
    if (!/^\d{6}$/.test(value)) {
        return 'OTP should only contain digits';
    }
    return null;
}

// Validation helper functions
function validateField(fieldName, value) {
    const validator = {
        fullName: validateFullName,
        aadharNumber: validateAadhar,
        phoneNumber: validatePhone,
        email: validateEmail,
        district: validateDistrict,
        income: validateIncome,
        address: validateAddress,
        otp: validateOTP
    }[fieldName];

    if (validator) {
        const error = validator(value);
        if (error) {
            showError(fieldName, error);
            return false;
        } else {
            clearError(fieldName);
            return true;
        }
    }
    return true;
}

function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.querySelector(`[name="${fieldName}"]`);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    if (inputElement) {
        inputElement.style.borderColor = '#dc2626';
    }
}

function clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.querySelector(`[name="${fieldName}"]`);
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    if (inputElement) {
        inputElement.style.borderColor = '#e5e7eb';
    }
}

function validateForm() {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    let isValid = true;

    // Validate all required fields
    const requiredFields = ['fullName', 'aadharNumber', 'phoneNumber', 'email', 'district', 'income', 'address'];
    
    requiredFields.forEach(fieldName => {
        const value = formData.get(fieldName);
        if (!validateField(fieldName, value)) {
            isValid = false;
        }
    });

    // If OTP section is visible, validate OTP
    const otpSection = document.getElementById('otpSection');
    if (otpSection && otpSection.style.display !== 'none') {
        const otpValue = formData.get('otp');
        if (!validateField('otp', otpValue)) {
            isValid = false;
        }
    }

    return isValid;
}

// OTP handling
async function handleSendOTP() {
    const phoneNumber = document.querySelector('[name="phoneNumber"]').value;
    const aadharNumber = document.querySelector('[name="aadharNumber"]').value;
    
    // Validate phone and aadhar before sending OTP
    if (!validateField('phoneNumber', phoneNumber) || !validateField('aadharNumber', aadharNumber)) {
        showNotification('Please enter valid phone number and Aadhar number', 'error');
        return;
    }

    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const originalText = showLoading(sendOtpBtn);

    try {
        const response = await fetch('php/send_otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                aadharNumber: aadharNumber.replace(/\s/g, '')
            })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('submitBtn').disabled = false;
            sendOtpBtn.style.display = 'none';
            showNotification('OTP sent successfully to your mobile number');
            startOTPTimer();
        } else {
            showNotification(result.message || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(sendOtpBtn, originalText);
    }
}

async function handleResendOTP() {
    const phoneNumber = document.querySelector('[name="phoneNumber"]').value;
    const resendBtn = document.getElementById('resendOtp');
    const originalText = showLoading(resendBtn);

    try {
        const response = await fetch('php/send_otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                resend: true
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('OTP resent successfully');
            startOTPTimer();
        } else {
            showNotification(result.message || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(resendBtn, originalText);
    }
}

function startOTPTimer() {
    const resendBtn = document.getElementById('resendOtp');
    let timeLeft = 60;
    
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend OTP (${timeLeft}s)`;
    
    const timer = setInterval(() => {
        timeLeft--;
        resendBtn.textContent = `Resend OTP (${timeLeft}s)`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend OTP';
        }
    }, 1000);
}

// Form submission
async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        showNotification('Please fix the errors in the form', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = showLoading(submitBtn);
    const formData = new FormData(event.target);

    try {
        const response = await fetch('php/submit_application.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showSuccessModal(result.applicationId);
        } else {
            showNotification(result.message || 'Failed to submit application', 'error');
        }
    } catch (error) {
        console.error('Error submitting application:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function showSuccessModal(applicationId) {
    const modal = document.getElementById('successModal');
    const applicationIdSpan = document.getElementById('applicationId');
    
    if (modal && applicationIdSpan) {
        applicationIdSpan.textContent = applicationId;
        modal.style.display = 'block';
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}

// Auto-save form data to localStorage
function autoSaveForm() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    localStorage.setItem('applicationFormData', JSON.stringify(data));
}

// Load saved form data
function loadSavedFormData() {
    const savedData = localStorage.getItem('applicationFormData');
    if (!savedData) return;

    try {
        const data = JSON.parse(savedData);
        const form = document.getElementById('applicationForm');
        
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field && data[key]) {
                field.value = data[key];
            }
        });
    } catch (error) {
        console.error('Error loading saved form data:', error);
    }
}

// Auto-save on form changes
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('applicationForm');
    if (form) {
        loadSavedFormData();
        
        form.addEventListener('input', debounce(autoSaveForm, 1000));
        
        // Clear saved data on successful submission
        form.addEventListener('submit', function() {
            localStorage.removeItem('applicationFormData');
        });
    }
});

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}