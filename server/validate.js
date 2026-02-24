/**
 * Server-side input validation and sanitization.
 * Never trust client-side validation alone.
 */

function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    if (!phone) return true; // optional
    return /^[\d\s\-\+\(\)]{7,20}$/.test(phone);
}

const VALID_PROJECT_TYPES = [
    'new-home', 'commercial', 'renovation', 'addition', 'infrastructure', 'other'
];

const VALID_BUDGETS = [
    '', '50k-100k', '100k-250k', '250k-500k', '500k-1m', '1m+'
];

function validateEstimate(body) {
    const errors = [];

    const name = sanitize(body.name);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone || '');
    const budget = sanitize(body.budget || '');
    const project_type = sanitize(body.project_type);
    const details = sanitize(body.details || '');

    if (!name || name.length < 2) errors.push('Name is required (min 2 characters).');
    if (name.length > 200) errors.push('Name is too long.');
    if (!isValidEmail(email)) errors.push('Valid email is required.');
    if (!isValidPhone(phone)) errors.push('Invalid phone number format.');
    if (budget && !VALID_BUDGETS.includes(budget)) errors.push('Invalid budget range.');
    if (!VALID_PROJECT_TYPES.includes(project_type)) errors.push('Valid project type is required.');
    if (details.length > 5000) errors.push('Details too long (max 5000 characters).');

    return {
        errors,
        data: { name, email, phone, budget, project_type, details }
    };
}

function validateContact(body) {
    const errors = [];

    const name = sanitize(body.name);
    const email = sanitize(body.email);
    const subject = sanitize(body.subject || '');
    const message = sanitize(body.message);

    if (!name || name.length < 2) errors.push('Name is required (min 2 characters).');
    if (name.length > 200) errors.push('Name is too long.');
    if (!isValidEmail(email)) errors.push('Valid email is required.');
    if (subject.length > 300) errors.push('Subject too long.');
    if (!message || message.length < 10) errors.push('Message is required (min 10 characters).');
    if (message.length > 5000) errors.push('Message too long (max 5000 characters).');

    return {
        errors,
        data: { name, email, subject, message }
    };
}

function validatePayment(body) {
    const errors = [];

    const invoice = sanitize(body.invoice);
    const amount = parseInt(body.amount, 10);
    const email = sanitize(body.email);
    const cardholder = sanitize(body.cardholder || '');

    if (!invoice || invoice.length < 3) errors.push('Valid invoice number is required.');
    if (invoice.length > 100) errors.push('Invoice number too long.');
    if (isNaN(amount) || amount <= 0) errors.push('Valid payment amount is required.');
    if (amount > 100000000) errors.push('Payment amount exceeds maximum ($ 1,000,000).');
    if (!isValidEmail(email)) errors.push('Valid email is required.');

    return {
        errors,
        data: { invoice, amount, email, cardholder }
    };
}

module.exports = { validateEstimate, validateContact, validatePayment };
