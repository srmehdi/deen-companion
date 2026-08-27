// // import { schedule } from '@netlify/functions';
// // import webpush, { PushSubscription } from 'web-push';
// // import { query } from './db';
// // import { Endpoints } from '../../src/app/shared/utils/endpoints';

// // const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
// // const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
// // const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
// // const VAPID_SUBJECT =
// //   rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
// //     ? rawSubject
// //     : `mailto:${rawSubject}`;

// // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// // interface SubscriberRecord {
// //   id: number;
// //   visitor_id: string;
// //   subscription: PushSubscription;
// //   latitude: number | null;
// //   longitude: number | null;
// // }

// // interface PrayerApiResponse {
// //   success: boolean;
// //   data: {
// //     date: string;
// //     timezone: string;
// //     prayer_times: Record<string, string>;
// //     prayer_datetimes: Record<string, string>;
// //     islamic_info: {
// //       prayer_names: Record<string, string>;
// //     };
// //   };
// // }

// // // Netlify Cron Syntax: runs every minute to check exact prayer windows
// // export const handler = schedule('* * * * *', async () => {
// //   console.log('🕌 Checking prayer times (+5 min trigger) for active subscribers...');

// //   try {
// //     // 1. Fetch subscribers filtered where notify_daily_content is true
// //     const subRes = await query(
// //       `
// //       SELECT
// //         ps.id,
// //         ps.visitor_id,
// //         ps.subscription,
// //         v.latitude,
// //         v.longitude
// //       FROM push_subscribers ps
// //       INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
// //       WHERE ps.notify_daily_content = true
// //         AND v.latitude IS NOT NULL
// //         AND v.longitude IS NOT NULL;
// //     `,
// //       [],
// //     );

// //     const subscribers: SubscriberRecord[] = subRes.rows;
// //     console.log(`Subscriber(s) ${subscribers.length} ...`);

// //     if (subscribers.length === 0) {
// //       return { statusCode: 200 };
// //     }

// //     const now = Date.now();
// //     const expiredSubscriberIds: number[] = [];
// //     const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// //     // 2. Cache prayer times by coordinate pairs to prevent redundant external API calls
// //     const prayerTimesCache = new Map<string, PrayerApiResponse | null>();

// //     const api_key = process.env['API_KEY'] || '';
// //     const ummahBase = process.env['UMMAH_BASE_URL'] || '';

// //     for (const sub of subscribers) {
// //       const lat = Number(sub.latitude);
// //       const lng = Number(sub.longitude);
// //       const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

// //       let prayerData = prayerTimesCache.get(cacheKey);

// //       if (prayerData === undefined) {
// //         const apiUrl = `${ummahBase}${Endpoints.PRAYER_TIMES}?lat=${lat}&lng=${lng}&madhab=Shafi&apikey=${api_key}`;
// //         try {
// //           const response = await fetch(apiUrl);
// //           if (response.ok) {
// //             prayerData = (await response.json()) as PrayerApiResponse;
// //             console.log('prayerData Api call response', prayerData);

// //             prayerTimesCache.set(cacheKey, prayerData);
// //           } else {
// //             prayerTimesCache.set(cacheKey, null);
// //           }
// //         } catch (fetchErr) {
// //           console.error(`Failed to fetch prayer times for ${cacheKey}:`, fetchErr);
// //           prayerTimesCache.set(cacheKey, null);
// //         }
// //       } else {
// //         console.log('prayerData Cached reponse', prayerData);
// //       }

// //       if (!prayerData || !prayerData.success || !prayerData.data?.prayer_datetimes) {
// //         continue;
// //       }

// //       const { prayer_datetimes, prayer_times, islamic_info, date } = prayerData.data;

// //       // 3. Trigger push if current time matches the exact +5 minute offset window
// //       for (const prayerKey of corePrayers) {
// //         const isoTime = prayer_datetimes[prayerKey];
// //         if (!isoTime) continue;

// //         const prayerStartTime = new Date(isoTime).getTime();
// //         // Exact trigger target: 5 minutes (300,000 ms) after prayer start
// //         const triggerTime = prayerStartTime + 5 * 60 * 1000;

// //         // console.log('prayer', prayerStartTime, triggerTime);

