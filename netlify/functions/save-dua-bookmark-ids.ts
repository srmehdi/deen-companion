import { Handler } from '@netlify/functions';
import { query } from './db';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { visitorId, bookmarkIds } = body;
    if (!visitorId || !bookmarkIds) {
      return { statusCode: 400, body: 'Missing fields' };
    }
    await query(
      `
    INSERT INTO dua_bookmarks (visitor_id, bookmark_ids, modified_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (visitor_id)
    DO UPDATE SET bookmark_ids = EXCLUDED.bookmark_ids,
    modified_at = NOW();
  `,
      [visitorId, bookmarkIds],
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('save-bookmark-ids function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err || 'Server error' }) };
  }
};
