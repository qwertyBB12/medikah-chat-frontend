// Email service utility for Medikah
// Uses Resend for transactional emails

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Send email via Resend API
export const sendEmail = async (options: EmailOptions): Promise<SendEmailResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@medikah.health';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Medikah <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send failed:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

// Email templates
export const templates = {
  waitlistConfirmation: (email: string) => ({
    subject: 'Welcome to the Medikah Waitlist',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFB; font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header - light design with blue accent bar -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px; text-align: center; border-bottom: 4px solid #1B2A41;">
              <p style="font-family: 'Mulish', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 32px; font-weight: 800; color: #1B2A41; letter-spacing: -0.01em; margin: 0;">medikah</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1B2A41; font-size: 20px; margin: 0 0 16px 0;">You're on the list!</h2>
              <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for joining the Medikah waitlist. We're building a platform that connects patients with healthcare providers across borders, making quality healthcare more accessible.
              </p>
              <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We'll notify you at <strong>${email}</strong> when we're ready to welcome you to the platform.
              </p>
              <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                In the meantime, if you have any questions, feel free to reach out to us at <a href="mailto:hello@medikah.health" style="color: #2C7A8C;">hello@medikah.health</a>.
              </p>
            </td>
          </tr>

          <!-- Footer - light with blue accent -->
          <tr>
            <td style="background-color: #F5F7F8; padding: 24px 32px; text-align: center; border-top: 4px solid #1B2A41;">
              <p style="color: #9CA3AF; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
                Medikah Corporation · Incorporated in Delaware, USA
              </p>
              <p style="font-size: 13px; margin: 0;">
                <a href="https://medikah.health/privacy" style="color: #1B2A41; text-decoration: none; font-weight: 600;">Privacy Policy</a>
                <span style="color: #D1D5DB; margin: 0 8px;">|</span>
                <a href="https://medikah.health/terms" style="color: #1B2A41; text-decoration: none; font-weight: 600;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `You're on the Medikah waitlist!

Thank you for joining. We're building a platform that connects patients with healthcare providers across borders, making quality healthcare more accessible.

We'll notify you at ${email} when we're ready to welcome you to the platform.

Questions? Contact us at hello@medikah.health

Medikah Health
https://medikah.health
`,
  }),
};

// Send waitlist confirmation
export const sendWaitlistConfirmation = async (email: string): Promise<SendEmailResult> => {
  const template = templates.waitlistConfirmation(email);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};
