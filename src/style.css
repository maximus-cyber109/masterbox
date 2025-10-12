* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --black: #000000;
    --white: #ffffff;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    --blue: #3b82f6;
    --green: #10b981;
    --red: #ef4444;
    --yellow: #f59e0b;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--black);
    color: var(--white);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}

/* Audio Wave Loading Animation */
.wave-loading-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 1;
    transition: opacity 1.5s ease-out;
}

.wave-loading-container.fade-out {
    opacity: 0;
    pointer-events: none;
}

.audio-wave-animation {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 3rem;
}

.wave-bars {
    display: flex;
    align-items: end;
    gap: 4px;
    height: 120px;
    padding: 0 20px;
}

.bar {
    width: 6px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 3px;
    animation: wave-bounce 1.5s ease-in-out infinite;
    min-height: 8px;
}

.bar:nth-child(1) { animation-delay: 0s; }
.bar:nth-child(2) { animation-delay: 0.1s; }
.bar:nth-child(3) { animation-delay: 0.2s; }
.bar:nth-child(4) { animation-delay: 0.3s; }
.bar:nth-child(5) { animation-delay: 0.4s; }
.bar:nth-child(6) { animation-delay: 0.5s; }
.bar:nth-child(7) { animation-delay: 0.6s; }
.bar:nth-child(8) { animation-delay: 0.7s; }
.bar:nth-child(9) { animation-delay: 0.8s; }
.bar:nth-child(10) { animation-delay: 0.9s; }
.bar:nth-child(11) { animation-delay: 1s; }
.bar:nth-child(12) { animation-delay: 0.9s; }
.bar:nth-child(13) { animation-delay: 0.8s; }
.bar:nth-child(14) { animation-delay: 0.7s; }
.bar:nth-child(15) { animation-delay: 0.6s; }
.bar:nth-child(16) { animation-delay: 0.5s; }
.bar:nth-child(17) { animation-delay: 0.4s; }
.bar:nth-child(18) { animation-delay: 0.3s; }
.bar:nth-child(19) { animation-delay: 0.2s; }
.bar:nth-child(20) { animation-delay: 0.1s; }

@keyframes wave-bounce {
    0%, 100% { height: 20px; opacity: 0.6; }
    25% { height: 80px; opacity: 1; }
    50% { height: 120px; opacity: 0.9; }
    75% { height: 60px; opacity: 0.8; }
}

.loading-content {
    text-align: center;
    color: var(--white);
    padding: 0 2rem;
}

.success-circle {
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.15);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 2rem;
    backdrop-filter: blur(10px);
    animation: circle-pulse 2s ease-in-out infinite;
}

@keyframes circle-pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
    50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
}

.checkmark {
    font-size: 2rem;
    color: var(--white);
    animation: check-appear 0.8s ease-out;
}

@keyframes check-appear {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
    100% { transform: scale(1) rotate(360deg); opacity: 1; }
}

.loading-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.loading-subtitle {
    font-size: 1rem;
    opacity: 0.9;
    font-weight: 300;
}

/* Main App Container */
.main-app {
    max-width: 400px;
    margin: 0 auto;
    min-height: 100vh;
    background: var(--black);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s ease;
    display: flex;
    flex-direction: column;
}

.main-app.show {
    opacity: 1;
    transform: translateY(0);
}

/* Header */
.app-header {
    padding: 2.5rem 1.5rem 2rem;
    background: linear-gradient(180deg, var(--gray-900) 0%, var(--black) 100%);
    border-bottom: 1px solid var(--gray-800);
    text-align: center;
}

.brand-section {
    margin-bottom: 1.5rem;
}

.brand-name {
    font-size: 2rem;
    font-weight: 800;
    color: var(--white);
    margin-bottom: 0.25rem;
    letter-spacing: -0.025em;
}

.brand-date {
    color: var(--gray-500);
    font-size: 0.875rem;
}

.header-divider {
    width: 40px;
    height: 2px;
    background: var(--white);
    margin: 0 auto;
    opacity: 0.8;
}

.title-section {
    margin-top: 1.5rem;
}

.page-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 0.5rem;
}

.page-desc {
    color: var(--gray-400);
    font-size: 0.875rem;
}

/* Loading State */
.app-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--black);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.loading-spinner {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.spinner-dot {
    width: 12px;
    height: 12px;
    background: var(--white);
    border-radius: 50%;
    animation: dot-bounce 1.4s ease-in-out infinite both;
}

.spinner-dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-dot:nth-child(2) { animation-delay: -0.16s; }
.spinner-dot:nth-child(3) { animation-delay: 0s; }

@keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1.2); opacity: 1; }
}

.loading-message {
    color: var(--gray-500);
    font-size: 1rem;
}

/* Email Modal */
.email-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1rem;
    backdrop-filter: blur(10px);
}

.email-modal.show {
    display: flex;
}

.modal-card {
    background: var(--gray-900);
    border: 1px solid var(--gray-700);
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 320px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
}

.modal-header {
    text-align: center;
    margin-bottom: 2rem;
}

.modal-emoji {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.modal-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 0.5rem;
}

.modal-header p {
    color: var(--gray-400);
    font-size: 0.875rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group input {
    width: 100%;
    padding: 1rem;
    background: var(--black);
    border: 1px solid var(--gray-600);
    border-radius: 8px;
    color: var(--white);
    font-size: 1rem;
    text-align: center;
    transition: all 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--white);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.form-group input::placeholder {
    color: var(--gray-500);
}

.modal-button {
    width: 100%;
    height: 50px;
    background: var(--white);
    color: var(--black);
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
}

.modal-button:hover {
    background: var(--gray-100);
    transform: translateY(-1px);
}

.button-loader {
    display: none;
    width: 16px;
    height: 16px;
    border: 2px solid var(--gray-400);
    border-top-color: var(--black);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Order Info Card */
.order-info-card {
    margin: 1.5rem;
    background: var(--white);
    color: var(--black);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(255, 255, 255, 0.1);
    display: none;
}

.order-info-card.show {
    display: block;
}

.order-details {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
}

.customer-welcome h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--black);
}

