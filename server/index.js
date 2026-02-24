const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables from .env in development
try { require('dotenv').config(); } catch (_) { /* dotenv is optional */ }

const db = require('./db');
const { notifyEstimate, notifyContact, notifyPayment } = require('./email');
const { validateEstimate, validateContact, validatePayment } = require('./validate');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// Security headers
app.use(helmet());

// CORS — allow the frontend origin
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow requests with no origin (server-to-server, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    }
}));

// Parse JSON bodies
app.use(express.json({ limit: '16kb' }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// --- Health Check ---
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Estimate Endpoint ---
const insertEstimate = db.prepare(`
    INSERT INTO estimates (name, email, phone, budget, project_type, details)
    VALUES (@name, @email, @phone, @budget, @project_type, @details)
`);

app.post('/api/estimate', async (req, res) => {
    const { errors, data } = validateEstimate(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    try {
        const result = insertEstimate.run(data);

        // Send email notification (non-blocking)
        notifyEstimate(data).catch(err =>
            console.error('Email notification failed:', err.message)
        );

        res.status(201).json({
            success: true,
            message: 'Estimate request received. We will contact you within 48 hours.',
            id: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Estimate submission error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// --- Contact Endpoint ---
const insertContact = db.prepare(`
    INSERT INTO contacts (name, email, subject, message)
    VALUES (@name, @email, @subject, @message)
`);

app.post('/api/contact', async (req, res) => {
    const { errors, data } = validateContact(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    try {
        const result = insertContact.run(data);

        notifyContact(data).catch(err =>
            console.error('Email notification failed:', err.message)
        );

        res.status(201).json({
            success: true,
            message: 'Message received. We will get back to you soon.',
            id: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Contact submission error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// --- Stripe Payment Endpoint ---
const insertPayment = db.prepare(`
    INSERT INTO payments (invoice, amount, currency, email, cardholder, stripe_payment_intent, status)
    VALUES (@invoice, @amount, @currency, @email, @cardholder, @stripe_payment_intent, @status)
`);

app.post('/api/create-payment-intent', async (req, res) => {
    const { errors, data } = validatePayment(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes('REPLACE')) {
        // Demo mode — no real Stripe key configured
        const demoId = 'pi_demo_' + Date.now();

        insertPayment.run({
            invoice: data.invoice,
            amount: data.amount,
            currency: 'usd',
            email: data.email,
            cardholder: data.cardholder,
            stripe_payment_intent: demoId,
            status: 'demo'
        });

        return res.json({
            clientSecret: 'demo_secret_' + demoId,
            demo: true,
            message: 'Demo mode — configure STRIPE_SECRET_KEY for live payments.'
        });
    }

    try {
        const stripe = require('stripe')(stripeKey);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: data.amount, // Already in cents from frontend
            currency: 'usd',
            receipt_email: data.email,
            metadata: {
                invoice: data.invoice,
                cardholder: data.cardholder
            }
        });

        insertPayment.run({
            invoice: data.invoice,
            amount: data.amount,
            currency: 'usd',
            email: data.email,
            cardholder: data.cardholder,
            stripe_payment_intent: paymentIntent.id,
            status: 'pending'
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('Stripe error:', err.message);
        res.status(500).json({ error: 'Payment processing failed. Please try again.' });
    }
});

// --- Stripe Webhook (for payment confirmation) ---
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
        return res.status(400).json({ error: 'Webhook not configured.' });
    }

    const stripe = require('stripe')(stripeKey);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;

        const updatePayment = db.prepare(`
            UPDATE payments SET status = 'succeeded' WHERE stripe_payment_intent = ?
        `);
        updatePayment.run(pi.id);

        notifyPayment({
            invoice: pi.metadata.invoice,
            amount: pi.amount,
            email: pi.receipt_email,
            cardholder: pi.metadata.cardholder,
            stripe_payment_intent: pi.id
        }).catch(err => console.error('Payment notification failed:', err.message));
    }

    res.json({ received: true });
});

// --- SPA Fallback ---
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// --- Start ---
app.listen(PORT, () => {
    console.log(`E&F Construction API running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
