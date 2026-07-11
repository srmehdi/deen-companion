import { Handler } from '@netlify/functions';
import { query } from './db';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { visitorId } = body;
    if (!visitorId) {
      return { statusCode: 400, body: 'Missing visitorId' };
    }
    const res = await query(
      `
      SELECT
        bookmark_ids AS "bookmarkIds"
      FROM dua_bookmarks
      WHERE visitor_id = $1
    `,
      [visitorId],
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: res?.rows[0]?.bookmarkIds ? res?.rows[0]?.bookmarkIds : [],
      }),
    };
  } catch (err) {
    console.error('get-dua-bookmark-ids function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err || 'Server error' }) };
  }
};
