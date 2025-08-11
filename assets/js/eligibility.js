// Eligibility checker functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeEligibilityChecker();
    initializeFAQ();
});

function initializeEligibilityChecker() {
    const form = document.getElementById('eligibilityForm');
    if (form) {
        form.addEventListener('submit', handleEligibilityCheck);
    }
}

function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = question.querySelector('i');
        
        question.addEventListener('click', function() {
            const isOpen = answer.style.display === 'block';
            
            // Close all FAQ items
            faqItems.forEach(faqItem => {
                faqItem.querySelector('.faq-answer').style.display = 'none';
                faqItem.querySelector('.faq-question i').style.transform = 'rotate(0deg)';
                faqItem.classList.remove('active');
            });
            
            // Open clicked item if it was closed
            if (!isOpen) {
                answer.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
                item.classList.add('active');
            }
        });
    });
}

async function handleEligibilityCheck(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        annualIncome: formData.get('annualIncome'),
        ownHouse: formData.get('ownHouse'),
        previousBeneficiary: formData.get('previousBeneficiary'),
        category: formData.get('category')
    };
    
    // Validate form
    if (!validateEligibilityForm(data)) {
        return;
    }
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = showLoading(submitBtn);
    
    try {
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const result = checkEligibility(data);
        showEligibilityResult(result);
        
    } catch (error) {
        console.error('Eligibility check error:', error);
        showNotification('Error checking eligibility. Please try again.', 'error');
    } finally {
        hideLoading(submitBtn, originalText);
    }
}