.order-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
}

.order-id {
    color: var(--gray-600);
    font-size: 0.875rem;
}

.order-value {
    color: var(--green);
    font-size: 1rem;
    font-weight: 700;
}

.eligibility-badge {
    background: var(--black);
    color: var(--white);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    width: fit-content;
}

/* Content Area */
.content-area {
    flex: 1;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
}

.specialty-section {
    padding: 1.5rem 0;
}

.section-title {
    text-align: center;
    margin-bottom: 2rem;
}

.section-title h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 0.5rem;
}

.section-title p {
    color: var(--gray-400);
    font-size: 0.875rem;
}

.progress-indicator {
    text-align: center;
    margin-bottom: 2rem;
}

.progress-text {
    color: var(--gray-500);
    font-size: 0.875rem;
    display: block;
    margin-bottom: 0.75rem;
    transition: color 0.3s ease;
}

.progress-text.active {
    color: var(--white);
    font-weight: 600;
}

.progress-track {
    width: 100px;
    height: 4px;
    background: var(--gray-800);
    border-radius: 2px;
    margin: 0 auto;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--white), var(--gray-300));
    border-radius: 2px;
    width: 0;
    transition: width 0.5s ease;
}

/* Specialty Grid */
.specialty-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
}

.specialty-option {
    background: var(--gray-900);
    border: 2px solid var(--gray-800);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.specialty-option:hover {
    border-color: var(--gray-600);
    background: var(--gray-800);
    transform: translateY(-2px);
}

.specialty-option.selected {
    background: var(--white);
    border-color: var(--white);
    color: var(--black);
    transform: translateY(-4px);
    box-shadow: 0 8px 25px -5px rgba(255, 255, 255, 0.2);
}

.option-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
}

.option-emoji {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
    opacity: 0.8;
    transition: all 0.3s ease;
}

.specialty-option.selected .option-emoji {
    opacity: 1;
    animation: emoji-bounce 0.6s ease;
}

@keyframes emoji-bounce {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

.option-name {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 0.5rem;
}

.selection-dot {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    border: 2px solid var(--gray-600);
    border-radius: 50%;
    background: transparent;
    transition: all 0.3s ease;
}

.specialty-option.selected .selection-dot {
    background: var(--black);
    border-color: var(--black);
}

.specialty-option.selected .selection-dot::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--white);
    font-size: 0.75rem;
    font-weight: 700;
}

/* Status Sections */
.status-section {
    padding: 3rem 0;
    text-align: center;
    display: none;
}

.status-section.show {
    display: block;
}

.status-content {
    max-width: 280px;
    margin: 0 auto;
}

.status-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 1.5rem;
    animation: status-appear 0.8s ease;
}

.status-icon.success {
    background: var(--white);
    color: var(--black);
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

.status-icon.warning {
    background: var(--yellow);
    color: var(--black);
}

@keyframes status-appear {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.status-content h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 0.75rem;
}

.status-content p {
    color: var(--gray-400);
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 1.5rem;
}

.success-message {
    background: var(--white);
    color: var(--black);
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-size: 0.875rem;
    font-weight: 700;
    display: inline-block;
}

.submission-info {
    background: var(--gray-900);
    border: 1px solid var(--gray-800);
    padding: 1rem;
    border-radius: 8px;
    color: var(--gray-400);
    font-size: 0.875rem;
    text-align: left;
}

.submission-info p {
    margin: 0.5rem 0;
}

/* Submit Button */
.submit-area {
    padding: 1.5rem;
    border-top: 1px solid var(--gray-900);
    margin-top: auto;
}

.submit-button {
    width: 100%;
    height: 54px;
    background: var(--white);
    color: var(--black);
    border: none;
    border-radius: 27px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.submit-button:hover {
    background: var(--gray-100);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgba(255, 255, 255, 0.3);
}

.submit-button:active {
    transform: translateY(0);
}

.submit-button:disabled {
    background: var(--gray-800);
    color: var(--gray-500);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.submit-loader {
    display: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--gray-400);
    border-top-color: var(--black);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

/* Test Mode Badge */
.test-badge {
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: var(--red);
    color: var(--white);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    z-index: 9999;
    text-transform: uppercase;
}

/* Responsive Design */
@media (max-width: 375px) {
    .main-app {
        max-width: 100%;
    }
    
    .loading-title {
        font-size: 1.75rem;
    }
    
    .specialty-grid {
        gap: 0.75rem;
    }
    
    .specialty-option {
        padding: 1rem;
    }
    
    .option-name {
        font-size: 0.8125rem;
    }
}

@media (max-height: 700px) {
    .loading-content {
        padding: 0 1rem;
    }
    
    .loading-title {
        font-size: 1.5rem;
    }
    
    .specialty-section {
        padding: 1rem 0;
    }
    
    .specialty-grid {
        margin-bottom: 1.5rem;
    }
}

@media (max-height: 600px) {
    .success-circle {
        width: 60px;
        height: 60px;
        margin-bottom: 1rem;
    }
    
    .loading-title {
        font-size: 1.25rem;
        margin-bottom: 0.25rem;
    }
    
    .loading-subtitle {
        font-size: 0.875rem;
    }
    
    .wave-bars {
        height: 80px;
        gap: 3px;
    }
    
    .bar {
        width: 4px;
    }
}
