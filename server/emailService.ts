import nodemailer from 'nodemailer';

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type DeliveryResult = {
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

export async function sendDigestEmail(input: {
  to: string;
  subject: string;
  heading: string;
  intro: string;
  highlights: Array<{ title: string; meta: string; summary: string; url?: string | null }>;
  footer?: string;
}) {
  const highlightsText = input.highlights.map((highlight, index) => (
    `${index + 1}. ${highlight.title}\n${highlight.meta}\n${highlight.summary}${highlight.url ? `\n${highlight.url}` : ''}`
  )).join('\n\n');
  const text = [
    input.heading,
    '',
    input.intro,
    '',
    highlightsText || 'No highlights available for this digest cycle.',
    input.footer ?? 'Preprint Explorer',
  ].join('\n');
  const body = `
    <p>${input.intro}</p>
    ${input.highlights.length > 0 ? `<ol style="padding-left:18px">${input.highlights.map((highlight) => `
      <li style="margin-bottom:16px">
        <p style="margin:0 0 4px;font-weight:700">${highlight.title}</p>
        <p style="margin:0 0 6px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">${highlight.meta}</p>
        <p style="margin:0">${highlight.summary}</p>
        ${highlight.url ? `<p style="margin:8px 0 0"><a href="${highlight.url}">Open paper</a></p>` : ''}
      </li>
    `).join('')}</ol>` : '<p>No highlights are available for this digest cycle.</p>'}
    ${input.footer ? `<p style="margin-top:24px;color:#475569">${input.footer}</p>` : ''}
  `;

  return send({
    to: input.to,
    subject: input.subject,
    text,
    html: wrapHtml(input.heading, body),
  });
}

export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string | null;
}) {
  const text = `${input.heading}\n\n${input.message}${input.actionUrl ? `\n\n${input.actionLabel ?? 'Open'}: ${input.actionUrl}` : ''}`;
  const body = `
    <p>${input.message}</p>
    ${input.actionUrl ? `<p><a href="${input.actionUrl}">${input.actionLabel ?? 'Open in Preprint Explorer'}</a></p>` : ''}
  `;
  return send({
    to: input.to,
    subject: input.subject,
    text,
    html: wrapHtml(input.heading, body),
  });
}
