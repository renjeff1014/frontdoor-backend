const nodemailer = require('nodemailer')

function getTransporter() {
  const host = process.env.SMTP_HOST
  if (!host) {
    return null
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  })
}

const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@frontdoor.local'

/**
 * Send a 6-digit verification code to the given email address.
 * Requires SMTP_* env vars. If not configured, throws (caller may fall back to logging).
 * @param {string} toEmail - Recipient email
 * @param {string} code - 6-digit code
 * @returns {Promise<void>}
 */
async function sendVerificationCode(toEmail, code) {
  const to = String(toEmail || '').trim().toLowerCase()
  if (!to || !to.includes('@')) {
    throw new Error('Invalid email address')
  }

  const transporter = getTransporter()
  if (!transporter) {
    throw new Error('SMTP not configured (set SMTP_HOST and related env vars)')
  }

  const mailOptions = {
    from,
    to,
    subject: 'Your verification code',
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `.trim(),
  }

  await transporter.sendMail(mailOptions)
}

module.exports = { sendVerificationCode }