// //         // Matches current 1-minute execution cycle (0 to 60 seconds)
// //         const timeDiff = now - triggerTime;
// //         const isWithinWindow = timeDiff >= 0 && timeDiff < 60000;

// //         if (isWithinWindow) {
// //           const prayerName = islamic_info.prayer_names[prayerKey] || prayerKey.toUpperCase();
// //           const formattedStartTime = prayer_times[prayerKey] || '';

// //           const payload = JSON.stringify({
// //             notification: {
// //               title: `🕌 ${prayerName} Time`,
// //               body: `It is now 5 minutes past ${prayerName} (${formattedStartTime}). Have you prayed?`,
// //               icon: '/logo.svg',
// //               badge: '/badge.svg',
// //               tag: `prayer_${prayerKey}_${date}`,
// //               renotify: true,
// //               vibrate: [200, 100, 200, 100, 400],
// //               actions: [
// //                 {
// //                   action: 'dismiss',
// //                   title: '❌ Dismiss',
// //                 },
// //                 {
// //                   action: 'open-guide',
// //                   title: '📖 Namaz Guide',
// //                 },
// //               ],
// //               data: {
// //                 url: `/namaz-guide/${prayerKey}`,
// //                 onActionClick: {
// //                   default: { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
// //                   'open-guide': { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
// //                 },
// //               },
// //             },
// //           });

// //           try {
// //             await webpush.sendNotification(sub.subscription, payload);
// //           } catch (err: any) {
// //             if (err.statusCode === 410 || err.statusCode === 404) {
// //               //   expiredSubscriberIds.push(sub.id);
// //               console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
// //             } else {
// //               console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
// //             }
// //           }
// //         }
// //       }
// //     }

// //     // 4. Clean up expired/uninstalled subscriptions
// //     if (expiredSubscriberIds.length > 0) {
// //       await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
// //         expiredSubscriberIds,
// //       ]);
// //       console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
// //     }

// //     return { statusCode: 200 };
// //   } catch (error: any) {
// //     console.error('Error in prayer notification cron:', error);
// //     return { statusCode: 500 };
// //   }
// // });

// import { schedule } from '@netlify/functions';
// import webpush, { PushSubscription } from 'web-push';
// import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
// import { query } from './db';

// const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
// const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
// const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
// const VAPID_SUBJECT =
//   rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
//     ? rawSubject
//     : `mailto:${rawSubject}`;

// webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// interface SubscriberRecord {
//   id: number;
//   visitor_id: string;
//   subscription: PushSubscription;
//   latitude: number | null;
//   longitude: number | null;
// }

// export const handler = schedule('* * * * *', async () => {
//   console.log('🕌 Running zero-API prayer reminder check (Local Adhan calculation)...');

//   try {
//     const subRes = await query(
//       `
//       SELECT
//         ps.id,
//         ps.visitor_id,
//         ps.subscription,
//         v.latitude,
//         v.longitude
//       FROM push_subscribers ps
//       INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
//       WHERE ps.notify_daily_content = true
//         AND v.latitude IS NOT NULL
//         AND v.longitude IS NOT NULL;
//     `,
//       [],
//     );

//     const subscribers: SubscriberRecord[] = subRes.rows;
//     if (subscribers.length === 0) {
//       return { statusCode: 200 };
//     }

//     const now = new Date();
//     const currentEpoch = now.getTime();
//     const expiredSubscriberIds: number[] = [];

//     const prayerLabels: Record<string, string> = {
//       fajr: 'Fajr',
//       dhuhr: 'Dhuhr',
//       asr: 'Asr',
//       maghrib: 'Maghrib',
//       isha: 'Isha',
//     };

//     const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

//     for (const sub of subscribers) {
//       const lat = Number(sub.latitude);
//       const lng = Number(sub.longitude);

//       // Instant local mathematical calculation (0 network delay, 0 external API calls)
//       const coordinates = new Coordinates(lat, lng);
//       const params = CalculationMethod.MuslimWorldLeague();
//       params.madhab = Madhab.Shafi;
//       const prayerTimes = new PrayerTimes(coordinates, now, params);

//       const prayerDates: Record<string, Date> = {
//         fajr: prayerTimes.fajr,
//         dhuhr: prayerTimes.dhuhr,
//         asr: prayerTimes.asr,
//         maghrib: prayerTimes.maghrib,
//         isha: prayerTimes.isha,
//       };

