import { env } from '../config/env.js';

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    if (env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset email would be sent to ${to}: ${resetUrl}`);
      return;
    }
    throw new Error('Password reset email provider is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject: 'Reset your Neura password',
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Reset your Neura password</h2><p>We received a request to reset your password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px">Reset Password</a></p><p>This link expires in 30 minutes and can be used only once.</p><p>If you did not request this, you can safely ignore this email.</p></body></html>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Password reset email delivery failed: ${details}`);
  }
}
