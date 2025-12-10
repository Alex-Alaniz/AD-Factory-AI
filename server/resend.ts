import { Resend } from 'resend';
import type { EmailNotificationData } from '@shared/schema';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendDailySummaryEmail(
  toEmail: string,
  data: EmailNotificationData
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const topHooksHtml = data.topHooks
      .map((hook, i) => `<li style="margin-bottom: 8px;"><strong>${i + 1}.</strong> "${hook}"</li>`)
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: #f97316; border-radius: 8px; padding: 12px;">
        <span style="font-size: 24px; font-weight: 700; color: #fafafa;">Bearified Ad Factory</span>
      </div>
    </div>
    
    <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #fafafa;">Daily Script Summary</h1>
    <p style="color: #a3a3a3; margin-bottom: 24px; font-size: 14px;">Generated on ${new Date(data.generatedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    
    <div style="background-color: #262626; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="text-align: center;">
        <span style="font-size: 48px; font-weight: 700; color: #f97316;">${data.scriptsGenerated}</span>
        <p style="color: #a3a3a3; margin: 8px 0 0; font-size: 14px;">Scripts Generated</p>
      </div>
    </div>
    
    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #fafafa;">Top Hooks</h2>
    <ul style="list-style: none; padding: 0; margin: 0 0 24px;">
      ${topHooksHtml}
    </ul>
    
    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #f97316; color: #fafafa; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Dashboard</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
    
    <p style="color: #737373; font-size: 12px; text-align: center;">
      This is an automated email from Bearified Ad Factory.
    </p>
  </div>
</body>
</html>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'Bearified Ad Factory <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Daily Script Summary - ${data.scriptsGenerated} new scripts generated`,
      html,
    });

    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendTestEmail(toEmail: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #f97316; border-radius: 8px; padding: 12px;">
        <span style="font-size: 24px; font-weight: 700; color: #fafafa;">Bearified Ad Factory</span>
      </div>
    </div>
    
    <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #fafafa; text-align: center;">Test Email</h1>
    <p style="color: #a3a3a3; text-align: center; font-size: 14px;">
      Your email configuration is working correctly! You will receive daily summary emails at 6 AM EST.
    </p>
  </div>
</body>
</html>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'Bearified Ad Factory <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Bearified Ad Factory - Test Email',
      html,
    });

    console.log('Test email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
}