//       for (let i = 0; i < corePrayers.length; i++) {
//         const prayerKey = corePrayers[i];
//         const nextPrayerKey = corePrayers[i + 1];

//         const prayerDate = prayerDates[prayerKey];
//         if (!prayerDate) continue;

//         const prayerStartTime = prayerDate.getTime();
//         const nextPrayerStartTime =
//           nextPrayerKey && prayerDates[nextPrayerKey]
//             ? prayerDates[nextPrayerKey].getTime()
//             : prayerStartTime + 4 * 60 * 60 * 1000;
//         // console.log(
//         //   'prayer-time-push',
//         //   prayerKey,
//         //   new Intl.DateTimeFormat('en-US', {
//         //     hour: '2-digit',
//         //     minute: '2-digit',
//         //     hour12: false,
//         //   }).format(prayerDate),
//         // );

//         // Check if we are currently inside this active prayer window
//         if (currentEpoch >= prayerStartTime && currentEpoch < nextPrayerStartTime) {
//           const elapsedMinutes = Math.floor((currentEpoch - prayerStartTime) / (60 * 1000));

//           // Run every minute from minute 5 to 60
//           if (elapsedMinutes >= 5 && elapsedMinutes <= 60) {
//             const prayerName = prayerLabels[prayerKey];
//             const formattedTime = new Intl.DateTimeFormat('en-US', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: false,
//             }).format(prayerDate);

//             const isInitialAlert = elapsedMinutes === 5;
//             const dateStr = now.toISOString().split('T')[0];

//             const payload = JSON.stringify({
//               notification: {
//                 title: `🕌 ${prayerName} Time`,
//                 body: `It is now ${elapsedMinutes} minutes past ${prayerName} (${formattedTime}). Have you prayed?`,
//                 icon: '/logo.svg',
//                 badge: '/badge.svg',
//                 tag: `prayer_${prayerKey}_${dateStr}`,
//                 renotify: isInitialAlert, // false for minute 6+ to update silently in tray
//                 silent: !isInitialAlert,
//                 ...(isInitialAlert ? { vibrate: [200, 100, 200, 100, 400] } : {}),
//                 actions: [
//                   { action: 'dismiss', title: '❌ Dismiss' },
//                   { action: 'open-guide', title: '📖 Namaz Guide' },
//                 ],
//                 data: {
//                   url: `/namaz-guide/${prayerKey}`,
//                   onActionClick: {
//                     default: { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
//                     'open-guide': { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
//                   },
//                 },
//               },
//             });

//             try {
//               await webpush.sendNotification(sub.subscription, payload);
//             } catch (err: any) {
//               if (err.statusCode === 410 || err.statusCode === 404) {
//                 // expiredSubscriberIds.push(sub.id);
//                 console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
//               } else {
//                 console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
//               }
//             }
//           }
//         }
//       }
//     }

//     if (expiredSubscriberIds.length > 0) {
//       await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
//         expiredSubscriberIds,
//       ]);
//       console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
//     }

//     return { statusCode: 200 };
//   } catch (error: any) {
//     console.error('Error in prayer notification cron:', error);
//     return { statusCode: 500 };
//   }
// });

// // import { schedule } from '@netlify/functions';
// // import webpush, { PushSubscription } from 'web-push';
// // import { query } from './db';
// // import { Endpoints } from '../../src/app/shared/utils/endpoints';

// // const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
// // const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
// // const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
// // const VAPID_SUBJECT =
// //   rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
// //     ? rawSubject
// //     : `mailto:${rawSubject}`;

// // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// // interface SubscriberRecord {
// //   id: number;
// //   visitor_id: string;
// //   subscription: PushSubscription;
// //   latitude: number | null;
// //   longitude: number | null;
// // }

// // interface PrayerApiResponse {
// //   success: boolean;
// //   data: {
// //     date: string;
// //     timezone: string;
// //     prayer_times: Record<string, string>;
// //     prayer_datetimes: Record<string, string>;
// //     islamic_info: {
// //       prayer_names: Record<string, string>;
// //     };
// //   };
// // }

