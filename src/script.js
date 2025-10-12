// Global variables
let selectedCount = 0;
let customerData = null;
let isSubmitting = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadPreviousSelections();
});

async function initializeApp() {
    console.log('Initializing PB DAYS app...');
    
    // Show loading screen
    showLoadingScreen();
    
    try {
        // First try to get customer info from Magento session
        await getCustomerInfo();
        
        if (customerData) {
            console.log('Customer data found:', customerData);
            // Check if user already submitted
            const hasSubmitted = await checkPreviousSubmission();
            if (hasSubmitted) {
                showAlreadySubmittedScreen();
                return;
            }
        } else {
            // Show email fallback modal
            showEmailFallbackModal();
            return;
        }
        
    } catch (error) {
        console.error('App initialization error:', error);
        showEmailFallbackModal();
        return;
    }
    
    // Hide loading screen and show form
    hideLoadingScreen();
    updateSubmitButton();
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showEmailFallbackModal() {
    hideLoadingScreen();
    document.getElementById('emailModal').style.display = 'flex';
    
    document.getElementById('emailForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('fallbackEmail').value;
        const firstname = document.getElementById('fallbackFirstname').value;
        const lastname = document.getElementById('fallbackLastname').value;
        
        if (!email || !firstname || !lastname) {
            alert('Please fill in all fields');
            return;
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Set customer data from form
        customerData = {
            email: email,
            firstname: firstname,
            lastname: lastname,
            fallback: true
        };
        
        // Check for previous submission
        checkPreviousSubmission().then(hasSubmitted => {
            if (hasSubmitted) {
                document.getElementById('emailModal').style.display = 'none';
                showAlreadySubmittedScreen();
            } else {
                // Hide modal and show form
                document.getElementById('emailModal').style.display = 'none';
                updateSubmitButton();
            }
        }).catch(error => {
            console.error('Error checking previous submission:', error);
            // Continue with form anyway
            document.getElementById('emailModal').style.display = 'none';
            updateSubmitButton();
        });
    });
}

function showAlreadySubmittedScreen() {
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('submitSection').style.display = 'none';
    document.getElementById('alreadySubmittedScreen').style.display = 'flex';
}

async function getCustomerInfo() {
    try {
        // Try to get bearer token from parent window (Magento)
        let bearerToken = null;
        
        // Try different methods to get token
        try {
            // Method 1: From parent window if in iframe
            if (window.parent !== window) {
                bearerToken = window.parent.customerToken || window.parent.localStorage.getItem('customerToken');
            }
            
            // Method 2: From current window
            if (!bearerToken) {
                bearerToken = localStorage.getItem('customerToken') || sessionStorage.getItem('customerToken');
            }
            
            // Method 3: From URL parameters (if passed)
            if (!bearerToken) {
                const urlParams = new URLSearchParams(window.location.search);
                bearerToken = urlParams.get('token');
            }
        } catch (error) {
            console.log('Could not access parent window or get token:', error.message);
        }
        
        if (!bearerToken) {
            throw new Error('No bearer token found');
        }
        
        const response = await fetch('/.netlify/functions/get-customer-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.fallback) {
            throw new Error('Customer info not available');
        }
        
        customerData = data.customer;
        console.log('Customer data loaded:', customerData);
        
    } catch (error) {
        console.error('Failed to get customer info:', error);
        customerData = null;
        throw error;
    }
}

async function checkPreviousSubmission() {
    try {
        const response = await fetch('/.netlify/functions/check-submission', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: customerData.email,
                customerId: customerData.id
            })
        });
        
        const data = await response.json();
        
        if (data.hasSubmitted) {
            // Show submission info
            const submissionInfo = document.getElementById('submittedInfo');
            submissionInfo.innerHTML = `
                <p><strong>Submitted on:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                <p><strong>Selected Specialties:</strong> ${data.submissionData.specialties}</p>
                <p><strong>Total Count:</strong> ${data.submissionData.count}</p>
            `;
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error checking previous submission:', error);
        return false; // Assume not submitted if we can't check
    }
}

function toggleSpecialty(specialtyId) {
    // Prevent interaction if submitting
    if (isSubmitting) return;
    
    const checkbox = document.getElementById(specialtyId);
    const item = checkbox.closest('.specialty-item');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        item.classList.add('selected');
        selectedCount++;
    } else {
        item.classList.remove('selected');
        selectedCount--;
    }
    
    updateCounter();
    updateSubmitButton();
    
    // Add haptic feedback simulation
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
    // Store selection in localStorage as backup
    saveSelections();
}

