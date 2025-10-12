class PBDaysApp {
    constructor() {
        this.selectedSpecialties = new Set();
        this.customerData = null;
        this.orderData = null;
        this.isSubmitting = false;
        this.isTestMode = false;
        
        this.init();
    }
    
    init() {
        console.log('🚀 PB DAYS Premium Experience Starting...');
        this.setupEventListeners();
        this.startWaveAnimation();
    }
    
    setupEventListeners() {
        // Specialty cards
        document.querySelectorAll('.specialty-card').forEach(card => {
            card.addEventListener('click', () => this.toggleSpecialty(card));
        });
        
        // Email form
        document.getElementById('emailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSubmit();
        });
        
        // Submit button
        document.getElementById('submitButton').addEventListener('click', () => this.handleSubmit());
        
        // Load saved selections
        this.loadSavedSelections();
    }
    
    startWaveAnimation() {
        setTimeout(() => {
            const waveContainer = document.getElementById('waveContainer');
            waveContainer.classList.add('fade-out');
            
            setTimeout(() => {
                waveContainer.style.display = 'none';
                document.getElementById('appContainer').classList.add('show');
                this.initializeApp();
            }, 1500);
        }, 3500);
    }
    
    async initializeApp() {
        console.log('⚙️ Initializing application...');
        this.showLoading();
        
        try {
            // Try to get customer info from session
            await this.getCustomerInfo();
            
            if (this.customerData) {
                console.log('✅ Customer session found:', this.customerData.email);
                
                // Check for test mode
                if (this.customerData.email.includes('-forcefetch')) {
                    this.enableTestMode();
                    this.createMockOrder();
                    this.showOrderCard();
                } else {
                    // Try to fetch real order
                    await this.fetchLatestOrder(this.customerData.email);
                    if (this.orderData) {
                        this.showOrderCard();
                        
                        // Check if already submitted
                        const hasSubmitted = await this.checkPreviousSubmission();
                        if (hasSubmitted) {
                            this.showAlreadySubmitted();
                            return;
                        }
                    }
                }
            } else {
                throw new Error('No customer session');
            }
        } catch (error) {
            console.log('ℹ️ No session found, showing email modal');
            this.showEmailModal();
            return;
        }
        
        this.hideLoading();
        this.updateUI();
    }
    
    enableTestMode() {
        console.log('🧪 TEST MODE ENABLED');
        this.isTestMode = true;
        
        // Add test mode indicator
        const indicator = document.createElement('div');
        indicator.className = 'test-mode-indicator';
        indicator.textContent = 'TEST MODE';
        document.body.appendChild(indicator);
    }
    
    createMockOrder() {
        const cleanEmail = this.customerData.email.replace('-forcefetch', '');
        this.customerData.email = cleanEmail;
        
        this.orderData = {
            id: `TEST_${Date.now()}`,
            increment_id: `TEST-${Math.floor(Math.random() * 10000)}`,
            grand_total: '0.00',
            status: 'test'
        };
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    showEmailModal() {
        this.hideLoading();
        document.getElementById('emailModal').style.display = 'flex';
    }
    
    async handleEmailSubmit() {
        const email = document.getElementById('fallbackEmail').value.trim();
        
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }
        
        if (!this.isValidEmail(email.replace('-forcefetch', ''))) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        const spinner = document.getElementById('modalSpinner');
        const buttonText = document.getElementById('modalButtonText');
        
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Processing...';
        
        try {
            if (email.includes('-forcefetch')) {
                console.log('🧪 Test mode detected');
                this.enableTestMode();
                
                this.customerData = {
                    id: `TEST_${Date.now()}`,
                    email: email.replace('-forcefetch', ''),
                    firstname: 'Test',
                    lastname: 'User'
                };
                
                this.createMockOrder();
                this.hideEmailModal();
                this.showOrderCard();
                this.updateUI();
                
            } else {
                await this.fetchLatestOrder(email);
                
                if (this.customerData && this.orderData) {
                    this.hideEmailModal();
                    this.showOrderCard();
                    
                    const hasSubmitted = await this.checkPreviousSubmission();
                    if (hasSubmitted) {
                        this.showAlreadySubmitted();
                    } else {
                        this.updateUI();
                    }
                } else {
                    throw new Error('No recent orders found');
                }
            }
        } catch (error) {
            console.error('❌ Email processing failed:', error);
            this.showError('Could not find recent orders. Add "-forcefetch" to your email for testing.');
        } finally {
            spinner.style.display = 'none';
            buttonText.textContent = 'Fetch My Order';
        }
    }
    
    hideEmailModal() {
        document.getElementById('emailModal').style.display = 'none';
    }
    
    showOrderCard() {
        if (!this.customerData || !this.orderData) return;
        
        document.getElementById('customerName').textContent = 
            `Welcome, ${this.customerData.firstname}!`;
        
        if (this.isTestMode) {
            document.getElementById('orderNumber').textContent = 
                `${this.orderData.increment_id} (TEST)`;
            document.getElementById('orderAmount').textContent = 'TEST MODE';
        } else {
            document.getElementById('orderNumber').textContent = 
                `Order #${this.orderData.increment_id}`;
            document.getElementById('orderAmount').textContent = 
                `₹${parseFloat(this.orderData.grand_total).toLocaleString()}`;
        }
        
        document.getElementById('orderCard').style.display = 'block';
    }
    
    async getCustomerInfo() {
        // Try various token sources
        let bearerToken = this.getBearerToken();
        
        if (!bearerToken) {
            throw new Error('No bearer token available');
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
    
    getBearerToken() {
        // Try parent window
        try {
            if (window.parent !== window) {
                const token = window.parent.customerToken || 
                             window.parent.localStorage?.getItem('customerToken');
                if (token) return token;
            }
        } catch (e) {}
        
        // Try local storage
        const localToken = localStorage.getItem('customerToken') || 
                          sessionStorage.getItem('customerToken');
        if (localToken) return localToken;
        
        // Try URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }
    
    async fetchLatestOrder(email) {
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
        
        console.log('📦 Order found:', this.orderData.increment_id);
    }
    
    async checkPreviousSubmission() {
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
                const details = document.getElementById('submissionDetails');
                details.innerHTML = `
                    <p><strong>Order:</strong> #${this.orderData.increment_id}</p>
                    <p><strong>Submitted:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                    <p><strong>Specialties:</strong> ${data.submissionData.specialties}</p>
                    <p><strong>Count:</strong> ${data.submissionData.count}</p>
                `;
                return true;
            }
            
            return false;
        } catch (error) {
            console.log('⚠️ Could not verify previous submission');
            return false;
        }
    }
    
    toggleSpecialty(card) {
        if (this.isSubmitting) return;
        
        const specialty = card.dataset.specialty;
        
        if (this.selectedSpecialties.has(specialty)) {
            this.selectedSpecialties.delete(specialty);
            card.classList.remove('selected');
        } else {
            this.selectedSpecialties.add(specialty);
            card.classList.add('selected');
        }
        
        this.updateSelectionStatus();
        this.updateSubmitButton();
        this.saveSelections();
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    updateSelectionStatus() {
        const count = this.selectedSpecialties.size;
        const statusText = document.querySelector('.status-text');
        const statusFill = document.getElementById('statusFill');
        
        if (count === 0) {
            statusText.textContent = 'No specialties selected';
            statusText.classList.remove('active');
        } else if (count === 1) {
            statusText.textContent = '1 specialty selected';
            statusText.classList.add('active');
        } else {
            statusText.textContent = `${count} specialties selected`;
            statusText.classList.add('active');
        }
        
        // Update progress bar
        const maxSpecialties = 7;
        const progress = (count / maxSpecialties) * 100;
        statusFill.style.width = `${progress}%`;
    }
    
    updateSubmitButton() {
        const button = document.getElementById('submitButton');
        const buttonText = document.getElementById('buttonText');
        
        if (this.selectedSpecialties.size === 0) {
            button.disabled = true;
            buttonText.textContent = 'Select Specialties';
        } else {
            button.disabled = false;
            if (this.isTestMode) {
                buttonText.textContent = 'Test Claim MasterBox';
            } else {
                buttonText.textContent = 'Claim My MasterBox';
            }
        }
    }
    
    async handleSubmit() {
        if (this.isSubmitting || this.selectedSpecialties.size === 0) return;
        
        if (!this.customerData || !this.orderData) {
            this.showError('Order information not available');
            return;
        }
        
        this.isSubmitting = true;
        this.showSubmitLoading();
        
        try {
            const specialtiesArray = Array.from(this.selectedSpecialties);
            const specialtyNames = specialtiesArray.map(id => this.getSpecialtyName(id));
            
            const submissionData = {
                email: this.customerData.email,
                firstname: this.customerData.firstname,
                lastname: this.customerData.lastname,
                customerId: this.customerData.id,
                specialties: specialtyNames,
                orderId: this.orderData.increment_id,
                orderEntityId: this.orderData.id,
                orderAmount: this.orderData.grand_total,
                testMode: this.isTestMode
            };
            
            console.log('📤 Submitting MasterBox claim...');
            
            const response = await fetch('/.netlify/functions/submit-specialties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });
            
            const result = await response.json();
            
            if (response.status === 409) {
                this.showError('This order has already claimed its MasterBox');
                this.showAlreadySubmitted();
                return;
            }
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Server error: ${response.status}`);
            }
            
            console.log('✅ MasterBox claimed successfully!');
            this.clearSavedSelections();
            this.showSuccess();
            
        } catch (error) {
            console.error('❌ Submission failed:', error);
            this.showError('Failed to claim MasterBox. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.hideSubmitLoading();
        }
    }
    
    getSpecialtyName(id) {
        const names = {
            'endodontist': 'Endodontist',
            'prosthodontist': 'Prosthodontist',
            'orthodontist': 'Orthodontist',
            'oral_surgeon': 'Oral And Maxillofacial Surgeon',
            'paedodontist': 'Paedodontist',
            'periodontist': 'Periodontist',
            'general_dentist': 'General Dentist'
        };
        return names[id] || id;
    }
    
    showSubmitLoading() {
        const button = document.getElementById('submitButton');
        const spinner = document.getElementById('submitSpinner');
        const buttonText = document.getElementById('buttonText');
        
        button.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Processing...';
    }
    
    hideSubmitLoading() {
        const button = document.getElementById('submitButton');
        const spinner = document.getElementById('submitSpinner');
        
        spinner.style.display = 'none';
        this.updateSubmitButton();
    }
    
    showAlreadySubmitted() {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('alreadySubmittedSection').style.display = 'block';
    }
    
    showSuccess() {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('actionSection').style.display = 'none';
        document.getElementById('successSection').style.display = 'block';
    }
    
    saveSelections() {
        try {
            const selections = Array.from(this.selectedSpecialties);
            localStorage.setItem('pb_days_selections', JSON.stringify(selections));
        } catch (error) {
            console.log('⚠️ Could not save selections');
        }
    }
    
    loadSavedSelections() {
        try {
            const saved = localStorage.getItem('pb_days_selections');
            if (saved) {
                const selections = JSON.parse(saved);
                selections.forEach(specialty => {
                    const card = document.querySelector(`[data-specialty="${specialty}"]`);
                    if (card) {
                        this.selectedSpecialties.add(specialty);
                        card.classList.add('selected');
                    }
                });
                this.updateSelectionStatus();
                this.updateSubmitButton();
                console.log('📋 Restored previous selections');
            }
        } catch (error) {
            console.log('⚠️ Could not load saved selections');
        }
    }
    
    clearSavedSelections() {
        try {
            localStorage.removeItem('pb_days_selections');
        } catch (error) {}
    }
    
    updateUI() {
        this.updateSelectionStatus();
        this.updateSubmitButton();
    }
    
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    showError(message) {
        alert(message); // You can replace this with a better modal/toast
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PBDaysApp();
});
