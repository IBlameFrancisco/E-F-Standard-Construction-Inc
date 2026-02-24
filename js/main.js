/* ============================================
   E&F Standard Construction Inc.
   Main Application Logic
   ============================================ */

(function () {
    'use strict';

    // --- API Base URL ---
    // Auto-detect: use relative path if served from the same server,
    // or override with a full URL for separate frontend/backend hosting.
    const API_BASE = window.EF_API_BASE || '';

    // --- Mobile Menu Toggle ---
    function initMobileMenu() {
        const menuBtn = document.getElementById('nav-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (!menuBtn || !mobileMenu) return;

        menuBtn.addEventListener('click', () => {
            const isActive = mobileMenu.classList.contains('active');

            if (isActive) {
                mobileMenu.classList.remove('active');
                menuBtn.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                mobileMenu.classList.add('active');
                menuBtn.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // --- Toast Notifications ---
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const toastMessage = toast.querySelector('.toast-message');
        const toastIcon = toast.querySelector('.toast-icon');

        toast.className = 'toast ' + type;
        toastMessage.textContent = message;
        toastIcon.textContent = type === 'success' ? '\u2713' : '\u2717';

        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 4000);
    }

    // Make showToast globally available
    window.showToast = showToast;

    // --- Form Validation Helpers ---
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePhone(phone) {
        // Allow empty or valid phone format
        if (!phone) return true;
        return /^[\d\s\-\+\(\)]{7,}$/.test(phone);
    }

    function sanitizeInput(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Estimate Form ---
    function initEstimateForm() {
        const form = document.getElementById('estimate-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = {};

            for (const [key, value] of formData.entries()) {
                data[key] = sanitizeInput(value.trim());
            }

            // Validation
            if (!data.name || data.name.length < 2) {
                showToast('Please enter your full name.', 'error');
                form.querySelector('#est-name').focus();
                return;
            }

            if (!validateEmail(data.email)) {
                showToast('Please enter a valid email address.', 'error');
                form.querySelector('#est-email').focus();
                return;
            }

            if (!validatePhone(data.phone)) {
                showToast('Please enter a valid phone number.', 'error');
                form.querySelector('#est-phone').focus();
                return;
            }

            if (!data.project_type) {
                showToast('Please select a project type.', 'error');
                form.querySelector('#est-type').focus();
                return;
            }

            // Submit to API
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const originalText = btnText.textContent;

            btnText.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const res = await fetch(API_BASE + '/api/estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Submission failed.');
                showToast(result.message || 'Estimate request sent successfully!', 'success');
                form.reset();
            } catch (err) {
                showToast(err.message || 'Something went wrong. Please try again.', 'error');
            } finally {
                btnText.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Contact Form ---
    function initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = {};

            for (const [key, value] of formData.entries()) {
                data[key] = sanitizeInput(value.trim());
            }

            // Validation
            if (!data.name || data.name.length < 2) {
                showToast('Please enter your name.', 'error');
                form.querySelector('#contact-name').focus();
                return;
            }

            if (!validateEmail(data.email)) {
                showToast('Please enter a valid email address.', 'error');
                form.querySelector('#contact-email').focus();
                return;
            }

            if (!data.message || data.message.length < 10) {
                showToast('Please enter a message (at least 10 characters).', 'error');
                form.querySelector('#contact-message').focus();
                return;
            }

            // Submit to API
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const originalText = btnText.textContent;

            btnText.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const res = await fetch(API_BASE + '/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Submission failed.');
                showToast(result.message || 'Message sent!', 'success');
                form.reset();
            } catch (err) {
                showToast(err.message || 'Something went wrong. Please try again.', 'error');
            } finally {
                btnText.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Input Focus Animations ---
    function initInputAnimations() {
        const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');

        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.closest('.form-group').classList.add('focused');
            });

            input.addEventListener('blur', () => {
                input.closest('.form-group').classList.remove('focused');
                if (input.value) {
                    input.closest('.form-group').classList.add('filled');
                } else {
                    input.closest('.form-group').classList.remove('filled');
                }
            });
        });
    }

    // --- Keyboard Navigation ---
    function initKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            // Escape closes mobile menu
            if (e.key === 'Escape') {
                const mobileMenu = document.getElementById('mobile-menu');
                const menuBtn = document.getElementById('nav-menu-btn');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    menuBtn.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // --- Lazy load project images (future enhancement) ---
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        imgObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '100px' });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imgObserver.observe(img);
            });
        }
    }

    // --- Active Nav Link Highlighting ---
    function initActiveNavTracking() {
        const sections = document.querySelectorAll('.section, .hero');
        const navLinks = document.querySelectorAll('.nav-link');

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === '#' + id) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-30% 0px -70% 0px'
        });

        sections.forEach(section => {
            if (section.id) {
                sectionObserver.observe(section);
            }
        });
    }

    // --- Initialize ---
    document.addEventListener('DOMContentLoaded', () => {
        initMobileMenu();
        initEstimateForm();
        initContactForm();
        initInputAnimations();
        initKeyboardNav();
        initLazyLoading();
        initActiveNavTracking();
    });
})();
