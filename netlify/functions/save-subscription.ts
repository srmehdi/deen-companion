import { Handler } from '@netlify/functions';
import { query } from './db';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { visitorId, subscription, notifyDailyContent = true } = body;

    // visitorId is always required
    if (!visitorId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required visitorId' }),
      };
    }

    // If enabling notifications, validate full subscription payload
    if (notifyDailyContent) {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Missing valid push subscription payload to enable notifications',
          }),
        };
      }

      // Upsert full subscription and set active
      await query(
        `
        INSERT INTO push_subscribers (visitor_id, subscription, notify_daily_content, modified_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (visitor_id)
        DO UPDATE SET
          subscription = EXCLUDED.subscription,
          notify_daily_content = EXCLUDED.notify_daily_content,
          modified_at = NOW();
        `,
        [visitorId, JSON.stringify(subscription), true],
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Subscribed to daily Islamic reminders' }),
      };
    }

    // If disabling notifications, update preference for existing record
    await query(
      `
      UPDATE push_subscribers
      SET notify_daily_content = FALSE,
          modified_at = NOW()
      WHERE visitor_id = $1;
      `,
      [visitorId],
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Daily reminders disabled successfully' }),
    };
  } catch (err: any) {
    console.error('save-subscription error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
