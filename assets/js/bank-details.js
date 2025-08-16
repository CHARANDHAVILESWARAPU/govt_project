// Bank Details functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeBankDetailsForm();
    loadUniqueId();
});

function initializeBankDetailsForm() {
    const form = document.getElementById('bankDetailsForm');
    
    if (form) {
        form.addEventListener('submit', handleBankDetailsSubmission);
    }
    
    // Add form validation
    addBankDetailsValidation();
}

function loadUniqueId() {
    // Get unique ID from URL parameters or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const uniqueId = urlParams.get('uniqueId') || sessionStorage.getItem('uniqueId');
    
    if (uniqueId) {
        document.getElementById('uniqueIdBank').value = uniqueId;
    } else {
        // Redirect back if no unique ID
        showNotification('Access denied. Please check your application status first.', 'error');
        setTimeout(() => {
            window.location.href = 'application-status.html';
        }, 2000);
    }
}

function addBankDetailsValidation() {
    // IFSC code validation
    const ifscInput = document.getElementById('ifscCode');
    if (ifscInput) {
        ifscInput.addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase();
            // IFSC format: 4 letters + 7 digits
            value = value.replace(/[^A-Z0-9]/g, '');
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            e.target.value = value;
        });
        
        ifscInput.addEventListener('blur', function(e) {
            const value = e.target.value;
            if (value && !validateIFSC(value)) {
                showError('ifscError', 'Invalid IFSC code format');
            } else {
                clearError('ifscError');
            }
        });
    }
    
    // Account number validation
    const accountInput = document.getElementById('accountNumber');
    if (accountInput) {
        accountInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 18) {
                value = value.substring(0, 18);
            }
            e.target.value = value;
        });
    }
    
    // Pincode validation
    const pincodeInput = document.getElementById('pincodeBank');
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            e.target.value = value;
        });
    }
}

function validateIFSC(ifsc) {
    // IFSC format: 4 letters + 0 + 6 digits
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
}

function showError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function validateBankForm(formData) {
    let isValid = true;
    
    // Validate required fields
    const requiredFields = {
        bankName: 'Bank name is required',
        ifscCode: 'IFSC code is required',
        branchName: 'Branch name is required',
        accountNumber: 'Account number is required',
        accountHolderName: 'Account holder name is required',
        village: 'Village is required',
        districtBank: 'District is required',
        pincodeBank: 'Pincode is required'
    };
    
    Object.keys(requiredFields).forEach(field => {
        const value = formData.get(field);
        if (!value || value.trim() === '') {
            showError(field + 'Error', requiredFields[field]);
            isValid = false;
        } else {
            clearError(field + 'Error');
        }
    });
    
    // Validate IFSC code
    const ifscCode = formData.get('ifscCode');
    if (ifscCode && !validateIFSC(ifscCode)) {
        showError('ifscError', 'Invalid IFSC code format');
        isValid = false;
    }
    
    // Validate account number
    const accountNumber = formData.get('accountNumber');
    if (accountNumber && (accountNumber.length < 9 || accountNumber.length > 18)) {
        showError('accountError', 'Account number must be between 9-18 digits');
        isValid = false;
    }
    
    // Validate pincode
    const pincode = formData.get('pincodeBank');
    if (pincode && pincode.length !== 6) {
        showError('pincodeBankError', 'Pincode must be 6 digits');
        isValid = false;
    }
    
    return isValid;
}

async function handleBankDetailsSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Validate form
    if (!validateBankForm(formData)) {
        showNotification('Please fix the errors in the form', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        const response = await fetch('php/submit_bank_details.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success modal
            document.getElementById('bankSuccessModal').style.display = 'block';
            
            // Clear form
            event.target.reset();
            
            showNotification('Bank details submitted successfully and securely encrypted');
        } else {
            showNotification(result.message || 'Failed to submit bank details', 'error');
        }
    } catch (error) {
        console.error('Error submitting bank details:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bankSuccessModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};