function updateCounter() {
    const counter = document.getElementById('selectionCounter');
    if (selectedCount === 0) {
        counter.textContent = 'No specialties selected';
        counter.classList.remove('active');
    } else if (selectedCount === 1) {
        counter.textContent = '1 specialty selected';
        counter.classList.add('active');
    } else {
        counter.textContent = `${selectedCount} specialties selected`;
        counter.classList.add('active');
    }
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    
    if (selectedCount === 0) {
        submitBtn.disabled = true;
        btnText.textContent = 'Select Specialties';
    } else {
        submitBtn.disabled = false;
        btnText.textContent = 'Create My MasterBox';
    }
}

async function submitForm() {
    // Prevent double submission
    if (isSubmitting) {
        console.log('Submission already in progress');
        return;
    }
    
    const checkedBoxes = document.querySelectorAll('input[name="specialties[]"]:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Please select at least one specialty');
        return;
    }
    
    if (!customerData) {
        alert('Customer information not available. Please refresh and try again.');
        return;
    }
    
    // Set submitting state
    isSubmitting = true;
    
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const btnText = document.getElementById('btnText');
    
    // Show loading state
    submitBtn.disabled = true;
    loading.style.display = 'inline-block';
    btnText.textContent = 'Processing...';
    
    try {
        // Collect form data
        const selectedSpecialties = Array.from(checkedBoxes).map(cb => cb.value);
        const submissionData = {
            email: customerData.email,
            firstname: customerData.firstname,
            lastname: customerData.lastname,
            customerId: customerData.id,
            specialties: selectedSpecialties,
            count: selectedSpecialties.length,
            timestamp: new Date().toISOString(),
            orderId: getOrderId(),
            campaign: 'PB_DAYS_OCT_2025'
        };
        
        console.log('Submitting data:', submissionData);
        
        const response = await fetch('/.netlify/functions/submit-specialties', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        const result = await response.json();
        
        if (response.status === 409) {
            // Duplicate submission
            alert('You have already submitted your MasterBox preferences.');
            showAlreadySubmittedScreen();
            return;
        }
        
        if (!response.ok) {
            throw new Error(result.error || 'Submission failed');
        }
        
        // Clear stored selections
        clearSelections();
        
        // Show success screen
        setTimeout(() => {
            document.getElementById('formSection').style.display = 'none';
            document.getElementById('submitSection').style.display = 'none';
            document.getElementById('successScreen').style.display = 'flex';
        }, 1000);
        
    } catch (error) {
        console.error('Submission error:', error);
        
        // Reset UI
        submitBtn.disabled = false;
        loading.style.display = 'none';
        btnText.textContent = 'Create My MasterBox';
        isSubmitting = false;
        
        alert('There was an error submitting your preferences. Please try again.');
    }
}

function getOrderId() {
    // Try to get order ID from various sources
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id') || urlParams.get('orderId');
    
    if (orderId) return orderId;
    
    // Try to get from parent window if in iframe
    try {
        if (window.parent !== window && window.parent.currentOrderId) {
            return window.parent.currentOrderId;
        }
    } catch (error) {
        console.log('Could not access parent order ID');
    }
    
    // Generate a temporary ID based on timestamp
    return 'TEMP_' + Date.now();
}

// Helper functions for localStorage management
function saveSelections() {
    try {
        const selectedSpecialties = Array.from(document.querySelectorAll('input[name="specialties[]"]:checked')).map(cb => cb.value);
        localStorage.setItem('pb_days_selected_specialties', JSON.stringify(selectedSpecialties));
    } catch (error) {
        console.error('Error saving selections:', error);
    }
}

function loadPreviousSelections() {
    try {
        const savedSelections = localStorage.getItem('pb_days_selected_specialties');
        if (savedSelections) {
            const specialties = JSON.parse(savedSelections);
            specialties.forEach(specialty => {
                const checkbox = document.querySelector(`input[value="${specialty}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.closest('.specialty-item').classList.add('selected');
                    selectedCount++;
                }
            });
            updateCounter();
            updateSubmitButton();
            console.log('Loaded previous selections:', specialties);
        }
    } catch (error) {
        console.error('Error loading saved selections:', error);
    }
}

function clearSelections() {
    try {
        localStorage.removeItem('pb_days_selected_specialties');
    } catch (error) {
        console.error('Error clearing selections:', error);
    }
}

// Initialize submit button state
updateSubmitButton();
