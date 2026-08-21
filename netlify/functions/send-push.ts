import { Handler } from '@netlify/functions';
import webpush, { PushSubscription } from 'web-push';

interface PushRequestBody {
  subscription: PushSubscription;
  title?: string;
  body?: string;
  url?: string;
}

const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';

// Ensure the subject begins with 'mailto:' or 'https://'
const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
const VAPID_SUBJECT =
  rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
    ? rawSubject
    : `mailto:${rawSubject}`;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const requestBody: PushRequestBody = event.body ? JSON.parse(event.body) : {};
    const { subscription, title, body, url } = requestBody;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid push subscription object' }),
      };
    }

    const payload = JSON.stringify({
      notification: {
        title: title,
        body: body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        vibrate: [100, 50, 100],
        actions: [
          {
            action: 'dismiss',
            title: '❌ Dismiss',
          },
          {
            action: 'open-website',
            title: '✨ Open Website',
          },
        ],
        data: {
          onActionClick: {
            default: { operation: 'openWindow', url: '/' },
            'open-website': {
              operation: 'openWindow',
              url: '/',
            },
          },
        },
      },
    });

    await webpush.sendNotification(subscription, payload);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Notification delivered' }),
    };
  } catch (err: any) {
    console.error('send-push function error:', err);

    return {
      statusCode: err.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message || 'Failed to send notification',
      }),
    };
  }
};
