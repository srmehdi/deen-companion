import { schedule } from '@netlify/functions';
import webpush, { PushSubscription } from 'web-push';
import { query } from './db';

const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
const VAPID_SUBJECT =
  rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
    ? rawSubject
    : `mailto:${rawSubject}`;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface UmmahApiResponse {
  hadith?: string;
  dua?: string;
  translation?: string;
  source?: string;
  text?: string;
  title?: string;
}

// Netlify Cron Syntax: runs every hour
export const handler = schedule('0 * * * *', async () => {
  console.log('📖 Fetching daily Islamic reminder and preparing push...');

  try {
    // 1. Fetch random Hadith or Dua from UmmahAPI
    const notificationContent = await fetchDailyIslamicContent();

    // 2. Fetch all active subscribers opted into daily content
    const res = await query(
      `SELECT id, visitor_id, subscription FROM push_subscribers WHERE notify_daily_content = true;`,
      [],
    );

    const subscribers = res.rows;
    console.log(`Sending to ${subscribers.length} subscriber(s)...`);

    // 3. Dispatch push notifications in parallel
    const expiredSubscriberIds: number[] = [];

    const sendPromises = subscribers.map(
      async (sub: { id: number; subscription: PushSubscription }) => {
        try {
          const payload = JSON.stringify({
            notification: {
              title: notificationContent.title,
              body: notificationContent.body,
              icon: '/logo.svg',
              badge: '/badge.svg',
              // Custom vibration rhythm: 200ms vibe, 100ms pause, 200ms vibe, 100ms pause, 400ms vibe
              vibrate: [200, 100, 200, 100, 400],
              // vibrate: [100, 50, 100],
              actions: [
                // {
                //   action: 'dismiss',
                //   title: '❌ Dismiss',
                // },
                {
                  action: 'go-to-content',
                  title: '👀 View Content',
                },
                {
                  action: 'open-content-page',
                  title: '✨ More Like This',
                },
              ],
              data: {
                url: notificationContent.goToContentUrl,
                goToContentUrl: notificationContent.goToContentUrl,
                openContentPageUrl: notificationContent.openContentPageUrl,
                onActionClick: {
                  default: { operation: 'openWindow', url: notificationContent.goToContentUrl },
                  'go-to-content': {
                    operation: 'openWindow',
                    url: notificationContent.goToContentUrl,
                  },
                  'open-content-page': {
                    operation: 'openWindow',
                    url: notificationContent.openContentPageUrl,
                  },
                },
              },
            },
          });

          await webpush.sendNotification(sub.subscription, payload);
        } catch (err: any) {
          // 410 Gone / 404 Not Found: User uninstalled or revoked permissions
          if (err.statusCode === 410 || err.statusCode === 404) {
            // expiredSubscriberIds.push(sub.id);
            console.error(`Failed to send to subscriber ${sub.id}:`, err.message);
          } else {
            console.error(`Failed to send to subscriber ${sub.id}:`, err.message);
          }
        }
      },
    );

    await Promise.all(sendPromises);

    // 4. Cleanup stale subscriptions to keep database fast and clean
    if (expiredSubscriberIds.length > 0) {
      await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
        expiredSubscriberIds,
      ]);
      console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
    }

    return { statusCode: 200 };
  } catch (error: any) {
    console.error('Error executing daily Islamic push job:', error);
    return { statusCode: 500 };
  }
});

// Helper: Fetches dynamic content from UmmahAPI with fallbacks
async function fetchDailyIslamicContent(): Promise<{
  title: string;
  body: string;
  goToContentUrl: string;
  openContentPageUrl: string;
}> {
  // Alternate between Hadith and Dua (or choose randomly)
  const isHadith = Math.random() > 0.5;

  try {
    if (isHadith) {
      const response = await fetch('https://ummahapi.com/api/hadith/random?collection=bukhari');
      if (response.ok) {
        const data: any = await response.json();
        const hadithText =
          data?.data.english || data?.text || data?.translation || 'Daily Hadith reflection';
        const narrator = data?.data.collection_name || data?.chapter || 'Sahih al-Bukhari';

        // return {
        //   title: `📖 Daily Hadith (${narrator.slice(0, 30)})`,
        //   body: truncateText(hadithText, 140),
        //   url: '/hadees',
        // };
        const collectionKey = data?.data.collection || 'bukhari';
        const hadithNumber = data?.data.hadithnumber;
        const hadithId = data?.data.id;
        return {
          title: `📖 Daily Hadith (${narrator})`,
          body: hadithText,
          goToContentUrl: `/hadees/${collectionKey}?hadithNumber=${hadithNumber}&hadithId=${encodeURIComponent(hadithId)}`,
          openContentPageUrl: '/hadees',
        };
      }
    } else {
      const response = await fetch('https://ummahapi.com/api/duas/random');
      if (response.ok) {
        const data: any = await response.json();
        const duaTextArabic = data?.data.arabic || '...';
        const duaText =
          data?.data.translation || data?.dua || data?.meaning || 'Daily Dua reflection';
        const title = data?.data.title || 'Daily Dua Reminder';
        const duaId = data?.data.id;
        return {
          title: `🤲 ${title}`,
          body: duaTextArabic + '\n' + duaText,
          goToContentUrl: `/dua?duaId=${duaId}`,
          openContentPageUrl: '/dua',
        };
        // return {
        //   title: `🤲 ${title.slice(0, 35)}`,
        //   body: truncateText(duaText, 140),
        //   url: '/dua',
        // };
      }
    }
  } catch (apiErr) {
    console.warn('UmmahAPI fetch failed, using fallback content:', apiErr);
  }

  // Safe fallback if the external API is temporarily down
  return {
    title: '🌿 Daily Islamic Reminder',
    body: '"Verily, in the remembrance of Allah do hearts find rest." [Surah Ar-Ra`d: 28]',
    goToContentUrl: `/`,
    openContentPageUrl: '/',
  };
}

// Helper: Truncates notification body so it renders cleanly on mobile push screens
function truncateText(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 3) + '...';
}
function truncateAtWord(text: string, maxLength = 130): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;

  // Find the last space within the allowed length so words aren't cut in half
  const truncated = cleaned.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return (lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) : truncated) + '...';
}
