// Contact form functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeContactForm();
});

function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) return;
    
    // Add form validation
    addContactFormValidation(contactForm);
    
    // Handle form submission
    contactForm.addEventListener('submit', handleContactFormSubmission);
    
    // Auto-save form data
    addAutoSave(contactForm);
}

function addContactFormValidation(form) {
    const validators = {
        firstName: validateName,
        lastName: validateName,
        email: validateEmail,
        phone: validatePhone,
        subject: validateSubject,
        message: validateMessage
    };
    
    // Add real-time validation
    Object.keys(validators).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.addEventListener('blur', () => {
                validateContactField(fieldName, field.value, validators[fieldName]);
            });
            
            field.addEventListener('input', () => {
                clearContactError(fieldName);
            });
        }
    });
}

function validateName(value) {
    if (!value || value.trim().length < 2) {
        return 'Name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'Name should only contain letters and spaces';
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

function validatePhone(value) {
    if (!value) {
        return 'Phone number is required';
    }
    const cleanPhone = value.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return 'Phone number must be 10 digits';
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return 'Please enter a valid Indian mobile number';
    }
    return null;
}

function validateSubject(value) {
    if (!value) {
        return 'Please select a subject';
    }
    return null;
}

function validateMessage(value) {
    if (!value || value.trim().length < 10) {
        return 'Message must be at least 10 characters long';
    }
    if (value.trim().length > 1000) {
        return 'Message must be less than 1000 characters';
    }
    return null;
}

function validateContactField(fieldName, value, validator) {
    const error = validator(value);
    if (error) {
        showContactError(fieldName, error);
        return false;
    } else {
        clearContactError(fieldName);
        return true;
    }
}

function showContactError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add error message
    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.color = '#dc2626';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.style.display = 'block';
    
    field.parentNode.appendChild(errorElement);
    field.style.borderColor = '#dc2626';
}

function clearContactError(fieldName) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    const errorElement = field.parentNode.querySelector('.error-message');
    
    if (errorElement) {
        errorElement.remove();
    }
    
    field.style.borderColor = '#e5e7eb';
}

function validateContactForm(form) {
    const formData = new FormData(form);
    let isValid = true;
    
    const validators = {
        firstName: validateName,
        lastName: validateName,
        email: validateEmail,
        phone: validatePhone,
        subject: validateSubject,
        message: validateMessage
    };
    
    Object.keys(validators).forEach(fieldName => {
        const value = formData.get(fieldName);
        if (!validateContactField(fieldName, value, validators[fieldName])) {
            isValid = false;
        }
    });
    
    return isValid;
}

async function handleContactFormSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    
    if (!validateContactForm(form)) {
        showNotification('Please fix the errors in the form', 'error');
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    const formData = new FormData(form);
    
    try {
        const response = await fetch('php/contact.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Message sent successfully! We will get back to you soon.');
            form.reset();
            clearAllContactErrors();
            
            // Clear auto-saved data
            localStorage.removeItem('contactFormData');
            
        } else {
            showNotification(result.message || 'Failed to send message', 'error');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function clearAllContactErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => error.remove());
    
    const inputs = document.querySelectorAll('#contactForm input, #contactForm select, #contactForm textarea');
    inputs.forEach(input => {
        input.style.borderColor = '#e5e7eb';
    });
}

// Auto-save functionality
function addAutoSave(form) {
    const saveFormData = debounce(() => {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        localStorage.setItem('contactFormData', JSON.stringify(data));
    }, 1000);
    
    form.addEventListener('input', saveFormData);
    
    // Load saved data on page load
    loadSavedContactData(form);
}

function loadSavedContactData(form) {
    const savedData = localStorage.getItem('contactFormData');
    if (!savedData) return;
    
    try {
        const data = JSON.parse(savedData);
        
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field && data[key]) {
                field.value = data[key];
            }
        });
        
        // Show notification about restored data
        showNotification('Previous form data restored', 'info');
        
    } catch (error) {
        console.error('Error loading saved contact form data:', error);
        localStorage.removeItem('contactFormData');
    }
}

// Phone number formatting
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.querySelector('#contactForm input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    }
});

// Character counter for message field
document.addEventListener('DOMContentLoaded', function() {
    const messageField = document.querySelector('#contactForm textarea[name="message"]');
    if (messageField) {
        // Create character counter
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.style.textAlign = 'right';
        counter.style.fontSize = '0.875rem';
        counter.style.color = '#6b7280';
        counter.style.marginTop = '0.25rem';
        
        messageField.parentNode.appendChild(counter);
        
        // Update counter
        const updateCounter = () => {
            const length = messageField.value.length;
            counter.textContent = `${length}/1000 characters`;
            
            if (length > 1000) {
                counter.style.color = '#dc2626';
            } else if (length > 800) {
                counter.style.color = '#f59e0b';
            } else {
                counter.style.color = '#6b7280';
            }
        };
        
        messageField.addEventListener('input', updateCounter);
        updateCounter(); // Initial update
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

// Add notification styles for info type
document.addEventListener('DOMContentLoaded', function() {
    const existingStyles = document.querySelector('.notification-styles');
    if (existingStyles) {
        existingStyles.textContent += `
            .notification.info {
                border-left: 4px solid #3b82f6;
            }
            .notification.info i:first-child {
                color: #3b82f6;
            }
        `;
    }
});