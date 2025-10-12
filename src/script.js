// Wait for DOM to be fully loaded
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
        // Email form submission
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailSubmission();
            });
        }
        
        // Specialty selection
        const specialtyCards = document.querySelectorAll('.card');
        specialtyCards.forEach(card => {
            card.addEventListener('click', () => {
                this.toggleCard(card);
            });
        });
        
        // Submit button
        const submitButton = document.getElementById('submitBtn');
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                this.handleFinalSubmission();
            });
        }
        
        // Load any saved selections
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
        }, 4000);
    }
    
    async initializeApplication() {
        console.log('⚙️ Initializing application...');
        this.showAppLoading();
        
        try {
            await this.getCustomerInformation();
            
            if (this.customerData) {
                console.log('✅ Customer found:', this.customerData.email);
                
                if (this.customerData.email.includes('-forcefetch')) {
                    this.activateTestMode();
                    this.generateMockOrder();
                    this.displayOrderInfo();
                } else {
                    await this.fetchCustomerOrder(this.customerData.email);
                    if (this.orderData) {
                        this.displayOrderInfo();
                        
                        const alreadySubmitted = await this.checkExistingSubmission();
                        if (alreadySubmitted) {
                            this.showAlreadySubmittedState();
                            return;
                        }
                    }
                }
            } else {
                throw new Error('No customer data available');
            }
        } catch (error) {
            console.log('ℹ️ No customer session, showing email modal');
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
    
    generateMockOrder() {
        const cleanEmail = this.customerData.email.replace('-forcefetch', '');
        this.customerData.email = cleanEmail;
        
        this.orderData = {
            id: `TEST_${Date.now()}`,
            increment_id: `TEST-${Math.floor(Math.random() * 10000)}`,
            grand_total: '0.00',
            status: 'test'
        };
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
        if (fetchLabel) fetchLabel.textContent = 'Processing...';
        
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
                
                this.generateMockOrder();
                this.hideEmailModal();
                this.displayOrderInfo();
                this.updateUserInterface();
                
            } else {
                await this.fetchCustomerOrder(email);
                
                if (this.customerData && this.orderData) {
                    this.hideEmailModal();
                    this.displayOrderInfo();
                    
                    const alreadySubmitted = await this.checkExistingSubmission();
                    if (alreadySubmitted) {
                        this.showAlreadySubmittedState();
                    } else {
                        this.updateUserInterface();
                    }
                } else {
                    throw new Error('No recent orders found for this email');
                }
            }
        } catch (error) {
            console.error('❌ Email processing failed:', error);
            this.showUserMessage('Could not find recent orders. Add "-forcefetch" to your email for testing mode.');
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
    
    displayOrderInfo() {
        if (!this.customerData || !this.orderData) return;
        
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
                const token = window.parent.customerToken || 
                             window.parent.localStorage?.getItem('customerToken');
                if (token) return token;
            }
        } catch (error) {
            // CORS error expected
        }
        
        const localToken = localStorage.getItem('customerToken') || 
                          sessionStorage.getItem('customerToken');
        if (localToken) return localToken;
        
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }
    
    async fetchCustomerOrder(email) {
        console.log('📦 Fetching latest order for:', email);
        
        const response = await fetch('/.netlify/functions/get-latest-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Order fetch failed');
        }
        
        this.customerData = data.customer;
        this.orderData = data.order;
        
        console.log('📦 Order retrieved:', this.orderData.increment_id);
    }
    
    async checkExistingSubmission() {
        if (this.isTestMode) {
            console.log('🧪 Test mode - skipping duplicate check');
            return false;
        }
        
        if (!this.orderData) return false;
        
        try {
            const response = await fetch('/.netlify/functions/check-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.orderData.id,
                    orderIncrementId: this.orderData.increment_id
                })
            });
            
            const data = await response.json();
            
            if (data.hasSubmitted) {
                const submissionInfoElement = document.getElementById('submissionInfo');
                if (submissionInfoElement) {
                    submissionInfoElement.innerHTML = `
                        <p><strong>Order:</strong> #${this.orderData.increment_id}</p>
                        <p><strong>Submitted:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                        <p><strong>Specialties:</strong> ${data.submissionData.specialties}</p>
                    `;
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.log('⚠️ Could not verify previous submission');
            return false;
        }
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
        
        if (!this.customerData || !this.orderData) {
            this.showUserMessage('Order information not available');
            return;
        }
        
        this.isSubmitting = true;
        this.showSubmissionLoading();
        
        try {
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
            this.showUserMessage('Failed to claim MasterBox. Please try again.');
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
        if (submitText) submitText.textContent = 'Processing...';
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
        const successState = document.getElementById('success');
        
        if (specialtySection) specialtySection.style.display = 'none';
        if (submitArea) submitArea.style.display = 'none';
        if (successState) successState.classList.add('show');
        
        // Initialize 3D box and buttons
        setTimeout(() => {
            this.init3DBox();
            this.setupShareButton();
            this.setupReturnButton();
        }, 300);
    }
    
    // 3D Box Interaction
    init3DBox() {
        const box = document.getElementById('masterbox3D');
        if (!box) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentRotationX = 0;
        let currentRotationY = 0;

        const handleDragStart = (e) => {
            isDragging = true;
            box.style.animation = 'none';
            
            if (e.type === 'mousedown') {
                startX = e.clientX;
                startY = e.clientY;
            } else {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
            
            e.preventDefault();
        };

        const handleDragMove = (e) => {
            if (!isDragging) return;
            
            let currentX, currentY;
            if (e.type === 'mousemove') {
                currentX = e.clientX;
                currentY = e.clientY;
            } else {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            }
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            currentRotationY += deltaX * 0.5;
            currentRotationX -= deltaY * 0.5;
            
            box.style.transform = `rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`;
            
            startX = currentX;
            startY = currentY;
            
            e.preventDefault();
        };

        const handleDragEnd = () => {
            isDragging = false;
        };

        box.addEventListener('mousedown', handleDragStart);
        box.addEventListener('touchstart', handleDragStart);
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove);
        
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);

        // Auto-spin on load
        setTimeout(() => {
            box.classList.add('spinning');
            setTimeout(() => {
                box.classList.remove('spinning');
            }, 2000);
        }, 500);
    }

    // Share to WhatsApp
    setupShareButton() {
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const message = encodeURIComponent(
                    "🎁 I just claimed my Custom MasterBox from PB DAYS!\n\n" +
                    "Get yours too during October 15-17.\n\n" +
                    "Visit: https://pinkblue.in"
                );
                
                const whatsappUrl = `https://wa.me/?text=${message}`;
                window.location.href = whatsappUrl;
            });
        }
    }

    // Return to PinkBlue
    setupReturnButton() {
        const returnBtn = document.getElementById('returnBtn');
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
