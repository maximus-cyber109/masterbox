// Simple, clean implementation
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
        console.log('🚀 PB DAYS Starting...');
        
        // Start wave animation after 3.5 seconds
        setTimeout(() => {
            this.hideLoadingScreen();
            this.startApp();
        }, 3500);
    }
    
    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loading) loading.classList.add('fade-out');
        if (app) app.classList.add('show');
    }
    
    startApp() {
        this.setupEventListeners();
        this.loadSavedSelections();
        this.initializeAuth();
    }
    
    setupEventListeners() {
        // Email form
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailSubmit();
            });
        }
        
        // Specialty cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                this.toggleCard(card);
            });
        });
        
        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.handleSubmit();
            });
        }
    }
    
    async initializeAuth() {
        console.log('⚙️ Checking authentication...');
        this.showAppLoading();
        
        try {
            await this.getCustomerInfo();
            
            if (this.customerData) {
                console.log('✅ Customer found:', this.customerData.email);
                
                if (this.customerData.email.includes('-forcefetch')) {
                    this.enableTestMode();
                    this.createMockOrder();
                    this.showOrderCard();
                } else {
                    await this.fetchOrder(this.customerData.email);
                    if (this.orderData) {
                        this.showOrderCard();
                        const hasSubmitted = await this.checkSubmission();
                        if (hasSubmitted) {
                            this.showAlreadySubmitted();
                            return;
                        }
                    }
                }
            } else {
                throw new Error('No customer data');
            }
        } catch (error) {
            console.log('ℹ️ No auth, showing email modal');
            this.showEmailModal();
            return;
        }
        
        this.hideAppLoading();
        this.updateUI();
    }
    
    enableTestMode() {
        console.log('🧪 TEST MODE');
        this.isTestMode = true;
        
        const badge = document.createElement('div');
        badge.className = 'test-badge';
        badge.textContent = 'TEST';
        document.body.appendChild(badge);
    }
    
    createMockOrder() {
        const cleanEmail = this.customerData.email.replace('-forcefetch', '');
        this.customerData.email = cleanEmail;
        
        this.orderData = {
            id: `TEST_${Date.now()}`,
            increment_id: `TEST-${Math.floor(Math.random() * 10000)}`,
            grand_total: '0.00'
        };
    }
    
    showAppLoading() {
        const loading = document.getElementById('appLoading');
        if (loading) loading.style.display = 'flex';
    }
    
    hideAppLoading() {
        const loading = document.getElementById('appLoading');
        if (loading) loading.style.display = 'none';
    }
    
    showEmailModal() {
        this.hideAppLoading();
        const modal = document.getElementById('emailModal');
        if (modal) modal.classList.add('show');
    }
    
    async handleEmailSubmit() {
        const input = document.getElementById('emailInput');
        const loading = document.getElementById('emailLoading');
        const text = document.getElementById('emailText');
        
        if (!input) return;
        
        const email = input.value.trim();
        if (!email) {
            alert('Please enter your email');
            return;
        }
        
        if (loading) loading.style.display = 'inline-block';
        if (text) text.textContent = 'Processing...';
        
        try {
            if (email.includes('-forcefetch')) {
                console.log('🧪 Test mode');
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
                await this.fetchOrder(email);
                
                if (this.customerData && this.orderData) {
                    this.hideEmailModal();
                    this.showOrderCard();
                    
                    const hasSubmitted = await this.checkSubmission();
                    if (hasSubmitted) {
                        this.showAlreadySubmitted();
                    } else {
                        this.updateUI();
                    }
                } else {
                    throw new Error('No orders found');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Could not find orders. Add "-forcefetch" to email for testing.');
        } finally {
            if (loading) loading.style.display = 'none';
            if (text) text.textContent = 'Fetch My Order';
        }
    }
    
    hideEmailModal() {
        const modal = document.getElementById('emailModal');
        if (modal) modal.classList.remove('show');
    }
    
    showOrderCard() {
        if (!this.customerData || !this.orderData) return;
        
        const customerName = document.getElementById('customerName');
        const orderNumber = document.getElementById('orderNumber');
        const orderAmount = document.getElementById('orderAmount');
        const orderCard = document.getElementById('orderCard');
        
        if (customerName) customerName.textContent = `Welcome, ${this.customerData.firstname}!`;
        
        if (this.isTestMode) {
            if (orderNumber) orderNumber.textContent = `${this.orderData.increment_id} (TEST)`;
            if (orderAmount) orderAmount.textContent = 'TEST MODE';
        } else {
            if (orderNumber) orderNumber.textContent = `Order #${this.orderData.increment_id}`;
            if (orderAmount) orderAmount.textContent = `₹${parseFloat(this.orderData.grand_total).toLocaleString()}`;
        }
        
        if (orderCard) orderCard.classList.add('show');
    }
    
    async getCustomerInfo() {
        const token = this.getBearerToken();
        if (!token) throw new Error('No token');
        
        const response = await fetch('/.netlify/functions/get-customer-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.fallback) throw new Error('API unavailable');
        
        this.customerData = data.customer;
    }
    
    getBearerToken() {
        try {
            if (window.parent !== window) {
                const token = window.parent.customerToken || window.parent.localStorage?.getItem('customerToken');
                if (token) return token;
            }
        } catch (e) {}
        
        const localToken = localStorage.getItem('customerToken') || sessionStorage.getItem('customerToken');
        if (localToken) return localToken;
        
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }
    
    async fetchOrder(email) {
        const response = await fetch('/.netlify/functions/get-latest-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        this.customerData = data.customer;
        this.orderData = data.order;
    }
    
    async checkSubmission() {
        if (this.isTestMode) return false;
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
                const info = document.getElementById('submissionInfo');
                if (info) {
                    info.innerHTML = `
                        <p><strong>Order:</strong> #${this.orderData.increment_id}</p>
                        <p><strong>Submitted:</strong> ${new Date(data.submissionData.timestamp).toLocaleDateString()}</p>
                        <p><strong>Specialties:</strong> ${data.submissionData.specialties}</p>
                    `;
                }
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }
    
    toggleCard(card) {
        if (this.isSubmitting) return;
        
        const specialty = card.dataset.specialty;
        
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            this.selectedSpecialties.delete(specialty);
        } else {
            card.classList.add('selected');
            this.selectedSpecialties.add(specialty);
        }
        
        this.updateCounter();
        this.updateSubmitBtn();
        this.saveSelections();
        
        if (navigator.vibrate) navigator.vibrate(10);
    }
    
    updateCounter() {
        const counter = document.getElementById('counter');
        if (!counter) return;
        
        const count = this.selectedSpecialties.size;
        
        if (count === 0) {
            counter.textContent = 'No specialties selected';
            counter.classList.remove('active');
        } else if (count === 1) {
            counter.textContent = '1 specialty selected';
            counter.classList.add('active');
        } else {
            counter.textContent = `${count} specialties selected`;
            counter.classList.add('active');
        }
    }
    
    updateSubmitBtn() {
        const btn = document.getElementById('submitBtn');
        const text = document.getElementById('submitText');
        if (!btn || !text) return;
        
        if (this.selectedSpecialties.size === 0) {
            btn.disabled = true;
            text.textContent = 'Select Specialties';
        } else {
            btn.disabled = false;
            text.textContent = this.isTestMode ? 'Test Claim' : 'Claim My MasterBox';
        }
    }
    
    async handleSubmit() {
        if (this.isSubmitting || this.selectedSpecialties.size === 0) return;
        if (!this.customerData || !this.orderData) {
            alert('Order info not available');
            return;
        }
        
        this.isSubmitting = true;
        this.showSubmitLoading();
        
        try {
            const specialties = Array.from(this.selectedSpecialties);
            const data = {
                email: this.customerData.email,
                firstname: this.customerData.firstname,
                lastname: this.customerData.lastname,
                customerId: this.customerData.id,
                specialties: specialties,
                orderId: this.orderData.increment_id,
                orderEntityId: this.orderData.id,
                orderAmount: this.orderData.grand_total,
                testMode: this.isTestMode
            };
            
            const response = await fetch('/.netlify/functions/submit-specialties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.status === 409) {
                alert('Order already claimed MasterBox');
                this.showAlreadySubmitted();
                return;
            }
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Submission failed');
            }
            
            console.log('✅ Success!');
            this.clearSelections();
            this.showSuccess();
            
        } catch (error) {
            console.error('❌ Failed:', error);
            alert('Error claiming MasterBox. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.hideSubmitLoading();
        }
    }
    
    showSubmitLoading() {
        const btn = document.getElementById('submitBtn');
        const loading = document.getElementById('submitLoading');
        const text = document.getElementById('submitText');
        
        if (btn) btn.disabled = true;
        if (loading) loading.style.display = 'inline-block';
        if (text) text.textContent = 'Processing...';
    }
    
    hideSubmitLoading() {
        const loading = document.getElementById('submitLoading');
        if (loading) loading.style.display = 'none';
        this.updateSubmitBtn();
    }
    
    showAlreadySubmitted() {
        const form = document.getElementById('formSection');
        const submit = document.getElementById('submitArea');
        const already = document.getElementById('alreadySubmitted');
        
        if (form) form.style.display = 'none';
        if (submit) submit.style.display = 'none';
        if (already) already.classList.add('show');
    }
    
    showSuccess() {
        const form = document.getElementById('formSection');
        const submit = document.getElementById('submitArea');
        const success = document.getElementById('success');
        
        if (form) form.style.display = 'none';
        if (submit) submit.style.display = 'none';
        if (success) success.classList.add('show');
    }
    
    saveSelections() {
        try {
            const selections = Array.from(this.selectedSpecialties);
            localStorage.setItem('pb_days_selections', JSON.stringify(selections));
        } catch (error) {}
    }
    
    loadSavedSelections() {
        try {
            const saved = localStorage.getItem('pb_days_selections');
            if (saved) {
                const selections = JSON.parse(saved);
                selections.forEach(specialty => {
                    const card = document.querySelector(`[data-specialty="${specialty}"]`);
                    if (card) {
                        card.classList.add('selected');
                        this.selectedSpecialties.add(specialty);
                    }
                });
                this.updateCounter();
                this.updateSubmitBtn();
            }
        } catch (error) {}
    }
    
    clearSelections() {
        try {
            localStorage.removeItem('pb_days_selections');
        } catch (error) {}
    }
    
    updateUI() {
        this.updateCounter();
        this.updateSubmitBtn();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    new PBDaysApp();
});
