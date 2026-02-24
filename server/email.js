const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('Email not configured — notifications will be logged to console only.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10) || 587,
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    return transporter;
}

async function sendNotification(subject, html) {
    const to = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;
    const transport = getTransporter();

    if (!transport) {
        console.log('--- EMAIL NOTIFICATION (console fallback) ---');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Body:', html.replace(/<[^>]+>/g, ''));
        console.log('---');
        return;
    }

    await transport.sendMail({
        from: `"E&F Construction Website" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
    });
}

async function notifyEstimate(data) {
    const subject = `New Estimate Request from ${data.name}`;
    const html = `
        <h2>New Estimate Request</h2>
        <table style="border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">${data.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${data.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Phone:</td><td style="padding:8px;">${data.phone || 'Not provided'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Budget:</td><td style="padding:8px;">${data.budget || 'Not specified'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Project Type:</td><td style="padding:8px;">${data.project_type}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Details:</td><td style="padding:8px;">${data.details || 'None'}</td></tr>
        </table>
    `;
    await sendNotification(subject, html);
}

async function notifyContact(data) {
    const subject = `New Contact Message: ${data.subject || 'No Subject'}`;
    const html = `
        <h2>New Contact Message</h2>
        <table style="border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">${data.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${data.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Subject:</td><td style="padding:8px;">${data.subject || 'Not provided'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">${data.message}</td></tr>
        </table>
    `;
    await sendNotification(subject, html);
}

async function notifyPayment(data) {
    const amount = (data.amount / 100).toFixed(2);
    const subject = `Payment Received: $${amount} — Invoice ${data.invoice}`;
    const html = `
        <h2>Payment Received</h2>
        <table style="border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;">Invoice:</td><td style="padding:8px;">${data.invoice}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Amount:</td><td style="padding:8px;">$${amount}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${data.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Cardholder:</td><td style="padding:8px;">${data.cardholder}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Stripe ID:</td><td style="padding:8px;">${data.stripe_payment_intent}</td></tr>
        </table>
    `;
    await sendNotification(subject, html);
}

module.exports = { notifyEstimate, notifyContact, notifyPayment };
