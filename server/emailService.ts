import nodemailer from 'nodemailer';

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type DeliveryResult = {
  delivered: boolean;
  provider: 'smtp' | 'debug';
};

function getTransport() {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    return null;
  }
  return nodemailer.createTransport(smtpUrl);
}

function getBaseUrl() {
  return process.env.APP_URL ?? process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';
}

function wrapHtml(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-size:24px;margin-bottom:16px">${title}</h1>
      <div style="font-size:14px;line-height:1.6">${body}</div>
      <p style="margin-top:24px;font-size:12px;color:#64748b">Preprint Explorer</p>
    </div>
  `;
}

async function send(message: EmailMessage): Promise<DeliveryResult> {
  const transport = getTransport();
  if (!transport) {
    console.log(`[email:debug] to=${message.to} subject=${message.subject}\n${message.text}`);
    return { delivered: false, provider: 'debug' };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'Preprint Explorer <no-reply@preprint-explorer.local>',
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return { delivered: true, provider: 'smtp' };
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${getBaseUrl().replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  return send({
    to,
    subject: 'Verify your Preprint Explorer email',
    text: `Verify your email by opening: ${url}`,
    html: wrapHtml('Verify your email', `<p>Verify your email address to keep recovery options active.</p><p><a href="${url}">Verify email</a></p>`),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${getBaseUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  return send({
    to,
    subject: 'Reset your Preprint Explorer password',
    text: `Reset your password by opening: ${url}`,
    html: wrapHtml('Reset your password', `<p>A password reset was requested for your account.</p><p><a href="${url}">Reset password</a></p>`),
  });
}
