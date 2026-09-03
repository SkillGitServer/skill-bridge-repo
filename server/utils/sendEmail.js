const axios = require('axios');

/**
 * Generic Email Sending Utility via Brevo HTTP API (v3) over Port 443
 * Bypasses outbound SMTP port blocks on hosting providers like Render Free Tier.
 * 
 * @param {Object} options - { to, subject, html, text }
 * @returns {Promise<boolean>}
 */
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@skillbridge.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'Skill Bridge India';

  // Format recipient for Brevo API JSON schema: [ { "email": "user@example.com" } ]
  const recipientEmail = typeof to === 'string' ? to : (to?.email || String(to));
  const recipients = [{ email: recipientEmail }];

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: recipients,
    subject: subject,
    htmlContent: html
  };

  try {
    if (!apiKey) {
      console.warn(`[BREVO API WARNING] No BREVO_API_KEY configured.`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV FALLBACK] Simulated email send to ${recipientEmail} | Subject: "${subject}"`);
        return true;
      }
    }

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      timeout: 10000 // 10s connection timeout
    });

    console.log(`[BREVO API SUCCESS] Email sent to ${recipientEmail} (Message ID: ${response.data?.messageId || 'OK'})`);
    return true;
  } catch (error) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`[BREVO API ERROR] Failed to send email to ${recipientEmail}:`, errorDetails);

    // In local development or if API key is missing, gracefully fallback to avoid blocking users
    if (process.env.NODE_ENV !== 'production' || !apiKey) {
      console.log(`[BREVO DEV FALLBACK] Proceeding with flow in dev environment.`);
      return true;
    }
    return false;
  }
};

/**
 * Template A: Student Login & Registration OTP Email
 */
const sendStudentOtpEmail = async (userEmail, otpCode) => {
  const subject = 'Your Skill Bridge India Login OTP';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login OTP - Skill Bridge India</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .wrapper {
          max-width: 560px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 36px 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .header p {
          color: #94a3b8;
          font-size: 12px;
          margin: 6px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }
        .body {
          padding: 40px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 15px;
          color: #334155;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .otp-box {
          margin: 28px 0;
          padding: 20px 24px;
          background: #eff6ff;
          border: 2px dashed #3b82f6;
          border-radius: 16px;
          display: inline-block;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #1d4ed8;
        }
        .expiry-notice {
          font-size: 13px;
          color: #64748b;
          margin-top: 20px;
          line-height: 1.5;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          border-top: 1px solid #f1f5f9;
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Skill Bridge India</h1>
          <p>Student Portal Verification</p>
        </div>
        <div class="body">
          <div class="greeting">
            Your Skill Bridge India Login OTP is below. Use this code to log in to your student assessment portal.
          </div>

          <div class="otp-box">
            <span class="otp-code">${otpCode}</span>
          </div>

          <div class="expiry-notice">
            This code expires in <strong>10 minutes</strong>. For security purposes, never share your OTP with anyone.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 Skill Bridge India. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: userEmail, subject, html });
};

/**
 * Template B: Admin & Super Admin Password Reset OTP Email
 */
const sendAdminResetOtpEmail = async (userEmail, otpCode, role = 'admin') => {
  const roleTitle = role === 'superadmin' ? 'Super Admin' : 'Admin';
  const subject = `Password Reset Request - Skill Bridge ${roleTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Skill Bridge Admin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .wrapper {
          max-width: 560px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          padding: 36px 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .header p {
          color: #c7d2fe;
          font-size: 12px;
          margin: 6px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }
        .body {
          padding: 40px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 15px;
          color: #334155;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .otp-box {
          margin: 28px 0;
          padding: 20px 24px;
          background: #f5f3ff;
          border: 2px dashed #6366f1;
          border-radius: 16px;
          display: inline-block;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #4338ca;
        }
        .warning-box {
          margin-top: 24px;
          padding: 14px 18px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #991b1b;
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          border-top: 1px solid #f1f5f9;
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Skill Bridge India</h1>
          <p>${roleTitle} Security Portal</p>
        </div>
        <div class="body">
          <div class="greeting">
            A password reset was requested for your <strong>Skill Bridge ${roleTitle}</strong> account.
            Your reset OTP is below:
          </div>

          <div class="otp-box">
            <span class="otp-code">${otpCode}</span>
          </div>

          <div class="warning-box">
            🔒 <strong>Security Warning:</strong> This reset code expires in 10 minutes. If you did not request this password reset, please secure your account immediately.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 Skill Bridge India. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: userEmail, subject, html });
};

module.exports = {
  sendEmail,
  sendStudentOtpEmail,
  sendAdminResetOtpEmail
};