function validateEligibilityForm(data) {
    const requiredFields = ['annualIncome', 'ownHouse', 'previousBeneficiary', 'category'];
    
    for (let field of requiredFields) {
        if (!data[field]) {
            showNotification(`Please select ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
            return false;
        }
    }
    
    return true;
}

function checkEligibility(data) {
    let eligible = true;
    let category = '';
    let subsidy = 0;
    let reasons = [];
    let recommendations = [];
    
    // Check basic eligibility
    if (data.ownHouse === 'yes') {
        eligible = false;
        reasons.push('You already own a pucca house');
    }
    
    if (data.previousBeneficiary === 'yes') {
        eligible = false;
        reasons.push('You have already availed a housing scheme benefit');
    }
    
    // Determine category and subsidy based on income
    if (eligible) {
        switch (data.annualIncome) {
            case '0-300000':
                category = 'Economically Weaker Section (EWS)';
                subsidy = 250000;
                break;
            case '300000-600000':
                category = 'Lower Income Group (LIG)';
                subsidy = 200000;
                break;
            case '600000-1200000':
                category = 'Middle Income Group (MIG-I)';
                subsidy = 0; // Interest subsidy available
                recommendations.push('Interest subsidy available on home loans');
                break;
            case '1200000+':
                eligible = false;
                reasons.push('Income exceeds the maximum limit for housing schemes');
                break;
        }
    }
    
    // Add category-specific benefits
    if (eligible && ['sc', 'st', 'minority'].includes(data.category)) {
        recommendations.push('You qualify for priority allocation');
        recommendations.push('Additional benefits may be available');
    }
    
    // Add general recommendations
    if (eligible) {
        recommendations.push('Ensure all required documents are ready');
        recommendations.push('Apply online for faster processing');
        recommendations.push('Keep your Aadhar and bank details updated');
    } else {
        recommendations.push('Check other government schemes you might be eligible for');
        recommendations.push('Contact our support team for more information');
    }
    
    return {
        eligible,
        category,
        subsidy,
        reasons,
        recommendations,
        userCategory: data.category
    };
}

function showEligibilityResult(result) {
    const resultContainer = document.getElementById('eligibilityResult');
    const resultIcon = resultContainer.querySelector('.result-icon');
    const resultTitle = resultContainer.querySelector('.result-title');
    const resultMessage = resultContainer.querySelector('.result-message');
    const resultDetails = resultContainer.querySelector('.result-details');
    const resultActions = resultContainer.querySelector('.result-actions');
    
    // Clear previous content
    resultDetails.innerHTML = '';
    resultActions.innerHTML = '';
    
    if (result.eligible) {
        // Eligible
        resultContainer.className = 'result-container eligible';
        resultIcon.className = 'result-icon fas fa-check-circle';
        resultTitle.textContent = 'Congratulations! You are eligible';
        resultMessage.textContent = `You qualify for the ${result.category} category.`;
        
        // Add details
        if (result.subsidy > 0) {
            const subsidyDiv = document.createElement('div');
            subsidyDiv.className = 'result-detail';
            subsidyDiv.innerHTML = `
                <i class="fas fa-rupee-sign"></i>
                <span>Maximum Subsidy: ₹${result.subsidy.toLocaleString()}</span>
            `;
            resultDetails.appendChild(subsidyDiv);
        }
        
        // Add recommendations
        if (result.recommendations.length > 0) {
            const recommendationsDiv = document.createElement('div');
            recommendationsDiv.className = 'recommendations';
            recommendationsDiv.innerHTML = '<h4>Next Steps:</h4>';
            
            const ul = document.createElement('ul');
            result.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                ul.appendChild(li);
            });
            
            recommendationsDiv.appendChild(ul);
            resultDetails.appendChild(recommendationsDiv);
        }
        
        // Add action buttons
        resultActions.innerHTML = `
            <a href="application.html" class="btn-primary">
                <i class="fas fa-file-alt"></i> Apply Now
            </a>
            <button onclick="downloadEligibilityReport()" class="btn-secondary">
                <i class="fas fa-download"></i> Download Report
            </button>
        `;
        
    } else {
        // Not eligible
        resultContainer.className = 'result-container not-eligible';
        resultIcon.className = 'result-icon fas fa-times-circle';
        resultTitle.textContent = 'Sorry, you are not eligible';
        resultMessage.textContent = 'Based on the information provided, you do not meet the eligibility criteria.';
        
        // Add reasons
        if (result.reasons.length > 0) {
            const reasonsDiv = document.createElement('div');
            reasonsDiv.className = 'reasons';
            reasonsDiv.innerHTML = '<h4>Reasons:</h4>';
            
            const ul = document.createElement('ul');
            result.reasons.forEach(reason => {
                const li = document.createElement('li');
                li.textContent = reason;
                ul.appendChild(li);
            });
            
            reasonsDiv.appendChild(ul);
            resultDetails.appendChild(reasonsDiv);
        }
        
        // Add recommendations
        if (result.recommendations.length > 0) {
            const recommendationsDiv = document.createElement('div');
            recommendationsDiv.className = 'recommendations';
            recommendationsDiv.innerHTML = '<h4>What you can do:</h4>';
            
            const ul = document.createElement('ul');
            result.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                ul.appendChild(li);
            });
            
            recommendationsDiv.appendChild(ul);
            resultDetails.appendChild(recommendationsDiv);
        }
        
        // Add action buttons
        resultActions.innerHTML = `
            <a href="contact.html" class="btn-primary">
                <i class="fas fa-phone"></i> Contact Support
            </a>
            <button onclick="checkAgain()" class="btn-secondary">
                <i class="fas fa-redo"></i> Check Again
            </button>
        `;
    }
    
    // Show result with animation
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add animation class
    setTimeout(() => {
        resultContainer.classList.add('show');
    }, 100);
}

function downloadEligibilityReport() {
    // In a real application, generate and download a PDF report
    showNotification('Eligibility report download feature will be available soon.');
}

function checkAgain() {
    const resultContainer = document.getElementById('eligibilityResult');
    const form = document.getElementById('eligibilityForm');
    
    // Hide result
    resultContainer.style.display = 'none';
    resultContainer.classList.remove('show');
    
    // Reset form
    form.reset();
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Add CSS for eligibility results
const eligibilityCSS = `
    .eligibility-content {
        padding: 4rem 0;
        background: white;
    }
    
    .eligibility-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }
    
    .eligibility-card {
        background: #f8fafc;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }
    
    .eligibility-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
    }
    
    .card-header i {
        font-size: 2rem;
        color: #2563eb;
    }
    
    .card-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .criteria-list {
        space-y: 1rem;
    }
    
    .criteria-item {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: white;
        border-radius: 0.5rem;
        border-left: 4px solid #2563eb;
    }
    
    .criteria-item h4 {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }
    
    .criteria-item p {
        color: #6b7280;
        margin-bottom: 0.5rem;
    }
    
    .subsidy {
        display: inline-block;
        background: #dcfce7;
        color: #166534;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .eligibility-checker {
        padding: 4rem 0;
        background: #f3f4f6;
    }
    
    .checker-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 1.5rem;
        padding: 2rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .checker-form .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .result-container {
        margin-top: 2rem;
        padding: 2rem;
        border-radius: 1rem;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.5s ease;
    }
    
    .result-container.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .result-container.eligible {
        background: #f0fdf4;
        border: 2px solid #22c55e;
    }
    
    .result-container.not-eligible {
        background: #fef2f2;
        border: 2px solid #ef4444;
    }
    
    .result-content {
        text-align: center;
    }
    
    .result-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }
    
    .eligible .result-icon {
        color: #22c55e;
    }
    
    .not-eligible .result-icon {
        color: #ef4444;
    }
    
    .result-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 1rem;
    }
    
    .eligible .result-title {
        color: #166534;
    }
    
    .not-eligible .result-title {
        color: #dc2626;
    }
    
    .result-message {
        font-size: 1.1rem;
        margin-bottom: 2rem;
        color: #4b5563;
    }
    
    .result-details {
        text-align: left;
        margin-bottom: 2rem;
    }
    
    .result-detail {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255,255,255,0.5);
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .result-detail i {
        color: #2563eb;
        font-size: 1.2rem;
    }
    
    .recommendations, .reasons {
        margin-top: 1.5rem;
    }
    
    .recommendations h4, .reasons h4 {
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1f2937;
    }
    
    .recommendations ul, .reasons ul {
        list-style: none;
        padding: 0;
    }
    
    .recommendations li, .reasons li {
        padding: 0.5rem 0;
        padding-left: 1.5rem;
        position: relative;
    }
    
    .recommendations li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #22c55e;
        font-weight: bold;
    }
    
    .reasons li::before {
        content: '✗';
        position: absolute;
        left: 0;
        color: #ef4444;
        font-weight: bold;
    }
    
    .result-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .schemes-overview {
        padding: 4rem 0;
        background: white;
    }
    
    .schemes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }
    
    .scheme-card {
        background: #f8fafc;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        position: relative;
    }
    
    .scheme-card h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 1rem;
    }
    
    .scheme-card p {
        color: #6b7280;
        margin-bottom: 1.5rem;
    }
    
    .scheme-card ul {
        list-style: none;
        padding: 0;
        margin-bottom: 2rem;
    }
    
    .scheme-card li {
        padding: 0.5rem 0;
        padding-left: 1.5rem;
        position: relative;
        color: #4b5563;
    }
    
    .scheme-card li::before {
        content: '•';
        position: absolute;
        left: 0;
        color: #2563eb;
        font-weight: bold;
    }
    
    .scheme-status {
        position: absolute;
        top: 1rem;
        right: 1rem;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .scheme-status.active {
        background: #dcfce7;
        color: #166534;
    }
    
    .faq-section {
        padding: 4rem 0;
        background: #f3f4f6;
    }
    
    .faq-container {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .faq-item {
        background: white;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
    }
    
    .faq-question {
        padding: 1.5rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;
    }
    
    .faq-question:hover {
        background: #f8fafc;
    }
    
    .faq-question h4 {
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }
    
    .faq-question i {
        color: #6b7280;
        transition: transform 0.3s ease;
    }
    
    .faq-answer {
        padding: 0 1.5rem 1.5rem;
        display: none;
        color: #4b5563;
        line-height: 1.6;
    }
    
    @media (max-width: 768px) {
        .checker-form .form-row {
            grid-template-columns: 1fr;
        }
        
        .result-actions {
            flex-direction: column;
        }
        
        .schemes-grid {
            grid-template-columns: 1fr;
        }
    }
`;

// Add CSS to document
const eligibilityStyle = document.createElement('style');
eligibilityStyle.textContent = eligibilityCSS;
document.head.appendChild(eligibilityStyle);