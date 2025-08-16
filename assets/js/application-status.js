// Application Status functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeStatusChecker();
});

function initializeStatusChecker() {
    const phoneForm = document.getElementById('phoneStatusForm');
    const transactionForm = document.getElementById('transactionStatusForm');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const resendOtpBtn = document.getElementById('resendOtp');
    
    if (phoneForm) {
        phoneForm.addEventListener('submit', handlePhoneStatusCheck);
    }
    
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionStatusCheck);
    }
    
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', handleSendOTP);
    }
    
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleResendOTP);
    }
    
    // Add form validation
    addStatusFormValidation();
}

function switchMethod(method) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.method-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.method-form').forEach(form => form.classList.remove('active'));
    
    // Add active class to selected tab and form
    event.target.classList.add('active');
    document.getElementById(method + 'Method').classList.add('active');
    
    // Hide status result
    document.getElementById('statusResult').style.display = 'none';
}

function addStatusFormValidation() {
    // Phone number validation
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    });
    
    // Pincode validation
    const pincodeInputs = document.querySelectorAll('input[name="pincode"], input[name="pincodeTxn"]');
    pincodeInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            e.target.value = value;
        });
    });
    
    // OTP validation
    const otpInput = document.getElementById('otp');
    if (otpInput) {
        otpInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            e.target.value = value;
        });
    }
}

async function handleSendOTP() {
    const fullName = document.getElementById('fullName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const district = document.getElementById('district').value;
    const pincode = document.getElementById('pincode').value.trim();
    
    // Validation
    if (!fullName || fullName.length < 2) {
        showNotification('Please enter a valid full name', 'error');
        return;
    }
    
    if (!phoneNumber || phoneNumber.length !== 10) {
        showNotification('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (!district) {
        showNotification('Please select your district', 'error');
        return;
    }
    
    if (!pincode || pincode.length !== 6) {
        showNotification('Please enter a valid 6-digit pincode', 'error');
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
                purpose: 'status_check',
                fullName: fullName,
                district: district,
                pincode: pincode
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('checkStatusBtn').disabled = false;
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
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
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
                resend: true,
                purpose: 'status_check'
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

async function handlePhoneStatusCheck(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        fullName: formData.get('fullName'),
        phoneNumber: formData.get('phoneNumber'),
        district: formData.get('district'),
        pincode: formData.get('pincode'),
        otp: formData.get('otp')
    };
    
    // Validation
    if (!data.otp || data.otp.length !== 6) {
        showNotification('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('checkStatusBtn');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/check_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'phone',
                ...data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayStatusResult(result.data);
        } else {
            showNotification(result.message || 'Failed to check status', 'error');
        }
    } catch (error) {
        console.error('Error checking status:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

async function handleTransactionStatusCheck(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        transactionId: formData.get('transactionId'),
        fullName: formData.get('fullNameTxn'),
        district: formData.get('districtTxn'),
        pincode: formData.get('pincodeTxn')
    };
    
    // Validation
    if (!data.transactionId || data.transactionId.length < 5) {
        showNotification('Please enter a valid transaction ID', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/check_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'transaction',
                ...data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayStatusResult(result.data);
        } else {
            showNotification(result.message || 'Failed to check status', 'error');
        }
    } catch (error) {
        console.error('Error checking status:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function displayStatusResult(data) {
    const statusResult = document.getElementById('statusResult');
    
    // Update application details
    document.getElementById('applicationId').textContent = data.applicationId || '-';
    document.getElementById('uniqueId').textContent = data.uniqueId || 'Not Generated';
    document.getElementById('transactionIdResult').textContent = data.transactionId || '-';
    
    // Update status badge
    const statusBadge = document.getElementById('currentStatus');
    statusBadge.textContent = data.status || 'Unknown';
    statusBadge.className = `status-badge ${data.status?.toLowerCase() || 'pending'}`;
    
    // Update timeline based on status
    updateTimeline(data);
    
    // Show bank details button if approved
    const bankDetailsSection = document.getElementById('bankDetailsSection');
    if (data.status === 'approved') {
        bankDetailsSection.style.display = 'block';
    } else {
        bankDetailsSection.style.display = 'none';
    }
    
    // Show result
    statusResult.style.display = 'block';
    statusResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateTimeline(data) {
    const timelineItems = {
        payment: document.getElementById('paymentTimeline'),
        review: document.getElementById('reviewTimeline'),
        approval: document.getElementById('approvalTimeline')
    };
    
    const dates = {
        submitted: document.getElementById('submittedDate'),
        payment: document.getElementById('paymentDate'),
        review: document.getElementById('reviewDate'),
        approval: document.getElementById('approvalDate')
    };
    
    // Update dates
    dates.submitted.textContent = data.submittedDate || new Date().toLocaleDateString();
    dates.payment.textContent = data.paymentDate || '-';
    dates.review.textContent = data.reviewDate || '-';
    dates.approval.textContent = data.approvalDate || '-';
    
    // Update timeline completion
    const status = data.status?.toLowerCase();
    
    // Reset all timeline items
    Object.values(timelineItems).forEach(item => {
        item.classList.remove('completed');
    });
    
    // Mark completed items based on status
    if (status === 'paid' || status === 'under_review' || status === 'approved') {
        timelineItems.payment.classList.add('completed');
        dates.payment.textContent = data.paymentDate || 'Completed';
    }
    
    if (status === 'under_review' || status === 'approved') {
        timelineItems.review.classList.add('completed');
        dates.review.textContent = data.reviewDate || 'In Progress';
    }
    
    if (status === 'approved') {
        timelineItems.approval.classList.add('completed');
        dates.approval.textContent = data.approvalDate || 'Approved';
    }
}

// Export functions
window.switchMethod = switchMethod;