// // // Netlify Cron Syntax: runs every minute to check exact prayer windows
// // export const handler = schedule('* * * * *', async () => {
// //   console.log('🕌 Checking prayer times (+5 min trigger) for active subscribers...');

// //   try {
// //     // 1. Fetch subscribers filtered where notify_daily_content is true
// //     const subRes = await query(
// //       `
// //       SELECT
// //         ps.id,
// //         ps.visitor_id,
// //         ps.subscription,
// //         v.latitude,
// //         v.longitude
// //       FROM push_subscribers ps
// //       INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
// //       WHERE ps.notify_daily_content = true
// //         AND v.latitude IS NOT NULL
// //         AND v.longitude IS NOT NULL;
// //     `,
// //       [],
// //     );

// //     const subscribers: SubscriberRecord[] = subRes.rows;
// //     console.log(`Subscriber(s) ${subscribers.length} ...`);

// //     if (subscribers.length === 0) {
// //       return { statusCode: 200 };
// //     }

// //     const now = Date.now();
// //     const expiredSubscriberIds: number[] = [];
// //     const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// //     // 2. Cache prayer times by coordinate pairs to prevent redundant external API calls
// //     const prayerTimesCache = new Map<string, PrayerApiResponse | null>();

// //     const api_key = process.env['API_KEY'] || '';
// //     const ummahBase = process.env['UMMAH_BASE_URL'] || '';

// //     for (const sub of subscribers) {
// //       const lat = Number(sub.latitude);
// //       const lng = Number(sub.longitude);
// //       const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

// //       let prayerData = prayerTimesCache.get(cacheKey);

// //       if (prayerData === undefined) {
// //         const apiUrl = `${ummahBase}${Endpoints.PRAYER_TIMES}?lat=${lat}&lng=${lng}&madhab=Shafi&apikey=${api_key}`;
// //         try {
// //           const response = await fetch(apiUrl);
// //           if (response.ok) {
// //             prayerData = (await response.json()) as PrayerApiResponse;
// //             console.log('prayerData Api call response', prayerData);

// //             prayerTimesCache.set(cacheKey, prayerData);
// //           } else {
// //             prayerTimesCache.set(cacheKey, null);
// //           }
// //         } catch (fetchErr) {
// //           console.error(`Failed to fetch prayer times for ${cacheKey}:`, fetchErr);
// //           prayerTimesCache.set(cacheKey, null);
// //         }
// //       } else {
// //         console.log('prayerData Cached reponse', prayerData);
// //       }

// //       if (!prayerData || !prayerData.success || !prayerData.data?.prayer_datetimes) {
// //         continue;
// //       }

// //       const { prayer_datetimes, prayer_times, islamic_info, date } = prayerData.data;

// //       // 3. Trigger push if current time matches the exact +5 minute offset window
// //       for (const prayerKey of corePrayers) {
// //         const isoTime = prayer_datetimes[prayerKey];
// //         if (!isoTime) continue;

// //         const prayerStartTime = new Date(isoTime).getTime();
// //         // Exact trigger target: 5 minutes (300,000 ms) after prayer start
// //         const triggerTime = prayerStartTime + 5 * 60 * 1000;

// //         // console.log('prayer', prayerStartTime, triggerTime);

// //         // Matches current 1-minute execution cycle (0 to 60 seconds)
// //         const timeDiff = now - triggerTime;
// //         const isWithinWindow = timeDiff >= 0 && timeDiff < 60000;

// //         if (isWithinWindow) {
// //           const prayerName = islamic_info.prayer_names[prayerKey] || prayerKey.toUpperCase();
// //           const formattedStartTime = prayer_times[prayerKey] || '';

// //           const payload = JSON.stringify({
// //             notification: {
// //               title: `🕌 ${prayerName} Time`,
// //               body: `It is now 5 minutes past ${prayerName} (${formattedStartTime}). Have you prayed?`,
// //               icon: '/logo.svg',
// //               badge: '/badge.svg',
// //               tag: `prayer_${prayerKey}_${date}`,
// //               renotify: true,
// //               vibrate: [200, 100, 200, 100, 400],
// //               actions: [
// //                 {
// //                   action: 'dismiss',
// //                   title: '❌ Dismiss',
// //                 },
// //                 {
// //                   action: 'open-guide',
// //                   title: '📖 Namaz Guide',
// //                 },
// //               ],
// //               data: {
// //                 url: `/namaz-guide/${prayerKey}`,
// //                 onActionClick: {
// //                   default: { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
// //                   'open-guide': { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
// //                 },
// //               },
// //             },
// //           });

