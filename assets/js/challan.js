// Challan page functionality

document.addEventListener('DOMContentLoaded', function() {
    loadApplicationData();
    initializePaymentMethods();
});

function loadApplicationData() {
    const applicationData = sessionStorage.getItem('applicationData');
    
    if (applicationData) {
        try {
            const data = JSON.parse(applicationData);
            
            // Populate application details
            document.getElementById('applicationId').textContent = data.applicationId || 'APP2025000001';
            document.getElementById('applicantName').textContent = data.fullName || 'Loading...';
            document.getElementById('phoneNumber').textContent = data.phoneNumber || 'Loading...';
            document.getElementById('email').textContent = data.email || 'Loading...';
            document.getElementById('district').textContent = data.district || 'Loading...';
            document.getElementById('applicationDate').textContent = new Date().toLocaleDateString('en-IN');
            
        } catch (error) {
            console.error('Error loading application data:', error);
        }
    }
}

function initializePaymentMethods() {
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePayment);
    }
    
    // Format card number input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            if (formattedValue.length > 19) formattedValue = formattedValue.substring(0, 19);
            e.target.value = formattedValue;
        });
    }
    
    // Format expiry date input
    const expiryInput = document.getElementById('expiryDate');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Format CVV input
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });
    }
}

function selectPaymentMethod(method) {
    // Remove previous selections
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to clicked option
    event.target.closest('.payment-option').classList.add('selected');
    
    // Hide all payment forms
    document.querySelectorAll('.payment-form-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show payment form container
    document.getElementById('paymentFormContainer').style.display = 'block';
    
    // Show relevant payment form
    switch (method) {
        case 'debit':
        case 'credit':
            document.getElementById('cardForm').style.display = 'block';
            break;
        case 'upi':
            document.getElementById('upiForm').style.display = 'block';
            break;
        case 'netbanking':
            document.getElementById('netbankingForm').style.display = 'block';
            break;
        case 'qr':
            document.getElementById('qrForm').style.display = 'block';
            break;
    }
}

async function handlePayment(event) {
    event.preventDefault();
    
    const paymentBtn = event.target.querySelector('.payment-btn');
    const originalText = showLoading(paymentBtn);
    
    try {
        // Get selected payment method
        const selectedMethod = document.querySelector('.payment-option.selected');
        if (!selectedMethod) {
            showNotification('Please select a payment method', 'error');
            return;
        }
        
        // Validate payment form based on method
        if (!validatePaymentForm()) {
            return;
        }
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Generate transaction ID
        const transactionId = 'TXN' + Date.now();
        
        // Store payment data
        const paymentData = {
            transactionId: transactionId,
            amount: 750.00,
            paymentDate: new Date().toLocaleString('en-IN'),
            status: 'Success',
            applicationData: JSON.parse(sessionStorage.getItem('applicationData') || '{}')
        };
        
        // Save to backend
        const response = await fetch('php/process_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store payment data for receipt
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
            
            // Show success modal
            showPaymentSuccess(paymentData);
        } else {
            showNotification('Payment processing failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed. Please try again.', 'error');
    } finally {
        hideLoading(paymentBtn, originalText);
    }
}

function validatePaymentForm() {
    const selectedMethod = document.querySelector('.payment-option.selected');
    const methodText = selectedMethod.textContent.trim().toLowerCase();
    
    if (methodText.includes('card')) {
        // Validate card details
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        const cardName = document.getElementById('cardName').value;
        
        if (!cardNumber || cardNumber.length < 16) {
            showNotification('Please enter a valid card number', 'error');
            return false;
        }
        
        if (!expiryDate || expiryDate.length < 5) {
            showNotification('Please enter a valid expiry date', 'error');
            return false;
        }
        
        if (!cvv || cvv.length < 3) {
            showNotification('Please enter a valid CVV', 'error');
            return false;
        }
        
        if (!cardName) {
            showNotification('Please enter cardholder name', 'error');
            return false;
        }
        
    } else if (methodText.includes('upi')) {
        // Validate UPI ID
        const upiId = document.getElementById('upiId').value;
        if (!upiId || !upiId.includes('@')) {
            showNotification('Please enter a valid UPI ID', 'error');
            return false;
        }
        
    } else if (methodText.includes('banking')) {
        // Validate bank selection
        const bankSelect = document.getElementById('bankSelect').value;
        if (!bankSelect) {
            showNotification('Please select your bank', 'error');
            return false;
        }
    }
    
    return true;
}

function showPaymentSuccess(paymentData) {
    const modal = document.getElementById('paymentSuccessModal');
    
    // Update modal content
    document.getElementById('transactionId').textContent = paymentData.transactionId;
    document.getElementById('paymentDate').textContent = paymentData.paymentDate;
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function downloadReceipt() {
    const paymentData = JSON.parse(sessionStorage.getItem('paymentData') || '{}');
    const applicationData = paymentData.applicationData || {};
    
    // Create receipt content
    const receiptContent = `
        GOVERNMENT HOUSING PORTAL
        PAYMENT RECEIPT
        
        Transaction ID: ${paymentData.transactionId}
        Date: ${paymentData.paymentDate}
        
        Applicant Details:
        Name: ${applicationData.fullName || 'N/A'}
        Phone: ${applicationData.phoneNumber || 'N/A'}
        Application ID: ${applicationData.applicationId || 'N/A'}
        
        Payment Details:
        Application Processing Fee: ₹500.00
        Document Verification Fee: ₹200.00
        Service Charges: ₹50.00
        Total Amount: ₹750.00
        
        Status: ${paymentData.status}
        
        This is a computer generated receipt.
    `;
    
    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${paymentData.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Receipt downloaded successfully');
}

// Export functions
window.selectPaymentMethod = selectPaymentMethod;
window.downloadReceipt = downloadReceipt;