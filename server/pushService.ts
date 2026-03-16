import webpush from 'web-push';
import type { StoredPushSubscription } from './coreStore';

type PushPayload = {
  title: string;
  body: string;
  actionUrl?: string | null;
};

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? 'mailto:no-reply@preprint-explorer.local';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function buildOpenUrl(actionUrl?: string | null) {
  const appUrl = (process.env.APP_URL ?? process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  if (!actionUrl) {
    return `${appUrl}/`;
  }
  if (actionUrl.startsWith('/chat/')) {
    return `${appUrl}/?chat=${encodeURIComponent(actionUrl.replace('/chat/', ''))}`;
  }
  if (actionUrl.startsWith('/profile/')) {
    return `${appUrl}/?profile=${encodeURIComponent(actionUrl.replace('/profile/', ''))}`;
  }
  return `${appUrl}/?navigate=${encodeURIComponent(actionUrl)}`;
}

export function getPushPublicKey() {
  return publicKey ?? null;
}

export async function sendPushNotification(subscriptions: StoredPushSubscription[], payload: PushPayload) {
  if (!publicKey || !privateKey || subscriptions.length === 0) {
    return { delivered: 0, attempted: 0, configured: Boolean(publicKey && privateKey) };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: buildOpenUrl(payload.actionUrl),
  });

  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, notificationPayload);
      delivered += 1;
    } catch {
      // Subscription cleanup is handled on the next explicit unsubscribe/update cycle.
    }
  }

  return {
    delivered,
    attempted: subscriptions.length,
    configured: true,
  };
}