// //           try {
// //             await webpush.sendNotification(sub.subscription, payload);
// //           } catch (err: any) {
// //             if (err.statusCode === 410 || err.statusCode === 404) {
// //               //   expiredSubscriberIds.push(sub.id);
// //               console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
// //             } else {
// //               console.error(`Failed sending prayer push to subscriber ${sub.id}:`, err.message);
// //             }
// //           }
// //         }
// //       }
// //     }

// //     // 4. Clean up expired/uninstalled subscriptions
// //     if (expiredSubscriberIds.length > 0) {
// //       await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
// //         expiredSubscriberIds,
// //       ]);
// //       console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
// //     }

// //     return { statusCode: 200 };
// //   } catch (error: any) {
// //     console.error('Error in prayer notification cron:', error);
// //     return { statusCode: 500 };
// //   }
// // });

// import { schedule } from '@netlify/functions';
// import webpush, { PushSubscription } from 'web-push';
// import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
// import { query } from './db';

// const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'] || '';
// const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'] || '';
// const rawSubject = process.env['SMTP_USER'] || process.env['VAPID_SUBJECT'] || 'test@example.com';
// const VAPID_SUBJECT =
//   rawSubject.startsWith('mailto:') || rawSubject.startsWith('http')
//     ? rawSubject
//     : `mailto:${rawSubject}`;

// webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// interface SubscriberRecord {
//   id: number;
//   visitor_id: string;
//   subscription: PushSubscription;
//   latitude: number | null;
//   longitude: number | null;
// }

// export const handler = schedule('* * * * *', async () => {
//   console.log('🕌 Running zero-API prayer reminder check (Local Adhan calculation)...');

//   try {
//     const subRes = await query(
//       `
//       SELECT
//         ps.id,
//         ps.visitor_id,
//         ps.subscription,
//         v.latitude,
//         v.longitude
//       FROM push_subscribers ps
//       INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
//       WHERE ps.notify_daily_content = true
//         AND v.latitude IS NOT NULL
//         AND v.longitude IS NOT NULL;
//     `,
//       [],
//     );

//     const subscribers: SubscriberRecord[] = subRes.rows;
//     if (subscribers.length === 0) {
//       return { statusCode: 200 };
//     }

//     const now = new Date();
//     const currentEpoch = now.getTime();
//     const expiredSubscriberIds: number[] = [];

//     const prayerLabels: Record<string, string> = {
//       fajr: 'Fajr',
//       dhuhr: 'Dhuhr',
//       asr: 'Asr',
//       maghrib: 'Maghrib',
//       isha: 'Isha',
//     };

//     const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

//     for (const sub of subscribers) {
//       const lat = Number(sub.latitude);
//       const lng = Number(sub.longitude);

//       // Instant local mathematical calculation (0 network delay, 0 external API calls)
//       const coordinates = new Coordinates(lat, lng);
//       const params = CalculationMethod.MuslimWorldLeague();
//       params.madhab = Madhab.Shafi;
//       const prayerTimes = new PrayerTimes(coordinates, now, params);

//       const prayerDates: Record<string, Date> = {
//         fajr: prayerTimes.fajr,
//         dhuhr: prayerTimes.dhuhr,
//         asr: prayerTimes.asr,
//         maghrib: prayerTimes.maghrib,
//         isha: prayerTimes.isha,
//       };

//       for (let i = 0; i < corePrayers.length; i++) {
//         const prayerKey = corePrayers[i];
//         const nextPrayerKey = corePrayers[i + 1];

//         const prayerDate = prayerDates[prayerKey];
//         if (!prayerDate) continue;

//         const prayerStartTime = prayerDate.getTime();
//         const nextPrayerStartTime =
//           nextPrayerKey && prayerDates[nextPrayerKey]
//             ? prayerDates[nextPrayerKey].getTime()
//             : prayerStartTime + 4 * 60 * 60 * 1000;
//         // console.log(
//         //   'prayer-time-push',
//         //   prayerKey,
//         //   new Intl.DateTimeFormat('en-US', {
//         //     hour: '2-digit',
//         //     minute: '2-digit',
//         //     hour12: false,
//         //   }).format(prayerDate),
//         // );

