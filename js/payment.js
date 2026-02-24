/* ============================================
   E&F Standard Construction Inc.
   Secure Payment Processing (Stripe Integration)
   ============================================ */

(function () {
    'use strict';

    /**
     * Payment Module
     *
     * This module handles secure payment processing using Stripe Elements.
     * All card data is handled directly by Stripe — card numbers never
     * touch our servers, ensuring PCI DSS compliance.
     *
     * SETUP INSTRUCTIONS:
     * 1. Replace STRIPE_PUBLISHABLE_KEY with your actual Stripe publishable key
     * 2. Set up a server endpoint at /api/create-payment-intent that:
     *    - Accepts { amount, currency, invoice, email } in the request body
     *    - Creates a Stripe PaymentIntent on your server using the Stripe secret key
     *    - Returns { clientSecret } in the response
     * 3. Never expose your Stripe secret key in client-side code
     *
     * SECURITY FEATURES:
     * - Card data handled entirely by Stripe (PCI Level 1 compliant)
     * - Client-side input sanitization and validation
     * - CSRF protection via Stripe's built-in mechanisms
     * - Amount validation on both client and server
     */

    // --- Configuration ---
    // IMPORTANT: Replace with your actual Stripe publishable key
    const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';
    const API_ENDPOINT = '/api/create-payment-intent';

    // --- State ---
    let stripe = null;
    let elements = null;
    let cardElement = null;
    let isProcessing = false;

    // --- Initialize Stripe ---
    function initStripe() {
        // Check if Stripe.js is loaded
        if (typeof Stripe === 'undefined') {
            console.warn('Stripe.js not loaded. Payment functionality will be in demo mode.');
            initDemoMode();
            return;
        }

        // Don't initialize with placeholder key
        if (STRIPE_PUBLISHABLE_KEY.includes('REPLACE')) {
            console.info('Stripe key not configured. Running in demo mode.');
            initDemoMode();
            return;
        }

        try {
            stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
            elements = stripe.elements({
                fonts: [
                    { cssSrc: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap' }
                ]
            });

            // Create card element with custom styling
            const style = {
                base: {
                    color: '#f0f0f0',
                    fontFamily: '"Inter Tight", sans-serif',
                    fontSize: '16px',
                    fontWeight: '400',
                    '::placeholder': {
                        color: '#555555'
                    },
                    iconColor: '#D4A853'
                },
                invalid: {
                    color: '#f87171',
                    iconColor: '#f87171'
                },
                complete: {
                    color: '#4ade80',
                    iconColor: '#4ade80'
                }
            };

            cardElement = elements.create('card', {
                style: style,
                hidePostalCode: false
            });

            // Mount to DOM
            const cardContainer = document.getElementById('card-element');
            if (cardContainer) {
                // Remove placeholder
                const placeholder = cardContainer.querySelector('.stripe-placeholder');
                if (placeholder) placeholder.remove();

                cardElement.mount('#card-element');

                // Handle real-time card validation
                cardElement.on('change', (event) => {
                    const errorEl = document.getElementById('card-errors');
                    if (event.error) {
                        errorEl.textContent = event.error.message;
                    } else {
                        errorEl.textContent = '';
                    }
                });
            }
        } catch (err) {
            console.error('Stripe initialization error:', err);
            initDemoMode();
        }
    }

    // --- Demo Mode (when Stripe key is not configured) ---
    function initDemoMode() {
        const cardContainer = document.getElementById('card-element');
        if (cardContainer) {
            const placeholder = cardContainer.querySelector('.stripe-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <span style="color: #8c8c8c; font-size: 0.85rem;">
                        Demo mode — Configure Stripe keys to enable live payments
                    </span>
                `;
            }
        }
    }

    // --- Input Sanitization ---
    function sanitize(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Validation ---
    function validatePaymentForm(data) {
        const errors = [];

        if (!data.invoice || data.invoice.trim().length < 3) {
            errors.push('Please enter a valid invoice number.');
        }

        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            errors.push('Please enter a valid payment amount.');
        }
        if (amount > 1000000) {
            errors.push('Payment amount exceeds maximum allowed.');
        }

        if (!data.cardholder || data.cardholder.trim().length < 2) {
            errors.push('Please enter the cardholder name.');
        }

        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Please enter a valid email address.');
        }

        return errors;
    }

    // --- Payment Form Handler ---
    function initPaymentForm() {
        const form = document.getElementById('payment-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isProcessing) return;

            const formData = new FormData(form);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = sanitize(value.trim());
            }

            // Client-side validation
            const errors = validatePaymentForm(data);
            if (errors.length > 0) {
                window.showToast(errors[0], 'error');
                return;
            }

            const submitBtn = document.getElementById('pay-submit');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnArrow = submitBtn.querySelector('.btn-arrow');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            // Toggle UI states
            isProcessing = true;
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnArrow.style.display = 'none';
            btnLoading.style.display = 'flex';

            try {
                if (stripe && cardElement) {
                    // --- LIVE MODE: Real Stripe Payment ---
                    await processLivePayment(data);
                } else {
                    // --- DEMO MODE: Simulated Payment ---
                    await processDemoPayment(data);
                }
            } catch (err) {
                window.showToast(err.message || 'Payment failed. Please try again.', 'error');
            } finally {
                isProcessing = false;
                submitBtn.disabled = false;
                btnText.style.display = '';
                btnArrow.style.display = '';
                btnLoading.style.display = 'none';
            }
        });
    }

    // --- Live Stripe Payment ---
    async function processLivePayment(data) {
        // Step 1: Create PaymentIntent on server
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(parseFloat(data.amount) * 100), // Convert to cents
                currency: 'usd',
                invoice: data.invoice,
                email: data.email
            })
        });

        if (!response.ok) {
            throw new Error('Server error. Please try again later.');
        }

        const { clientSecret } = await response.json();

        // Step 2: Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: data.cardholder,
                    email: data.email
                }
            },
            receipt_email: data.email
        });

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent.status === 'succeeded') {
            window.showToast(
                `Payment of $${parseFloat(data.amount).toFixed(2)} processed successfully! Receipt sent to ${data.email}.`,
                'success'
            );
            document.getElementById('payment-form').reset();
            if (cardElement) cardElement.clear();
        }
    }

    // --- Demo Payment (simulated) ---
    async function processDemoPayment(data) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        window.showToast(
            `Demo: Payment of $${parseFloat(data.amount).toFixed(2)} for invoice ${data.invoice} would be processed. Configure Stripe keys for live payments.`,
            'success'
        );
        document.getElementById('payment-form').reset();
    }

    // --- Initialize ---
    document.addEventListener('DOMContentLoaded', () => {
        initStripe();
        initPaymentForm();
    });
})();
