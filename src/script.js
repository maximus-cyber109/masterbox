console.log('🚀 PB DAYS Premium Experience Starting...');

// Specialty data
const SPECIALTIES = [
    { id: 'endodontist', name: 'Endodontist', icon: '🦷', description: 'Root canal specialists' },
    { id: 'prosthodontist', name: 'Prosthodontist', icon: '👑', description: 'Prosthetic dentistry experts' },
    { id: 'orthodontist', name: 'Orthodontist', icon: '🎯', description: 'Teeth alignment specialists' },
    { id: 'oral_surgeon', name: 'Oral And Maxillofacial Surgeon', icon: '⚕️', description: 'Surgical procedures experts' },
    { id: 'paedodontist', name: 'Paedodontist', icon: '👶', description: 'Children\'s dentistry specialists' },
    { id: 'periodontist', name: 'Periodontist', icon: '🌿', description: 'Gum disease specialists' },
    { id: 'general_dentist', name: 'General Dentist', icon: '🏥', description: 'Comprehensive dental care' }
];

class PBDaysApp {
    constructor() {
        this.selectedSpecialties = new Set();
        this.customerData = null;
        this.orderData = null;
        this.isSubmitting = false;
        
        this.initialize();
    }

    async initialize() {
        console.log('⚙️ Initializing application...');
        
        // Show loading screen briefly
        this.showScreen('loadingScreen');
        
        // Wait 2.5 seconds for loading animation
        await this.sleep(2500);
        
        // Get email from URL or prompt
        const email = this.getEmailFromURL();
        
        if (email) {
            console.log('📧 Email found in URL parameter:', email);
            await this.fetchLatestOrder(email);
        } else {
            console.log('ℹ️ No customer session, showing email modal');
            this.hideScreen('loadingScreen');
            this.showModal('emailModal');
        }
        
        this.setupEventListeners();
        this.renderSpecialties();
    }

    setupEventListeners() {
        // Email submit
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

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmission());
        }

        // Error modal close
        const errorClose = document.getElementById('errorClose');
        if (errorClose) {
            errorClose.addEventListener('click', () => this.hideModal('errorModal'));
        }
    }

    renderSpecialties() {
        const grid = document.getElementById('specialtiesGrid');
        if (!grid) return;

        grid.innerHTML = SPECIALTIES.map(specialty => `
            <div class="card" data-specialty="${specialty.id}">
                <div class="card-header">
                    <span class="card-icon">${specialty.icon}</span>
                    <h3 class="card-title">${specialty.name}</h3>
                </div>
                <p class="card-description">${specialty.description}</p>
                <div class="card-checkbox"></div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => this.toggleSpecialty(card));
        });
    }

    toggleSpecialty(card) {
        const specialtyId = card.dataset.specialty;
        
        if (this.selectedSpecialties.has(specialtyId)) {
            this.selectedSpecialties.delete(specialtyId);
            card.classList.remove('selected');
        } else {
            if (this.selectedSpecialties.size >= 3) {
                this.showError('Maximum Selection', 'You can select up to 3 specialties only');
                return;
            }
            this.selectedSpecialties.add(specialtyId);
            card.classList.add('selected');
        }

        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const btn = document.getElementById('submitBtn');
        if (!btn) return;

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
            console.log('📦 Fetching latest order for:', email);
            
            const response = await fetch('/.netlify/functions/get-latest-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            console.log('📦 Order retrieved:', data.order?.increment_id);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch order');
            }

            this.customerData = data.customer;
            this.orderData = data.order;

            // Check if already claimed
            await this.checkPreviousSubmission();

        } catch (error) {
            console.error('❌ Error fetching order:', error);
            this.hideScreen('loadingScreen');
            this.showError(
                'Unable to Fetch Order',
                'We couldn\'t retrieve your order details. Please contact support@pinkblue.in'
            );
        }
    }

    async checkPreviousSubmission() {
        try {
            const response = await fetch('/.netlify/functions/check-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId: this.orderData.increment_id 
                })
            });

            const data = await response.json();

            if (data.hasSubmitted) {
                this.showAlreadyClaimed(data.submissionData);
            } else {
                this.showMainScreen();
            }

        } catch (error) {
            console.error('⚠️ Check submission error:', error);
            this.showMainScreen(); // Continue anyway
        }
    }

    showMainScreen() {
        // Update customer name
        const nameEl = document.getElementById('customerName');
        if (nameEl && this.customerData) {
            const name = this.customerData.firstname || 'Valued Customer';
            nameEl.textContent = name;
        }

        this.hideScreen('loadingScreen');
        this.showScreen('mainScreen');
    }

    showAlreadyClaimed(data) {
        document.getElementById('claimedOrderId').textContent = `#${data.orderId || 'N/A'}`;
        document.getElementById('claimedSpecialties').textContent = data.specialties || 'N/A';
        
        this.hideScreen('loadingScreen');
        this.showScreen('alreadyClaimedScreen');
    }

    async handleSubmission() {
        if (this.isSubmitting || this.selectedSpecialties.size === 0) return;

        this.isSubmitting = true;
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Submitting...';

        try {
            const selectedNames = Array.from(this.selectedSpecialties).map(id => {
                const specialty = SPECIALTIES.find(s => s.id === id);
                return specialty.name;
            });

            const submissionData = {
                email: this.customerData.email,
                firstname: this.customerData.firstname,
                lastname: this.customerData.lastname,
                customerId: this.customerData.id,
                specialties: selectedNames,
                orderId: this.orderData.increment_id,
                orderEntityId: this.orderData.id,
                orderAmount: this.orderData.grand_total
            };

            console.log('📤 Submitting:', submissionData);

            const response = await fetch('/.netlify/functions/submit-specialties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Submission failed');
            }

            console.log('✅ Submission successful!');
            this.showSuccessScreen(selectedNames);

        } catch (error) {
            console.error('❌ Submission error:', error);
            this.showError(
                'Submission Failed',
                error.message || 'Unable to submit your selection. Please contact support@pinkblue.in'
            );
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
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });
        
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }

    hideScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('active');
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PBDaysApp();
});