//         // Check if we are currently inside this active prayer window
//         if (currentEpoch >= prayerStartTime && currentEpoch < nextPrayerStartTime) {
//           const elapsedMinutes = Math.floor((currentEpoch - prayerStartTime) / (60 * 1000));

//           // Run every minute from minute 5 to 60
//           if (elapsedMinutes >= 5 && elapsedMinutes <= 60) {
//             const prayerName = prayerLabels[prayerKey];
//             const formattedTime = new Intl.DateTimeFormat('en-US', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: false,
//             }).format(prayerDate);

//             const isInitialAlert = elapsedMinutes === 5;
//             const dateStr = now.toISOString().split('T')[0];

//             const payload = JSON.stringify({
//               notification: {
//                 title: `🕌 ${prayerName} Time`,
//                 body: `It is now ${elapsedMinutes} minutes past ${prayerName} (${formattedTime}). Have you prayed?`,
//                 icon: '/logo.svg',
//                 badge: '/badge.svg',
//                 tag: `prayer_${prayerKey}_${dateStr}`,
//                 renotify: isInitialAlert, // false for minute 6+ to update silently in tray
//                 silent: !isInitialAlert,
//                 ...(isInitialAlert ? { vibrate: [200, 100, 200, 100, 400] } : {}),
//                 actions: [
//                   { action: 'dismiss', title: '❌ Dismiss' },
//                   { action: 'open-guide', title: '📖 Namaz Guide' },
//                 ],
//                 data: {
//                   url: `/namaz-guide/${prayerKey}`,
//                   onActionClick: {
//                     default: { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
//                     'open-guide': { operation: 'openWindow', url: `/namaz-guide/${prayerKey}` },
//                   },
//                 },
//               },
//             });

//             try {
//               await webpush.sendNotification(sub.subscription, payload);
//             } catch (err: any) {
//               if (err.statusCode === 410 || err.statusCode === 404) {
//                 // expiredSubscriberIds.push(sub.id);
//                 console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
//               } else {
//                 console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
//               }
//             }
//           }
//         }
//       }
//     }

//     if (expiredSubscriberIds.length > 0) {
//       await query(`DELETE FROM push_subscribers WHERE id = ANY($1::int[]);`, [
//         expiredSubscriberIds,
//       ]);
//       console.log(`Cleaned up ${expiredSubscriberIds.length} expired subscriptions.`);
//     }

//     return { statusCode: 200 };
//   } catch (error: any) {
//     console.error('Error in prayer notification cron:', error);
//     return { statusCode: 500 };
//   }
// });

import { schedule } from '@netlify/functions';
import webpush, { PushSubscription } from 'web-push';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import { query } from './db';

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
  time_zone: string | null;
  last_acknowledged_prayer: string | null;
  last_acknowledged_date: string | null;
}

