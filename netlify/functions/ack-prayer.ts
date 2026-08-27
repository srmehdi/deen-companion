import { Handler } from '@netlify/functions';
import { query } from './db';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { visitorId, prayerKey, date } = JSON.parse(event.body || '{}');

    if (!visitorId || !prayerKey) {
      return { statusCode: 400, body: 'Missing visitorId or prayerKey' };
    }

    const todayStr = date || new Date().toISOString().split('T')[0];

    // Store in visitors table (or push_subscribers) that this prayer was acknowledged/acted on
    await query(
      `
      UPDATE push_subscribers
      SET last_acknowledged_prayer = $1,
          last_acknowledged_date = $2
      WHERE visitor_id::text = $3::text;
    `,
      [prayerKey, todayStr, visitorId],
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Prayer reminder dismissed' }),
    };
  } catch (err: any) {
    console.error('ack-prayer error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
