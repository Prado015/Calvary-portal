// SMS (Semaphore — a Philippine SMS gateway) and email (any SMTP server, e.g. Gmail app password).
// Both are optional: with no keys set, sends are logged as "skipped" instead of failing.
//   SEMAPHORE_API_KEY=...   SEMAPHORE_SENDER=CalvaryTab   (sender name is optional)
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_USER=...  SMTP_PASS=...  MAIL_FROM="Calvary Tabernacle <you@gmail.com>"

// 09171234567 / +639171234567 / 9171234567 / 0917-123-4567  ->  639171234567   (null if not a PH mobile number)
function normalizePhone(raw) {
  const d = String(raw || '').replace(/[^\d]/g, '');
  if (/^09\d{9}$/.test(d)) return '63' + d.slice(1);
  if (/^639\d{9}$/.test(d)) return d;
  if (/^9\d{9}$/.test(d)) return '63' + d;
  return null;
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// Fills {firstName} {lastName} {name} in a message template.
function renderTemplate(text, member) {
  return String(text || '')
    .replace(/\{firstName\}/g, member.firstName || '')
    .replace(/\{lastName\}/g, member.lastName || '')
    .replace(/\{name\}/g, `${member.firstName || ''} ${member.lastName || ''}`.trim());
}

const providers = () => ({
  sms: !!process.env.SEMAPHORE_API_KEY,
  email: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
});

async function sendSms(rawNumber, message) {
  const number = normalizePhone(rawNumber);
  if (!number) return { status: 'skipped', error: 'No valid mobile number' };
  if (!providers().sms) return { status: 'skipped', error: 'SMS is not set up on the server (SEMAPHORE_API_KEY)', to: number };
  try {
    const body = new URLSearchParams({ apikey: process.env.SEMAPHORE_API_KEY, number, message });
    if (process.env.SEMAPHORE_SENDER) body.set('sendername', process.env.SEMAPHORE_SENDER);
    const res = await fetch('https://api.semaphore.co/api/v4/messages', { method: 'POST', body });
    const text = await res.text();
    if (!res.ok) return { status: 'failed', error: `SMS gateway said ${res.status}: ${text.slice(0, 160)}`, to: number };
    return { status: 'sent', to: number };
  } catch (err) {
    return { status: 'failed', error: err.message, to: number };
  }
}

let transporter = null;
async function sendEmail(to, subject, text) {
  if (!isEmail(to)) return { status: 'skipped', error: 'No valid email address' };
  if (!providers().email) return { status: 'skipped', error: 'Email is not set up on the server (SMTP_*)', to };
  try {
    if (!transporter) {
      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    }
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return { status: 'sent', to };
  } catch (err) {
    return { status: 'failed', error: err.message, to };
  }
}

// "Today" in the Philippines (UTC+8) as YYYY-MM-DD — the server itself runs in UTC.
const todayManila = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

module.exports = { normalizePhone, isEmail, renderTemplate, providers, sendSms, sendEmail, todayManila };
