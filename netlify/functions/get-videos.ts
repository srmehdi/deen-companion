import { Handler } from '@netlify/functions';
import { query } from './db';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { type } = body;
    if (!type) {
      return { statusCode: 400, body: 'Missing type' };
    }
    const res = await query(
      `
      SELECT
        id,
        type,
        title,
        category,
        url
      FROM videos
      WHERE type = $1
    `,
      [type],
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: res?.rows || [],
      }),
    };
  } catch (err) {
    console.error('get-videos function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err || 'Server error' }) };
  }
};
