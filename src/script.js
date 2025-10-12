let selectedCount = 0;
let customerData = null;
let orderData = null;
let isSubmitting = false;
let isTestMode = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 PB DAYS Starting...');
    startWaveAnimation();
});

function startWaveAnimation() {
    console.log('🌊 Starting wave animation...');
    
    setTimeout(() => {
        const waveContainer = document.getElementById('waveContainer');
        waveContainer.classList.add('closing');
        
        setTimeout(() => {
            waveContainer.style.display = 'none';
            const mainContainer = document.getElementById('mainContainer');
            mainContainer.classList.add('show');
            
            initializeApp();
            loadPreviousSelections();
        }, 2000);
        
    }, 3000);
}

async function initializeApp() {
    console.log('⚙️ Initializing app...');
    showLoadingScreen();
    
    try {
        await getCustomerInfo();
        
        if (customerData) {
            console.log('✅ Customer found:', customerData.email);
            
            if (customerData.email.includes('-forcefetch')) {
                console.log('🧪 TEST MODE');
                isTestMode = true;
                addTestModeBadge();
                
                orderData = {
                    id: 'TEST_' + Date.now(),
                    increment_id: 'TEST-' + Math.floor(Math.random() * 10000),
                    grand_total: '0.00'
                };
                
                showOrderDetails();
            } else {
                await getLatestOrder(customerData.email);
                
                if (orderData) {
                    showOrderDetails();
                    const hasSubmitted = await checkPreviousSubmission();
                    if (hasSubmitted) {
                        showAlreadySubmittedScreen();
                        return;
                    }
                }
            }
        } else {
            showEmailFallbackModal();
            return;
        }
        
    } catch (error) {
        console.log('ℹ️ Using email fallback');
        showEmailFallbackModal();
        return;
    }
    
    hideLoadingScreen();
    updateSubmitButton();
}

function addTestModeBadge() {
    const badge = document.createElement('div');
    badge.className = 'test-mode-badge';
    badge.textContent = 'TEST';
    document.body.appendChild(badge);
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showEmailFallbackModal() {
    console.log('📧 Showing email modal...');
    hideLoadingScreen();
    document.getElementById('emailModal').style.display = 'flex';
    
    document.getElementById('emailForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('fallbackEmail').value.trim();
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        const modalLoading = document.getElementById('modalLoading');
        const modalBtnText = document.getElementById('modalBtnText');
        modalLoading.style.display = 'inline-block';
        modalBtnText.textContent = 'Processing...';
        
        try {
            if (email.includes('-forcefetch')) {
                console.log('🧪 TEST MODE');
                isTestMode = true;
                
                const cleanEmail = email.replace('-forcefetch', '');
                customerData = {
                    id: 'TEST_' + Date.now(),
                    email: cleanEmail,
                    firstname: 'Test',
                    lastname: 'User'
                };
                
                orderData = {
                    id: 'TEST_' + Date.now(),
                    increment_id: 'TEST-' + Math.floor(Math.random() * 10000),
                    grand_total: '0.00'
                };
                
                addTestModeBadge();
                showOrderDetails();
                document.getElementById('emailModal').style.display = 'none';
                updateSubmitButton();
                
            } else {
                await getLatestOrder(email);
                
                if (customerData && orderData) {
                    showOrderDetails();
                    
                    const hasSubmitted = await checkPreviousSubmission();
                    if (hasSubmitted) {
                        document.getElementById('emailModal').style.display = 'none';
                        showAlreadySubmittedScreen();
                    } else {
                        document.getElementById('emailModal').style.display = 'none';
                        updateSubmitButton();
                    }
                } else {
                    throw new Error('No recent orders found');
                }
            }
            
        } catch (error) {
            modalLoading.style.display = 'none';
            modalBtnText.textContent = 'Fetch My Order';
            alert('Could not find orders for this email. Add "-forcefetch" for testing.');
        }
    });
}

function showOrderDetails() {
    if (!customerData || !orderData) return;
    
    document.getElementById('customerName').textContent = 
        `Welcome, ${customerData.firstname}!`;
    
    if (isTestMode) {
        document.getElementById('orderNumber').textContent = 
            `${orderData.increment_id} (TEST)`;
        document.getElementById('orderAmount').textContent = 'TEST MODE';
    } else {
        document.getElementById('orderNumber').textContent = 
            `Order #${orderData.increment_id}`;
        document.getElementById('orderAmount').textContent = 
            `₹${parseFloat(orderData.grand_total).toFixed(0)}`;
    }
    
    document.getElementById('orderDetailsSection').style.display = 'block';
}

function showAlreadySubmittedScreen() {
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
        } catch (e) {}
        
        if (!bearerToken) {
            bearerToken = localStorage.getItem('customerToken') || sessionStorage.getItem('customerToken');
        }
        
        if (!bearerToken) {
            const urlParams = new URLSearchParams(window.location.search);
            bearerToken = urlParams.get('token');
        }
        
        if (!bearerToken) {
            throw new Error('No token');
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
            throw new Error('API unavailable');
        }
        
        customerData = data.customer;
        
    } catch (error) {
        customerData = null;
        throw error;
    }
}

async function getLatestOrder(email) {
    try {
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
        
    } catch (error) {
        throw error;
    }
}

async function checkPreviousSubmission() {
    if (isTestMode) return false;
    
    try {
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
                <p><strong>Claimed:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                <p><strong>Specialties:</strong> ${data.submissionData.specialties}</p>
            `;
            return true;
        }
        
        return false;
        
    } catch (error) {
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
        btnText.textContent = isTestMode ? 'Test Claim' : 'Claim My MasterBox';
    }
}

async function submitForm() {
    if (isSubmitting) return;
    
    const checkedBoxes = document.querySelectorAll('input[name="specialties[]"]:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Please select at least one specialty');
        return;
    }
    
    if (!customerData || !orderData) {
        alert('Order information not available');
        return;
    }
    
    isSubmitting = true;
    
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
            orderId: orderData.increment_id,
            orderEntityId: orderData.id,
            orderAmount: orderData.grand_total,
            testMode: isTestMode
        };
        
        const response = await fetch('/.netlify/functions/submit-specialties', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        const result = await response.json();
        
        if (response.status === 409) {
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
        
        console.log('✅ Success!');
        clearSelections();
        
        setTimeout(() => {
            document.getElementById('formSection').style.display = 'none';
            document.getElementById('submitSection').style.display = 'none';
            document.getElementById('successScreen').style.display = 'flex';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed:', error.message);
        
        isSubmitting = false;
        submitBtn.disabled = false;
        loading.style.display = 'none';
        btnText.textContent = isTestMode ? 'Test Claim' : 'Claim My MasterBox';
        
        alert('Error claiming MasterBox. Please try again.');
    }
}

function saveSelections() {
    try {
        const selected = Array.from(document.querySelectorAll('input[name="specialties[]"]:checked')).map(cb => cb.value);
        localStorage.setItem('pb_days_selections', JSON.stringify(selected));
    } catch (error) {}
}

function loadPreviousSelections() {
    try {
        const saved = localStorage.getItem('pb_days_selections');
        if (saved) {
            const specialties = JSON.parse(saved);
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
        }
    } catch (error) {}
}

function clearSelections() {
    try {
        localStorage.removeItem('pb_days_selections');
    } catch (error) {}
}

updateSubmitButton();
