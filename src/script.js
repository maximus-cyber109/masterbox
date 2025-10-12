let selectedCount = 0;
let customerData = null;
let orderData = null;
let isSubmitting = false;
let isTestMode = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎭 PB DAYS Premium Experience Starting...');
    startCurtainAnimation();
});

function startCurtainAnimation() {
    console.log('🎬 Starting real curtain animation...');
    
    // After 4 seconds, start opening curtains
    setTimeout(() => {
        const curtainContainer = document.getElementById('curtainContainer');
        curtainContainer.classList.add('opening');
        
        // After curtains are open, hide them and show main container
        setTimeout(() => {
            curtainContainer.style.display = 'none';
            const mainContainer = document.getElementById('mainContainer');
            mainContainer.classList.add('show');
            
            // Start the app initialization
            initializeApp();
            loadPreviousSelections();
        }, 3500);
        
    }, 4000);
}

async function initializeApp() {
    console.log('⚙️ Initializing premium order-based system...');
    showLoadingScreen();
    
    try {
        await getCustomerInfo();
        
        if (customerData) {
            console.log('✅ Customer session found:', customerData.email);
            
            // Check if test mode
            if (customerData.email.includes('-forcefetch')) {
                console.log('🧪 TEST MODE ACTIVATED - Bypassing order validation');
                isTestMode = true;
                addTestModeBadge();
                
                // Create mock order data for test mode
                orderData = {
                    id: 'TEST_' + Date.now(),
                    increment_id: 'TEST-' + Math.floor(Math.random() * 10000),
                    grand_total: '0.00',
                    status: 'test'
                };
                
                showOrderDetails();
                
                // Skip duplicate check in test mode
                console.log('✅ Test mode ready - skipping duplicate validation');
            } else {
                // Normal flow - fetch latest order
                await getLatestOrder(customerData.email);
                
                if (orderData) {
                    showOrderDetails();
                    const hasSubmitted = await checkPreviousSubmission();
                    if (hasSubmitted) {
                        console.log('ℹ️ Order already claimed MasterBox');
                        showAlreadySubmittedScreen();
                        return;
                    }
                }
            }
        } else {
            console.log('ℹ️ No customer session - showing email form');
            showEmailFallbackModal();
            return;
        }
        
    } catch (error) {
        console.log('ℹ️ Authentication failed - using email fallback');
        showEmailFallbackModal();
        return;
    }
    
    console.log('✅ Ready for specialty selection');
    hideLoadingScreen();
    updateSubmitButton();
}

function addTestModeBadge() {
    const badge = document.createElement('div');
    badge.className = 'test-mode-badge';
    badge.textContent = 'TEST MODE';
    document.body.appendChild(badge);
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showEmailFallbackModal() {
    console.log('📧 Showing premium email collection...');
    hideLoadingScreen();
    document.getElementById('emailModal').style.display = 'flex';
    
    document.getElementById('emailForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('fallbackEmail').value.trim();
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.replace('-forcefetch', ''))) {
            alert('Please enter a valid email address');
            return;
        }
        
        console.log('📧 Email submitted:', email);
        
        // Show loading on button
        const modalLoading = document.getElementById('modalLoading');
        const modalBtnText = document.getElementById('modalBtnText');
        modalLoading.style.display = 'inline-block';
        modalBtnText.textContent = 'Processing...';
        
        try {
            // Check for test mode override
            if (email.includes('-forcefetch')) {
                console.log('🧪 TEST MODE DETECTED - Creating test customer');
                isTestMode = true;
                
                // Create mock customer and order
                const cleanEmail = email.replace('-forcefetch', '');
                customerData = {
                    id: 'TEST_' + Date.now(),
                    email: cleanEmail,
                    firstname: 'Test',
                    lastname: 'User',
                    fallback: true
                };
                
                orderData = {
                    id: 'TEST_' + Date.now(),
                    increment_id: 'TEST-' + Math.floor(Math.random() * 10000),
                    grand_total: '0.00',
                    status: 'test'
                };
                
                console.log('✅ Test mode setup complete');
                addTestModeBadge();
                
                showOrderDetails();
                document.getElementById('emailModal').style.display = 'none';
                updateSubmitButton();
                
            } else {
                // Normal flow
                await getLatestOrder(email);
                
                if (customerData && orderData) {
                    console.log('✅ Order fetched successfully');
                    
                    showOrderDetails();
                    
                    const hasSubmitted = await checkPreviousSubmission();
                    if (hasSubmitted) {
                        console.log('ℹ️ Order already claimed');
                        document.getElementById('emailModal').style.display = 'none';
                        showAlreadySubmittedScreen();
                    } else {
                        console.log('✅ Ready for specialty selection');
                        document.getElementById('emailModal').style.display = 'none';
                        updateSubmitButton();
                    }
                } else {
                    throw new Error('No recent orders found for this email');
                }
            }
            
        } catch (error) {
            console.error('❌ Process failed:', error.message);
            modalLoading.style.display = 'none';
            modalBtnText.textContent = 'Fetch My Order';
            
            if (isTestMode) {
                alert('Test mode error: ' + error.message);
            } else {
                alert('Could not find any recent orders for this email address. Please check and try again.\n\nTip: Add "-forcefetch" to your email for testing mode.');
            }
        }
    });
}

