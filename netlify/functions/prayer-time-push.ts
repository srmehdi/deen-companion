import { schedule } from '@netlify/functions';
import webpush, { PushSubscription } from 'web-push';
import { query } from './db';
import { Endpoints } from '../../src/app/shared/utils/endpoints';

const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
const VAPID_SUBJECT =
  rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
    ? rawSubject
    : `mailto:${rawSubject}`;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface SubscriberRecord {
  id: number;
  visitor_id: string;
  subscription: PushSubscription;
  latitude: number | null;
  longitude: number | null;
}

interface PrayerApiResponse {
  success: boolean;
  data: {
    date: string;
    timezone: string;
    prayer_times: Record<string, string>;
    prayer_datetimes: Record<string, string>;
    islamic_info: {
      prayer_names: Record<string, string>;
    };
  };
}

// Netlify Cron Syntax: runs every minute to check exact prayer windows
export const handler = schedule('* * * * *', async () => {
  console.log('🕌 Checking prayer times (+5 min trigger) for active subscribers...');

  try {
    // 1. Fetch subscribers filtered where notify_daily_content is true
    const subRes = await query(
      `
      SELECT 
        ps.id,
        ps.visitor_id,
        ps.subscription,
        v.latitude,
        v.longitude
      FROM push_subscribers ps
      INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
      WHERE ps.notify_daily_content = true
        AND v.latitude IS NOT NULL 
        AND v.longitude IS NOT NULL;
    `,
      [],
    );

    const subscribers: SubscriberRecord[] = subRes.rows;
    console.log(`Subscriber(s) ${subscribers.length} ...`);

    if (subscribers.length === 0) {
      return { statusCode: 200 };
    }

    const now = Date.now();
    const expiredSubscriberIds: number[] = [];
    const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    // 2. Cache prayer times by coordinate pairs to prevent redundant external API calls
    const prayerTimesCache = new Map<string, PrayerApiResponse | null>();

    const api_key = process.env['API_KEY'] || '';
    const ummahBase = process.env['UMMAH_BASE_URL'] || '';

    for (const sub of subscribers) {
      const lat = Number(sub.latitude);
      const lng = Number(sub.longitude);
      const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

      let prayerData = prayerTimesCache.get(cacheKey);

      if (prayerData === undefined) {
        const apiUrl = `${ummahBase}${Endpoints.PRAYER_TIMES}?lat=${lat}&lng=${lng}&madhab=Shafi&apikey=${api_key}`;
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            prayerData = (await response.json()) as PrayerApiResponse;
            console.log('prayerData Api call response', prayerData);

            prayerTimesCache.set(cacheKey, prayerData);
          } else {
            prayerTimesCache.set(cacheKey, null);
          }
        } catch (fetchErr) {
          console.error(`Failed to fetch prayer times for ${cacheKey}:`, fetchErr);
          prayerTimesCache.set(cacheKey, null);
        }
      } else {
        console.log('prayerData Cached reponse', prayerData);
      }

      if (!prayerData || !prayerData.success || !prayerData.data?.prayer_datetimes) {
        continue;
      }

      const { prayer_datetimes, prayer_times, islamic_info, date } = prayerData.data;

      // 3. Trigger push if current time matches the exact +5 minute offset window
      for (const prayerKey of corePrayers) {
        const isoTime = prayer_datetimes[prayerKey];
        if (!isoTime) continue;

        const prayerStartTime = new Date(isoTime).getTime();
        // Exact trigger target: 5 minutes (300,000 ms) after prayer start
        const triggerTime = prayerStartTime + 5 * 60 * 1000;

        // console.log('prayer', prayerStartTime, triggerTime);

        // Matches current 1-minute execution cycle (0 to 60 seconds)
        const timeDiff = now - triggerTime;
        const isWithinWindow = timeDiff >= 0 && timeDiff < 60000;

        if (isWithinWindow) {
          const prayerName = islamic_info.prayer_names[prayerKey] || prayerKey.toUpperCase();
          const formattedStartTime = prayer_times[prayerKey] || '';

          const payload = JSON.stringify({
            notification: {
              title: `🕌 ${prayerName} Time`,
              body: `It is now 5 minutes past ${prayerName} (${formattedStartTime}). Have you prayed?`,
              icon: '/logo.svg',
              badge: '/badge.svg',
              tag: `prayer_${prayerKey}_${date}`,
              renotify: true,
              vibrate: [200, 100, 200, 100, 400],
              actions: [
                {
                  action: 'dismiss',
                  title: '❌ Dismiss',
                },
                {
                  action: 'open-guide',
                  title: '📖 Namaz Guide',
                },
              ],
              data: {
                url: `/namaz-guide/${prayerKey}`,
                onActionClick: {
                  default: { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
                  'open-guide': { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
                },
              },
            },
          });

          try {
            await webpush.sendNotification(sub.subscription, payload);
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              //   expiredSubscriberIds.push(sub.id);
              console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
            } else {
              console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
            }
          }
        }
      }
    }

    // 4. Clean up expired/uninstalled subscriptions
    if (expiredSubscriberIds.length > 0) {
      await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
        expiredSubscriberIds,
      ]);
      console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
    }

    return { statusCode: 200 };
  } catch (error: any) {
    console.error('Error in prayer notification cron:', error);
    return { statusCode: 500 };
  }
});
