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

    async initialize() {
        this.setupEventListeners();
        
        // Show loading for 2.5 seconds
        await this.sleep(2500);
        
        // Get email from URL or prompt
        const urlEmail = this.getEmailFromURL();
        
        if (urlEmail) {
            await this.fetchLatestOrder(urlEmail);
        } else {
            this.hideLoading();
            this.showEmailModal();
        }
    }

    setupEventListeners() {
        // Card selection
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('click', () => this.toggleCard(card));
        });

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleFinalSubmission());
        }

        // Email modal
        const emailSubmit = document.getElementById('emailSubmit');
        const emailInput = document.getElementById('emailInput');
        
        if (emailSubmit) {
            emailSubmit.addEventListener('click', () => this.handleEmailSubmit());
        }
        
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleEmailSubmit();
            });
        }

        // Error modal close
        const errorClose = document.getElementById('errorClose');
        if (errorClose) {
            errorClose.addEventListener('click', () => this.hideModal('errorModal'));
        }
    }

    startWaveAnimation() {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    toggleCard(card) {
        const specialty = card.dataset.specialty;
        
        if (this.selectedSpecialties.has(specialty)) {
            this.selectedSpecialties.delete(specialty);
            card.classList.remove('selected');
        } else {
            if (this.selectedSpecialties.size >= 3) {
                this.showError('Maximum Selection', 'You can select up to 3 specialties');
                return;
            }
            this.selectedSpecialties.add(specialty);
            card.classList.add('selected');
        }
        
        this.updateSelectionStatus();
        this.updateSubmitButton();
    }

    updateSelectionStatus() {
        const status = document.getElementById('selectionStatus');
        const count = this.selectedSpecialties.size;
        
        if (count === 0) {
            status.innerHTML = '<span>No specialties selected</span>';
        } else {
            const list = Array.from(this.selectedSpecialties).join(', ');
            status.innerHTML = `<span>${count} selected: ${list}</span>`;
        }
    }

    updateSubmitButton() {
        const btn = document.getElementById('submitBtn');
        const count = this.selectedSpecialties.size;
        
        btn.disabled = count === 0;
        
        if (count > 0) {
            btn.querySelector('.btn-text').textContent = `Confirm ${count} ${count === 1 ? 'Specialty' : 'Specialties'}`;
        } else {
            btn.querySelector('.btn-text').textContent = 'Confirm Selection';
        }
    }

    async fetchLatestOrder(email) {
        try {
            console.log('📦 Fetching order for:', email);
            
            const response = await fetch('/.netlify/functions/get-latest-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Unable to fetch order. Please contact support@pinkblue.in');
            }

            this.customerData = data.customer;
            this.orderData = data.order;

            await this.checkPreviousSubmission();

        } catch (error) {
            console.error('❌ Fetch error:', error);
            this.hideLoading();
            this.showError('Unable to Fetch Order', error.message);
        }
    }

    async checkPreviousSubmission() {
        try {
            const response = await fetch('/.netlify/functions/check-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: this.orderData.increment_id })
            });

            const data = await response.json();

            if (data.hasSubmitted) {
                this.showAlreadyClaimed(data.submissionData);
            } else {
                this.showMainScreen();
            }

        } catch (error) {
            console.error('⚠️ Check error:', error);
            this.showMainScreen();
        }
    }

    showMainScreen() {
        const nameEl = document.getElementById('customerName');
        if (nameEl && this.customerData) {
            nameEl.textContent = this.customerData.firstname || 'Valued Customer';
        }

        this.hideLoading();
        this.showScreen('mainScreen');
        
        // Start wave animation after screen is visible
        setTimeout(() => this.startWaveAnimation(), 100);
    }

    showAlreadyClaimed(data) {
        document.getElementById('claimedOrderId').textContent = `#${data.orderId || 'N/A'}`;
        document.getElementById('claimedSpecialties').textContent = data.specialties || 'N/A';
        
        this.hideLoading();
        this.showScreen('alreadyClaimedScreen');
    }

    async handleFinalSubmission() {
        if (this.isSubmitting || this.selectedSpecialties.size === 0) return;

        this.isSubmitting = true;
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Submitting...';

        try {
            const selectedArray = Array.from(this.selectedSpecialties);

            const submissionData = {
                email: this.customerData.email,
                firstname: this.customerData.firstname,
                lastname: this.customerData.lastname,
                customerId: this.customerData.id,
                specialties: selectedArray,
                orderId: this.orderData.increment_id,
                orderEntityId: this.orderData.id,
                orderAmount: this.orderData.grand_total,
                testMode: this.isTestMode
            };

            console.log('📤 Submitting:', submissionData);

            const response = await fetch('/.netlify/functions/submit-specialties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Submission failed. Please contact support@pinkblue.in');
            }

            console.log('✅ Success!');
            this.showSuccessScreen(selectedArray);

        } catch (error) {
            console.error('❌ Submission error:', error);
            this.showError('Submission Failed', error.message);
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Confirm Selection';
        } finally {
            this.isSubmitting = false;
        }
    }

    showSuccessScreen(specialties) {
        document.getElementById('successOrderId').textContent = `#${this.orderData.increment_id}`;
        document.getElementById('successSpecialties').textContent = specialties.join(', ');
        document.getElementById('successEmail').textContent = this.customerData.email;
        
        this.showScreen('successScreen');
    }

    async handleEmailSubmit() {
        const input = document.getElementById('emailInput');
        const email = input.value.trim();

        if (!email || !this.validateEmail(email)) {
            this.showError('Invalid Email', 'Please enter a valid email address');
            return;
        }

        this.hideModal('emailModal');
        
        // Show loading while fetching
        document.getElementById('loadingScreen')?.classList.add('active');
        await this.sleep(2500);
        
        await this.fetchLatestOrder(email);
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    getEmailFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('email');
    }

    showScreen(screenId) {
        document.querySelectorAll('.main-screen, .status-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingScreen')?.classList.remove('active');
    }

    showEmailModal() {
        document.getElementById('emailModal')?.classList.add('active');
    }

    showModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    }

    showError(title, message) {
        document.getElementById('errorTitle').textContent = title;
        document.getElementById('errorMessage').textContent = message;
        this.showModal('errorModal');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
