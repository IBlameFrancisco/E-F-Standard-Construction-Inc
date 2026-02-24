/* ============================================
   E&F Standard Construction Inc.
   Scroll Animations & Intersection Observer
   ============================================ */

(function () {
    'use strict';

    // --- Preloader ---
    const preloader = document.getElementById('preloader');
    const preloaderCounter = document.getElementById('preloader-counter');
    let count = 0;

    function animatePreloader() {
        const interval = setInterval(() => {
            count += Math.floor(Math.random() * 5) + 1;
            if (count >= 100) {
                count = 100;
                clearInterval(interval);
                preloaderCounter.textContent = '100';
                setTimeout(() => {
                    preloader.classList.add('hidden');
                    document.body.style.overflow = '';
                    initHeroAnimation();
                }, 400);
                return;
            }
            preloaderCounter.textContent = count;
        }, 30);
    }

    // Disable scrolling during preloader
    document.body.style.overflow = 'hidden';

    window.addEventListener('load', () => {
        animatePreloader();
    });

    // --- Hero Title Animation ---
    function initHeroAnimation() {
        const words = document.querySelectorAll('.title-word, .title-accent');
        const heroTag = document.querySelector('.hero-tag');
        const heroBottom = document.querySelector('.hero-bottom');

        if (heroTag) heroTag.classList.add('visible');

        words.forEach((word, i) => {
            setTimeout(() => {
                word.classList.add('visible');
            }, 200 + i * 150);
        });

        setTimeout(() => {
            if (heroBottom) heroBottom.classList.add('visible');
        }, 800);
    }

    // --- Intersection Observer for Scroll Animations ---
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Don't unobserve - keep watching for re-entry if needed
                // But for performance on one-time animations, we unobserve
                if (!entry.target.dataset.keepObserving) {
                    animationObserver.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);

    // Observe elements when DOM is ready
    function initScrollAnimations() {
        // Section titles
        document.querySelectorAll('.reveal-text').forEach(el => {
            animationObserver.observe(el);
        });

        // Section tags
        document.querySelectorAll('.section-tag').forEach(el => {
            animationObserver.observe(el);
        });

        // Project cards
        document.querySelectorAll('.project-card').forEach(el => {
            animationObserver.observe(el);
        });

        // Stat cards
        document.querySelectorAll('.stat-card').forEach(el => {
            animationObserver.observe(el);
        });

        // Safety metrics
        document.querySelectorAll('.safety-metric').forEach(el => {
            animationObserver.observe(el);
        });

        // Safety injuries
        document.querySelectorAll('.safety-injuries').forEach(el => {
            animationObserver.observe(el);
        });

        // Forms
        document.querySelectorAll('.estimate-form, .contact-form').forEach(el => {
            animationObserver.observe(el);
        });

        // Generic fade-up elements
        document.querySelectorAll('.fade-up').forEach(el => {
            animationObserver.observe(el);
        });
    }

    // --- Stat Counter Animation ---
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStatNumbers(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    function animateStatNumbers(container) {
        const numbers = container.querySelectorAll('.stat-number[data-target]');
        numbers.forEach(numEl => {
            const target = parseInt(numEl.dataset.target, 10);
            const duration = 2000;
            const startTime = performance.now();

            function updateNumber(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out expo
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(eased * target);
                numEl.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                } else {
                    numEl.textContent = target;
                }
            }

            requestAnimationFrame(updateNumber);
        });
    }

    // --- Bar Chart Animation ---
    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bars = entry.target.querySelectorAll('.bar-fill');
                bars.forEach((bar, i) => {
                    const width = bar.dataset.width;
                    bar.style.setProperty('--bar-width', width + '%');
                    setTimeout(() => {
                        bar.classList.add('animated');
                    }, i * 150);
                });
                barObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    // --- Custom Cursor ---
    function initCursor() {
        const cursor = document.getElementById('cursor');
        const follower = document.getElementById('cursor-follower');

        if (!cursor || !follower) return;

        // Check for touch device
        if ('ontouchstart' in window) return;

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            // Cursor follows instantly
            cursorX = mouseX;
            cursorY = mouseY;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';

            // Follower has lag
            followerX += (mouseX - followerX) * 0.12;
            followerY += (mouseY - followerY) * 0.12;
            follower.style.left = followerX + 'px';
            follower.style.top = followerY + 'px';

            requestAnimationFrame(animateCursor);
        }

        animateCursor();

        // Hover states
        const hoverTargets = document.querySelectorAll('a, button, .project-card, input, select, textarea');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hovering');
                follower.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovering');
                follower.classList.remove('hovering');
            });
        });
    }

    // --- Header Scroll Effect ---
    function initHeaderScroll() {
        const header = document.getElementById('header');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // --- Smooth Scroll for Nav Links ---
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();

                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobile-menu');
                const menuBtn = document.getElementById('nav-menu-btn');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    menuBtn.classList.remove('active');
                    document.body.style.overflow = '';
                }

                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            });
        });
    }

    // --- Parallax on Mouse Move ---
    function initParallax() {
        const bgText = document.querySelector('.stats-bg-text');
        if (!bgText) return;

        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 10;
            bgText.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        }, { passive: true });
    }

    // --- Initialize Everything ---
    document.addEventListener('DOMContentLoaded', () => {
        initScrollAnimations();
        initCursor();
        initHeaderScroll();
        initSmoothScroll();
        initParallax();

        // Observe stats section for counter animation
        const statsSection = document.querySelector('.stats-grid');
        if (statsSection) {
            statObserver.observe(statsSection);
        }

        // Observe bar chart
        const barChart = document.querySelector('.stats-bar-chart');
        if (barChart) {
            barObserver.observe(barChart);
        }
    });
})();