function showOrderDetails() {
    if (!customerData || !orderData) return;
    
    console.log('📦 Showing order details');
    
    document.getElementById('customerName').textContent = 
        `Welcome back, ${customerData.firstname}!`;
    
    if (isTestMode) {
        document.getElementById('orderNumber').textContent = 
            `${orderData.increment_id} (TEST)`;
        document.getElementById('orderAmount').textContent = 
            'TEST MODE';
    } else {
        document.getElementById('orderNumber').textContent = 
            `Order #${orderData.increment_id}`;
        document.getElementById('orderAmount').textContent = 
            `₹${parseFloat(orderData.grand_total).toFixed(0)}`;
    }
    
    document.getElementById('orderDetailsSection').style.display = 'block';
}

function showAlreadySubmittedScreen() {
    console.log('ℹ️ Showing already submitted screen');
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('submitSection').style.display = 'none';
    document.getElementById('alreadySubmittedScreen').style.display = 'flex';
}

async function getCustomerInfo() {
    try {
        let bearerToken = null;
        
        try {
            if (window.parent !== window) {
                bearerToken = window.parent.customerToken || window.parent.localStorage?.getItem('customerToken');
            }
        } catch (e) { /* Expected CORS error */ }
        
        if (!bearerToken) {
            try {
                bearerToken = localStorage.getItem('customerToken') || sessionStorage.getItem('customerToken');
            } catch (e) { /* Storage error */ }
        }
        
        if (!bearerToken) {
            const urlParams = new URLSearchParams(window.location.search);
            bearerToken = urlParams.get('token');
        }
        
        if (!bearerToken) {
            throw new Error('No authentication token available');
        }
        
        console.log('🔑 Bearer token found, fetching customer data...');
        
        const response = await fetch('/.netlify/functions/get-customer-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.fallback) {
            throw new Error('Customer API unavailable');
        }
        
        customerData = data.customer;
        
    } catch (error) {
        customerData = null;
        throw error;
    }
}

async function getLatestOrder(email) {
    try {
        console.log('📦 Fetching latest order for:', email);
        
        const response = await fetch('/.netlify/functions/get-latest-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Order fetch failed');
        }
        
        customerData = data.customer;
        orderData = data.order;
        
        console.log('📦 Order found:', orderData.increment_id);
        
    } catch (error) {
        console.error('❌ Order fetch error:', error);
        throw error;
    }
}

async function checkPreviousSubmission() {
    try {
        if (!orderData) {
            return false;
        }
        
        // Skip duplicate check in test mode
        if (isTestMode) {
            console.log('🧪 Test mode - skipping duplicate check');
            return false;
        }
        
        const response = await fetch('/.netlify/functions/check-submission', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderData.id,
                orderIncrementId: orderData.increment_id
            })
        });
        
        const data = await response.json();
        
        if (data.hasSubmitted) {
            const submissionInfo = document.getElementById('submittedInfo');
            submissionInfo.innerHTML = `
                <p><strong>Order:</strong> #${orderData.increment_id}</p>
                <p><strong>Claimed on:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                <p><strong>Selected Specialties:</strong> ${data.submissionData.specialties}</p>
                <p><strong>Total Count:</strong> ${data.submissionData.count}</p>
            `;
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.log('⚠️ Could not verify previous submission');
        return false;
    }
}

