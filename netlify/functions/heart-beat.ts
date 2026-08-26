import { Handler } from '@netlify/functions';
import { query } from './db';

interface GeoLocationResult {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
}
function extractGeoLocation(headers: Record<string, string | undefined>): GeoLocationResult {
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
        latitude: typeof geoData.latitude === 'number' ? geoData.latitude : null,
        longitude: typeof geoData.longitude === 'number' ? geoData.longitude : null,
        timeZone: geoData.timezone || '',
      };
    } catch (err) {
      console.error('Error parsing x-nf-geo header:', err);
    }
  }

  return {
    city: headers['x-city'] || 'Unknown City',
    country: headers['x-country-name'] || 'Unknown Country',
    latitude: headers['x-latitude'] ? parseFloat(headers['x-latitude']) : null,
    longitude: headers['x-longitude'] ? parseFloat(headers['x-longitude']) : null,
    timeZone: headers['x-timezone'] || '',
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
    // const { city, country } = extractGeoLocation(event.headers);
    const geo = extractGeoLocation(event.headers);
    const resolvedTimeZone = timeZone || geo.timeZone;

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
        latitude,
        longitude,
        last_seen
      )
      VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
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
        latitude = COALESCE(EXCLUDED.latitude, visitors.latitude),
        longitude = COALESCE(EXCLUDED.longitude, visitors.longitude),
        last_seen = NOW()
      RETURNING visit_count;
    `,
      [
        visitorId,
        device || 'Unknown Device',
        userAgent || '',
        screenResolution || '',
        language || '',
        resolvedTimeZone,
        geo.city,
        geo.country,
        geo.latitude,
        geo.longitude,
      ],
    );

    const totalVisits = result.rows[0]?.visit_count || 1;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        visitCount: totalVisits,
        location: {
          city: geo.city,
          country: geo.country,
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
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
