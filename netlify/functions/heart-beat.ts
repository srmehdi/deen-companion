import { Handler } from '@netlify/functions';
import { query } from './db';

function extractGeoLocation(headers: Record<string, string | undefined>): {
  city: string;
  country: string;
} {
  const geoHeader = headers['x-nf-geo'];

  if (geoHeader) {
    try {
      // Standard Web API Base64 Decoding
      const binaryString = atob(geoHeader);
      const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
      const decodedString = new TextDecoder().decode(bytes);
      const geoData = JSON.parse(decodedString);

      return {
        city: geoData.city || 'Unknown City',
        country: geoData.country?.name || 'Unknown Country',
      };
    } catch (err) {
      console.error('Error parsing x-nf-geo header:', err);
    }
  }

  return {
    city: headers['x-city'] || 'Unknown City',
    country: headers['x-country-name'] || 'Unknown Country',
  };
}
export const handler: Handler = async (event) => {
  try {
    const { visitorId, device, userAgent, screenResolution, language, timeZone } = JSON.parse(
      event.body || '{}',
    );

    if (!visitorId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing visitorId' }),
      };
    }

    // Decode Netlify Base64 Geo Location Header
    const { city, country } = extractGeoLocation(event.headers);

    const result = await query(
      `
      INSERT INTO visitors (
        visitor_id, 
        visit_count, 
        device, 
        user_agent, 
        screen_resolution, 
        language, 
        time_zone, 
        city, 
        country, 
        last_seen
      )
      VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (visitor_id)
      DO UPDATE SET 
        visit_count = visitors.visit_count + 1,
        device = COALESCE(EXCLUDED.device, visitors.device),
        user_agent = COALESCE(EXCLUDED.user_agent, visitors.user_agent),
        screen_resolution = COALESCE(EXCLUDED.screen_resolution, visitors.screen_resolution),
        language = COALESCE(EXCLUDED.language, visitors.language),
        time_zone = COALESCE(EXCLUDED.time_zone, visitors.time_zone),
        city = COALESCE(EXCLUDED.city, visitors.city),
        country = COALESCE(EXCLUDED.country, visitors.country),
        last_seen = NOW()
      RETURNING visit_count;
    `,
      [
        visitorId,
        device || 'Unknown Device',
        userAgent || '',
        screenResolution || '',
        language || '',
        timeZone || '',
        city,
        country,
      ],
    );

    const totalVisits = result.rows[0]?.visit_count || 1;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        visitCount: totalVisits,
        location: { city, country },
      }),
    };
  } catch (err: any) {
    console.error('heartBeat function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Server error' }),
    };
  }
};