function toggleSpecialty(specialtyId) {
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
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
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
        if (isTestMode) {
            btnText.textContent = 'Test Claim MasterBox';
        } else {
            btnText.textContent = 'Claim My MasterBox';
        }
    }
}

async function submitForm() {
    if (isSubmitting) {
        console.log('⏳ Submission already in progress...');
        return;
    }
    
    const checkedBoxes = document.querySelectorAll('input[name="specialties[]"]:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Please select at least one specialty');
        return;
    }
    
    if (!customerData || !orderData) {
        alert('Order information not available. Please refresh and try again.');
        return;
    }
    
    isSubmitting = true;
    
    if (isTestMode) {
        console.log('🧪 Starting TEST MasterBox claim...');
    } else {
        console.log('🚀 Starting MasterBox claim...');
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const btnText = document.getElementById('btnText');
    
    submitBtn.disabled = true;
    loading.style.display = 'inline-block';
    btnText.textContent = 'Processing...';
    
    try {
        const selectedSpecialties = Array.from(checkedBoxes).map(cb => cb.value);
        const submissionData = {
            email: customerData.email,
            firstname: customerData.firstname,
            lastname: customerData.lastname,
            customerId: customerData.id,
            specialties: selectedSpecialties,
            count: selectedSpecialties.length,
            timestamp: new Date().toISOString(),
            orderId: orderData.increment_id,
            orderEntityId: orderData.id,
            orderAmount: orderData.grand_total,
            campaign: 'PB_DAYS_OCT_2025',
            testMode: isTestMode
        };
        
        if (isTestMode) {
            console.log('🧪 TEST MODE - Submitting test data:', submissionData);
        } else {
            console.log('📤 Claiming MasterBox for order:', orderData.increment_id);
        }
        
        const response = await fetch('/.netlify/functions/submit-specialties', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        let result;
        try {
            const responseText = await response.text();
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Server returned invalid response: ${response.status}`);
        }
        
        if (response.status === 409) {
            console.log('ℹ️ Duplicate submission detected');
            alert('This order has already claimed its MasterBox.');
            showAlreadySubmittedScreen();
            return;
        }
        
        if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
        }
        
        if (!result.success) {
            throw new Error(result.error || 'Submission failed');
        }
        
        if (isTestMode) {
            console.log('✅ TEST MasterBox claimed successfully!');
            console.log('🧪 TEST MODE - Email events still sent to WebEngage');
        } else {
            console.log('✅ MasterBox claimed successfully!');
            console.log('📧 WebEngage event sent - confirmation email will arrive automatically');
        }
        
        clearSelections();
        
        setTimeout(() => {
            document.getElementById('formSection').style.display = 'none';
            document.getElementById('submitSection').style.display = 'none';
            document.getElementById('successScreen').style.display = 'flex';
        }, 1000);
        
    } catch (error) {
        console.error('❌ MasterBox claim failed:', error.message);
        
        isSubmitting = false;
        submitBtn.disabled = false;
        loading.style.display = 'none';
        
        if (isTestMode) {
            btnText.textContent = 'Test Claim MasterBox';
        } else {
            btnText.textContent = 'Claim My MasterBox';
        }
        
        alert('There was an error claiming your MasterBox. Please try again.');
    }
}

function saveSelections() {
    try {
        const selectedSpecialties = Array.from(document.querySelectorAll('input[name="specialties[]"]:checked')).map(cb => cb.value);
        localStorage.setItem('pb_days_selected_specialties', JSON.stringify(selectedSpecialties));
    } catch (error) {
        console.log('⚠️ Could not save selections');
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
            console.log('📋 Restored previous selections');
        }
    } catch (error) {
        console.log('⚠️ Could not load previous selections');
    }
}

function clearSelections() {
    try {
        localStorage.removeItem('pb_days_selected_specialties');
    } catch (error) {
        // Not critical
    }
}

updateSubmitButton();
