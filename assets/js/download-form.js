// Download Form functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeDownloadForm();
});

function initializeDownloadForm() {
    const form = document.getElementById('downloadForm');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendOtpBtn = document.getElementById('resendOtp');
    
    if (form) {
        form.addEventListener('submit', handleDownloadFormSubmission);
    }
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyAndSendOTP);
    }
    
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleResendOTP);
    }
    
    // Add form validation
    addDownloadFormValidation();
}

function addDownloadFormValidation() {
    // Aadhar number formatting
    const aadharInput = document.getElementById('aadharNumber');
    if (aadharInput) {
        aadharInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 12) {
                value = value.substring(0, 12);
            }
            // Format as XXXX XXXX XXXX
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });
    }
    
    // Mobile number validation
    const mobileInput = document.getElementById('mobileNumber');
    if (mobileInput) {
        mobileInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    }
    
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

async function handleVerifyAndSendOTP() {
    const uniqueId = document.getElementById('uniqueId').value.trim();
    const aadharNumber = document.getElementById('aadharNumber').value.replace(/\s/g, '');
    const mobileNumber = document.getElementById('mobileNumber').value.trim();
    
    // Validation
    if (!uniqueId || uniqueId.length < 5) {
        showNotification('Please enter a valid Unique ID', 'error');
        return;
    }
    
    if (!aadharNumber || aadharNumber.length !== 12) {
        showNotification('Please enter a valid 12-digit Aadhar number', 'error');
        return;
    }
    
    if (!mobileNumber || mobileNumber.length !== 10) {
        showNotification('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyBtn');
    const originalText = showLoading(verifyBtn);
    
    try {
        const response = await fetch('php/verify_download_details.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uniqueId: uniqueId,
                aadharNumber: aadharNumber,
                mobileNumber: mobileNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('downloadBtn').disabled = false;
            verifyBtn.style.display = 'none';
            showNotification('Details verified! OTP sent to your mobile number');
            startOTPTimer();
        } else {
            showNotification(result.message || 'Verification failed', 'error');
        }
    } catch (error) {
        console.error('Error verifying details:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(verifyBtn, originalText);
    }
}

async function handleResendOTP() {
    const mobileNumber = document.getElementById('mobileNumber').value.trim();
    const resendBtn = document.getElementById('resendOtp');
    const originalText = showLoading(resendBtn);
    
    try {
        const response = await fetch('php/send_otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: mobileNumber,
                resend: true,
                purpose: 'download'
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

async function handleDownloadFormSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        uniqueId: formData.get('uniqueId'),
        aadharNumber: formData.get('aadharNumber').replace(/\s/g, ''),
        mobileNumber: formData.get('mobileNumber'),
        otp: formData.get('otp')
    };
    
    // Validation
    if (!data.otp || data.otp.length !== 6) {
        showNotification('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('downloadBtn');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/verify_download_otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Hide form and show download success
            document.querySelector('.download-form-container').style.display = 'none';
            document.getElementById('downloadSuccess').style.display = 'block';
            showNotification('Verification successful! You can now download your documents');
        } else {
            showNotification(result.message || 'OTP verification failed', 'error');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function downloadDocument(documentType) {
    // Create a download link for the specific document
    const documentUrls = {
        'application-form': 'php/generate_application_form.php',
        'eligibility-certificate': 'php/generate_eligibility_certificate.php',
        'payment-receipt': 'php/generate_payment_receipt.php',
        'terms-conditions': 'php/generate_terms_conditions.php'
    };
    
    const url = documentUrls[documentType];
    if (url) {
        // Get user details for document generation
        const uniqueId = document.getElementById('uniqueId').value;
        const downloadUrl = `${url}?uniqueId=${encodeURIComponent(uniqueId)}`;
        
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${documentType}-${uniqueId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`${documentType.replace('-', ' ')} downloaded successfully`);
    }
}

function downloadAllDocuments() {
    const documentTypes = ['application-form', 'eligibility-certificate', 'payment-receipt', 'terms-conditions'];
    
    documentTypes.forEach((type, index) => {
        setTimeout(() => {
            downloadDocument(type);
        }, index * 1000); // Stagger downloads by 1 second
    });
    
    showNotification('All documents download started. Please check your downloads folder.');
}

// Export functions
window.downloadDocument = downloadDocument;
window.downloadAllDocuments = downloadAllDocuments;