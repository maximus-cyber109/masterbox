document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 PB DAYS Premium Experience Starting...');
    new PBDaysApp();
});

class PBDaysApp {
    constructor() {
        this.selectedSpecialties = new Set();
        this.customerData = null;
        this.orderData = null;
        this.isSubmitting = false;
        this.isTestMode = false;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.startWaveAnimation();
    }

    setupEventListeners() {
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailSubmission();
            });
        }

        const specialtyCards = document.querySelectorAll('.card');
        specialtyCards.forEach(card => {
            card.addEventListener('click', () => {
                this.toggleCard(card);
            });
        });

        const submitButton = document.getElementById('submitBtn');
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                this.handleFinalSubmission();
            });
        }

        // ✅ NEW: Return to PinkBlue button on Already Claimed screen
        const returnButton = document.getElementById('returnToPinkBlue');
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                window.location.href = 'https://pinkblue.in';
            });
        }

        this.loadSavedSelections();
    }

    startWaveAnimation() {
        setTimeout(() => {
            const waveContainer = document.getElementById('loadingScreen');
            const mainApp = document.getElementById('app');
            
            if (waveContainer && mainApp) {
                waveContainer.classList.add('fade-out');
                setTimeout(() => {
                    waveContainer.style.display = 'none';
                    mainApp.classList.add('show');
                    this.initializeApplication();
                }, 1500);
            }
        }, 2000);
    }

    async initializeApplication() {
        console.log('⚙️ Initializing application...');
        this.showAppLoading();

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const emailParam = urlParams.get('email');

            if (emailParam) {
                console.log('📧 Email found in URL parameter:', emailParam);
                
                if (emailParam.includes('-forcefetch')) {
                    this.activateTestMode();
                    this.customerData = {
                        id: `TEST_${Date.now()}`,
                        email: emailParam.replace('-forcefetch', ''),
                        firstname: 'Test',
                        lastname: 'User'
                    };
                    this.displayCustomerInfo();
                } else {
                    // ✅ NEW FLOW: Only fetch customer info, not order yet
                    await this.fetchCustomerInfoOnly(emailParam);
                    if (this.customerData) {
                        this.displayCustomerInfo();
                    } else {
                        throw new Error('Customer not found');
                    }
                }
            } else {
                // Try bearer token method
                await this.getCustomerInformation();
                if (this.customerData) {
                    console.log('✅ Customer found:', this.customerData.email);
                    
                    if (this.customerData.email.includes('-forcefetch')) {
                        this.activateTestMode();
                    }
                    
                    this.displayCustomerInfo();
                } else {
                    throw new Error('No customer data available');
                }
            }
        } catch (error) {
            console.log('ℹ️ Auto-login failed, showing email modal');
            this.showEmailInputModal();
            return;
        }

        this.hideAppLoading();
        this.updateUserInterface();
    }

    activateTestMode() {
        console.log('🧪 TEST MODE ACTIVATED');
        this.isTestMode = true;
        const testBadge = document.createElement('div');
        testBadge.className = 'test-badge';
        testBadge.textContent = 'TEST MODE';
        document.body.appendChild(testBadge);
    }

    showAppLoading() {
        const loadingElement = document.getElementById('appLoading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideAppLoading() {
        const loadingElement = document.getElementById('appLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showEmailInputModal() {
        this.hideAppLoading();
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    async handleEmailSubmission() {
        const emailInput = document.getElementById('emailInput');
        const fetchLoader = document.getElementById('emailLoading');
        const fetchLabel = document.getElementById('emailText');

        if (!emailInput) return;

        const email = emailInput.value.trim();
        
        if (!email) {
            this.showUserMessage('Please enter your email address');
            return;
        }

        if (!this.isValidEmailFormat(email.replace('-forcefetch', ''))) {
            this.showUserMessage('Please enter a valid email address');
            return;
        }

        if (fetchLoader) fetchLoader.style.display = 'inline-block';
        if (fetchLabel) fetchLabel.textContent = 'Validating...';

        try {
            if (email.includes('-forcefetch')) {
                console.log('🧪 Test mode detected from email');
                this.activateTestMode();
                this.customerData = {
                    id: `TEST_${Date.now()}`,
                    email: email.replace('-forcefetch', ''),
                    firstname: 'Test',
                    lastname: 'User'
                };
                this.hideEmailModal();
                this.displayCustomerInfo();
                this.updateUserInterface();
            } else {
                // ✅ NEW FLOW: Only validate email exists, not order
                await this.fetchCustomerInfoOnly(email);
                if (this.customerData) {
                    this.hideEmailModal();
                    this.displayCustomerInfo();
                    this.updateUserInterface();
                } else {
                    throw new Error('Email not found');
                }
            }
        } catch (error) {
            console.error('❌ Email validation failed:', error);
            this.showUserMessage('Email not found in our system. Please ensure you have placed an order.');
        } finally {
            if (fetchLoader) fetchLoader.style.display = 'none';
            if (fetchLabel) fetchLabel.textContent = 'Continue';
        }
    }

    hideEmailModal() {
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    displayCustomerInfo() {
        if (!this.customerData) return;

        const welcomeElement = document.getElementById('customerName');
        const orderCard = document.getElementById('orderCard');

        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${this.customerData.firstname}!`;
        }

        if (orderCard) {
            orderCard.classList.add('show');
        }
    }

    async getCustomerInformation() {
        const bearerToken = this.findBearerToken();
        
        if (!bearerToken) {
            throw new Error('No authentication token available');
        }

        console.log('🔑 Attempting customer authentication...');
        
        const response = await fetch('/.netlify/functions/get-customer-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            }
        });

        const data = await response.json();
        
        if (data.fallback || !data.success) {
            throw new Error('Customer API unavailable');
        }

        this.customerData = data.customer;
    }

    findBearerToken() {
        try {
            if (window.parent !== window) {
                const token = window.parent.customerToken || window.parent.localStorage?.getItem('customerToken');
                if (token) return token;
            }
        } catch (error) {
            // CORS error expected
        }

        const localToken = localStorage.getItem('customerToken') || sessionStorage.getItem('customerToken');
        if (localToken) return localToken;

        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }

    // ✅ NEW FUNCTION: Fetch only customer info, no order validation
    async fetchCustomerInfoOnly(email) {
        console.log('📧 Validating customer email:', email);
        
        const response = await fetch('/.netlify/functions/get-customer-info-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Customer not found');
        }

        this.customerData = data.customer;
        console.log('✅ Customer validated:', this.customerData.email);
    }

    // ✅ MOVED: Fetch order only during submission
    async fetchCustomerOrder(email) {
        console.log('📦 Fetching latest order for:', email);
        
        const response = await fetch('/.netlify/functions/get-latest-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        // Check if order is already claimed
        if (data.alreadyClaimed) {
            console.log('❌ Order already claimed');
            this.orderData = data.order;
            
            // Show already claimed state
            this.hideAppLoading();
            this.showAlreadySubmittedState();
            
            // Update submission info
            const submissionInfoElement = document.getElementById('submissionInfo');
            if (submissionInfoElement && data.submissionData) {
                submissionInfoElement.innerHTML = `
                    <strong>Order:</strong> #${data.order.increment_id}<br/>
                    <strong>Specialties:</strong> ${data.submissionData.specialties || 'Previously claimed'}<br/>
                    <strong>Status:</strong> Already Claimed
                `;
            }
            
            throw new Error('ORDER_ALREADY_CLAIMED');
        }

        if (!data.success) {
            throw new Error(data.error || 'Order fetch failed');
        }

        this.orderData = data.order;
        console.log('📦 Order retrieved:', this.orderData.increment_id);
    }

    toggleCard(card) {
        if (this.isSubmitting) return;

        const specialtyValue = card.dataset.specialty;
        
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            this.selectedSpecialties.delete(specialtyValue);
        } else {
            card.classList.add('selected');
            this.selectedSpecialties.add(specialtyValue);
        }

        this.updateProgressIndicator();
        this.updateSubmitButtonState();
        this.saveCurrentSelections();

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    updateProgressIndicator() {
        const count = this.selectedSpecialties.size;
        const progressText = document.getElementById('counter');
        
        if (progressText) {
            if (count === 0) {
                progressText.textContent = 'No specialties selected';
                progressText.classList.remove('active');
            } else if (count === 1) {
                progressText.textContent = '1 specialty selected';
                progressText.classList.add('active');
            } else {
                progressText.textContent = `${count} specialties selected`;
                progressText.classList.add('active');
            }
        }
    }

    updateSubmitButtonState() {
        const submitButton = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        
        if (!submitButton || !submitText) return;

        if (this.selectedSpecialties.size === 0) {
            submitButton.disabled = true;
            submitText.textContent = 'Select Specialties';
        } else {
            submitButton.disabled = false;
            submitText.textContent = this.isTestMode ? 'Test Claim' : 'Claim My MasterBox';
        }
    }

    async handleFinalSubmission() {
        if (this.isSubmitting || this.selectedSpecialties.size === 0) return;
        
        if (!this.customerData) {
            this.showUserMessage('Customer information not available');
            return;
        }

        this.isSubmitting = true;
        this.showSubmissionLoading();

        try {
            // ✅ NEW: Fetch order NOW during submission (not during initialization)
            if (!this.orderData && !this.isTestMode) {
                console.log('📦 Fetching order during submission...');
                try {
                    await this.fetchCustomerOrder(this.customerData.email);
                } catch (error) {
                    if (error.message === 'ORDER_ALREADY_CLAIMED') {
                        // Already handled in fetchCustomerOrder
                        return;
                    }
                    throw error;
                }
            }

            // Generate test order if in test mode
            if (this.isTestMode && !this.orderData) {
                this.orderData = {
                    id: `TEST_${Date.now()}`,
                    increment_id: `TEST-${Math.floor(Math.random() * 10000)}`,
                    grand_total: '0.00',
                    status: 'test'
                };
            }

            if (!this.orderData) {
                throw new Error('No recent orders found for your account');
            }

            const specialtiesArray = Array.from(this.selectedSpecialties);
            const submissionPayload = {
                email: this.customerData.email,
                firstname: this.customerData.firstname,
                lastname: this.customerData.lastname,
                customerId: this.customerData.id,
                specialties: specialtiesArray,
                orderId: this.orderData.increment_id,
                orderEntityId: this.orderData.id,
                orderAmount: this.orderData.grand_total,
                testMode: this.isTestMode
            };

            console.log('📤 Submitting MasterBox claim...');

            const response = await fetch('/.netlify/functions/submit-specialties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionPayload)
            });

            const result = await response.json();

            if (response.status === 409) {
                this.showUserMessage('This order has already claimed its MasterBox');
                this.showAlreadySubmittedState();
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Server error: ${response.status}`);
            }

            console.log('✅ MasterBox claimed successfully!');
            this.clearStoredSelections();
            this.showSuccessState();

        } catch (error) {
            console.error('❌ Submission failed:', error);
            if (error.message.includes('No recent orders')) {
                this.showUserMessage('No recent orders found. Please ensure you have placed an order in the last 30 days.');
            } else {
                this.showUserMessage('Failed to claim MasterBox. Please try again.');
            }
        } finally {
            this.isSubmitting = false;
            this.hideSubmissionLoading();
        }
    }

    showSubmissionLoading() {
        const submitButton = document.getElementById('submitBtn');
        const submitLoader = document.getElementById('submitLoading');
        const submitText = document.getElementById('submitText');

        if (submitButton) submitButton.disabled = true;
        if (submitLoader) submitLoader.style.display = 'inline-block';
        if (submitText) submitText.textContent = 'Validating order...';
    }

    hideSubmissionLoading() {
        const submitLoader = document.getElementById('submitLoading');
        if (submitLoader) submitLoader.style.display = 'none';
        this.updateSubmitButtonState();
    }

    showAlreadySubmittedState() {
        const specialtySection = document.getElementById('formSection');
        const submitArea = document.getElementById('submitArea');
        const alreadySubmittedState = document.getElementById('alreadySubmitted');

        if (specialtySection) specialtySection.style.display = 'none';
        if (submitArea) submitArea.style.display = 'none';
        if (alreadySubmittedState) alreadySubmittedState.classList.add('show');
    }

    showSuccessState() {
        const specialtySection = document.getElementById('formSection');
        const submitArea = document.getElementById('submitArea');
        const successModal = document.getElementById('successModal');

        if (specialtySection) specialtySection.style.display = 'none';
        if (submitArea) submitArea.style.display = 'none';
        
        if (successModal) {
            successModal.classList.add('show');
            setTimeout(() => {
                this.setupShareModalButton();
                this.setupReturnModalButton();
            }, 300);
        }
    }

    setupShareModalButton() {
        const shareBtn = document.getElementById('shareModalBtn');
        if (!shareBtn) return;

        shareBtn.addEventListener('click', async () => {
            const shareText = "🎁 I just claimed my Custom MasterBox from PB DAYS!\n\nGet yours too during October 15-17.\n\nVisit: https://pinkblue.in";

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'PB DAYS MasterBox',
                        text: shareText
                    });
                    console.log('✅ Shared successfully');
                } catch (error) {
                    console.log('Share cancelled or failed');
                    this.fallbackWhatsAppShare(shareText);
                }
            } else {
                this.fallbackWhatsAppShare(shareText);
            }
        });
    }

    fallbackWhatsAppShare(text) {
        const message = encodeURIComponent(text);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;
        const newWindow = window.open(whatsappUrl, '_blank');
        
        if (!newWindow) {
            this.copyToClipboard(text);
            alert('Message copied! Open WhatsApp to paste and share.');
        }
    }

    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    setupReturnModalButton() {
        const returnBtn = document.getElementById('returnModalBtn');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                window.location.href = 'https://pinkblue.in';
            });
        }
    }

    saveCurrentSelections() {
        try {
            const selections = Array.from(this.selectedSpecialties);
            localStorage.setItem('pb_days_specialty_selections', JSON.stringify(selections));
        } catch (error) {
            console.log('⚠️ Could not save selections to storage');
        }
    }

    loadSavedSelections() {
        try {
            const saved = localStorage.getItem('pb_days_specialty_selections');
            if (saved) {
                const selections = JSON.parse(saved);
                selections.forEach(specialtyValue => {
                    const cardElement = document.querySelector(`[data-specialty="${specialtyValue}"]`);
                    if (cardElement) {
                        this.selectedSpecialties.add(specialtyValue);
                        cardElement.classList.add('selected');
                    }
                });
                this.updateProgressIndicator();
                this.updateSubmitButtonState();
                console.log('📋 Restored previous specialty selections');
            }
        } catch (error) {
            console.log('⚠️ Could not load saved selections');
        }
    }

    clearStoredSelections() {
        try {
            localStorage.removeItem('pb_days_specialty_selections');
        } catch (error) {
            // Not critical
        }
    }

    updateUserInterface() {
        this.updateProgressIndicator();
        this.updateSubmitButtonState();
    }

    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showUserMessage(message) {
        alert(message);
    }
}
