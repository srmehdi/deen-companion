/// <reference types="node" />
import { Handler } from '@netlify/functions';
import { Endpoints } from '../../src/app/shared/utils/endpoints';

export const handler: Handler = async (event) => {
  const body = event.body ? JSON.parse(event.body) : {};
  const { lat, lang, madhab } = body;
  if (!lat || !lang) {
    return { statusCode: 400, body: 'Missing coordinates' };
  }
  const api_key = process.env.API_KEY;
  const ummahBase = process.env.UMMAH_BASE_URL;
  const API_URL = `${ummahBase}${Endpoints.PRAYER_TIMES}?lat=${lat}&lng=${lang}&madhab=${madhab}&apikey=${api_key}`;

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('getPrayerTimes function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err || 'Server error' }) };
  }
};
