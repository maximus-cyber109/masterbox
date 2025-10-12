let selectedCount = 0;
let customerData = null;
let orderData = null;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎭 PB DAYS Premium Experience Starting...');
    startCurtainAnimation();
});

function startCurtainAnimation() {
    console.log('🎬 Starting curtain animation...');
    
    // After 3 seconds, start opening curtains
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
        }, 2500);
        
    }, 3000);
}

async function initializeApp() {
    console.log('⚙️ Initializing order-based system...');
    showLoadingScreen();
    
    try {
        await getCustomerInfo();
        
        if (customerData) {
            console.log('✅ Customer session found:', customerData.email);
            
            // Fetch latest order for this customer
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
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        console.log('📧 Email submitted, fetching order...', email);
        
        // Show loading on button
        const modalLoading = document.getElementById('modalLoading');
        const modalBtnText = document.getElementById('modalBtnText');
        modalLoading.style.display = 'inline-block';
        modalBtnText.textContent = 'Fetching Order...';
        
        try {
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
                    console.log('✅ Ready for specialty selection (email mode)');
                    document.getElementById('emailModal').style.display = 'none';
                    updateSubmitButton();
                }
            } else {
                throw new Error('No recent orders found for this email');
            }
            
        } catch (error) {
            console.error('❌ Order fetch failed:', error.message);
            modalLoading.style.display = 'none';
            modalBtnText.textContent = 'Fetch My Order';
            alert('Could not find any recent orders for this email address. Please check and try again.');
        }
    });
}

function showOrderDetails() {
    if (!customerData || !orderData) return;
    
    console.log('📦 Showing order details');
    
    document.getElementById('customerName').textContent = 
        `Welcome back, ${customerData.firstname}!`;
    document.getElementById('orderNumber').textContent = 
        `Order #${orderData.increment_id}`;
    document.getElementById('orderAmount').textContent = 
        `₹${parseFloat(orderData.grand_total).toFixed(0)}`;
    
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
        btnText.textContent = 'Claim My MasterBox';
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
    console.log('🚀 Starting MasterBox claim...');
    
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
            campaign: 'PB_DAYS_OCT_2025'
        };
        
        console.log('📤 Claiming MasterBox for order:', orderData.increment_id);
        
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
        
        console.log('✅ MasterBox claimed successfully!');
        console.log('📧 WebEngage event sent - confirmation email will arrive automatically');
        
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
        btnText.textContent = 'Claim My MasterBox';
        
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