export const handler = schedule('* * * * *', async () => {
  console.log('🕌 Running zero-API prayer reminder check with local timezone...');

  try {
    // 1. Fetch subscribers with latitude, longitude, and user's saved timezone from visitors
    const subRes = await query(
      `
      SELECT 
        ps.id,
        ps.visitor_id,
        ps.subscription,
        ps.last_acknowledged_prayer,
        ps.last_acknowledged_date,
        v.latitude,
        v.longitude,
        v.time_zone
      FROM push_subscribers ps
      INNER JOIN visitors v ON ps.visitor_id::text = v.visitor_id::text
      WHERE ps.notify_daily_content = true
        AND v.latitude IS NOT NULL 
        AND v.longitude IS NOT NULL;
    `,
      [],
    );

    const subscribers: SubscriberRecord[] = subRes.rows;
    if (subscribers.length === 0) {
      return { statusCode: 200 };
    }

    const now = new Date();
    const currentEpoch = now.getTime();
    const expiredSubscriberIds: number[] = [];

    const prayerLabels: Record<string, string> = {
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
    };

    const corePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (const sub of subscribers) {
      const lat = Number(sub.latitude);
      const lng = Number(sub.longitude);
      const userTimeZone = sub.time_zone || 'Asia/Kolkata'; // Fallback to Indian Standard Time

      // Local astronomical calculation
      const coordinates = new Coordinates(lat, lng);
      const params = CalculationMethod.MuslimWorldLeague();
      params.madhab = Madhab.Shafi;
      const prayerTimes = new PrayerTimes(coordinates, now, params);

      const prayerDates: Record<string, Date> = {
        fajr: prayerTimes.fajr,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha,
      };

      for (let i = 0; i < corePrayers.length; i++) {
        const prayerKey = corePrayers[i];
        const nextPrayerKey = corePrayers[i + 1];

        const prayerDate = prayerDates[prayerKey];
        if (!prayerDate) continue;

        const prayerStartTime = prayerDate.getTime();
        const nextPrayerStartTime =
          nextPrayerKey && prayerDates[nextPrayerKey]
            ? prayerDates[nextPrayerKey].getTime()
            : prayerStartTime + 4 * 60 * 60 * 1000;

        // Check if we are within the current prayer's active window
        if (currentEpoch >= prayerStartTime && currentEpoch < nextPrayerStartTime) {
          const elapsedMinutes = Math.floor((currentEpoch - prayerStartTime) / (60 * 1000));
          const dateStr = now.toISOString().split('T')[0];

          // Stop sending if the user already clicked/dismissed this prayer's notification today
          const isAcknowledged =
            sub.last_acknowledged_prayer === prayerKey && sub.last_acknowledged_date === dateStr;

          if (isAcknowledged) {
            continue;
          }
          let minElapsedMinutes = 5;
          let maxElapsedMinutes = 60;

          switch (prayerKey) {
            case 'fajr':
              minElapsedMinutes = 15;
              maxElapsedMinutes = 30;
              break;
            case 'dhuhr':
              minElapsedMinutes = 60;
              maxElapsedMinutes = 75;
              break;
            case 'asr':
              minElapsedMinutes = 60;
              maxElapsedMinutes = 75;
              break;
            case 'maghrib':
              minElapsedMinutes = 5;
              maxElapsedMinutes = 15;
              break;
            case 'isha':
              minElapsedMinutes = 60;
              maxElapsedMinutes = 75;
              break;
          }

          // Trigger notification if current time is within the prayer's active window
          if (elapsedMinutes >= minElapsedMinutes && elapsedMinutes <= maxElapsedMinutes) {
            const prayerName = prayerLabels[prayerKey];

            // Formats with user's local timezone (fixes 5:30 UTC gap)
            const formattedTime = new Intl.DateTimeFormat('en-US', {
              timeZone: userTimeZone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(prayerDate);
            console.log('formattedTime', formattedTime, userTimeZone);

            const isInitialAlert = elapsedMinutes === 5;

            const guideUrl = `/namaz-guide/${prayerKey.toLowerCase()}`;

            const payload = JSON.stringify({
              notification: {
                title: `🕌 ${prayerName} Time`,
                body: `It is now ${elapsedMinutes} minutes past ${prayerName} (${formattedTime}).\nHave you prayed?`,
                icon: '/logo.svg',
                badge: '/badge.svg',
                tag: `prayer_${prayerKey}_${dateStr}`,
                renotify: isInitialAlert,
                silent: !isInitialAlert,
                ...(isInitialAlert ? { vibrate: [200, 100, 200, 100, 400] } : {}),
                actions: [
                  // { action: 'dismiss', title: '❌ Dismiss' },
                  { action: 'open-guide', title: '📖 Namaz Guide' },
                ],
                data: {
                  visitorId: sub.visitor_id,
                  prayerKey: prayerKey,
                  date: dateStr,
                  url: guideUrl,
                  onActionClick: {
                    default: { operation: 'openWindow', url: guideUrl },
                    'open-guide': { operation: 'openWindow', url: guideUrl },
                  },
                },
              },
            });

            try {
              await webpush.sendNotification(sub.subscription, payload);
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // expiredSubscriberIds.push(sub.id);
                console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
              } else {
                console.error(`Failed sending push to subscriber ${sub.id}:`, err.message);
              }
            }
          }
        }
      }
    }

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
