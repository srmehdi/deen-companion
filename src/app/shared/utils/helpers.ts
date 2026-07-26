// export function getYoutubeEmbedUrl(url: string): string {
//   if (!url) return '';
//   let videoId = '';
//   if (url.includes('/shorts/')) {
//     videoId = url.split('/shorts/')[1];
//   } else if (url.includes('v=')) {
//     videoId = url.split('v=')[1];
//   } else if (url.includes('youtu.be/')) {
//     videoId = url.split('youtu.be/')[1];
//   } else {
//     videoId = url;
//   }

//   if (videoId.includes('?')) {
//     videoId = videoId.split('?')[0];
//   }
//   if (videoId.includes('&')) {
//     videoId = videoId.split('&')[0];
//   }
//   return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&mute=0&rel=0`;
// }
export function getYoutubeEmbedUrl(
  url: string,
  videoList: { url: string }[] = [],
  currentIndex: number = 0,
): string {
  if (!url) return '';

  const currentVideoId = extractVideoId(url);
  if (!currentVideoId) return '';

  // Extract all video IDs in sequence for the playlist parameter
  const allIds = videoList.map((item) => extractVideoId(item.url)).filter(Boolean);

  // If a list is provided, pass all IDs so YouTube natively handles playlist navigation in fullscreen
  const playlistParam = allIds.length > 0 ? allIds.join(',') : currentVideoId;

  return `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&loop=1&playlist=${playlistParam}&mute=0&rel=0`;
}
function extractVideoId(url: string): string {
  if (!url) return '';
  let videoId = '';

  if (url.includes('/shorts/')) {
    videoId = url.split('/shorts/')[1];
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
  } else {
    videoId = url;
  }

  if (videoId.includes('?')) {
    videoId = videoId.split('?')[0];
  }
  if (videoId.includes('&')) {
    videoId = videoId.split('&')[0];
  }

  return videoId;
}
// Helper to parse browser & OS device details
export function getDeviceDetails(): { device: string; userAgent: string } {
  const ua = navigator.userAgent;
  let deviceName = 'Unknown Device';

  if (/android/i.test(ua)) {
    deviceName = 'Android Mobile';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceName = 'iOS Mobile';
  } else if (/macintosh|mac os x/i.test(ua)) {
    deviceName = 'Mac Desktop';
  } else if (/windows/i.test(ua)) {
    deviceName = 'Windows PC';
  } else if (/linux/i.test(ua)) {
    deviceName = 'Linux PC';
  }

  return {
    device: deviceName,
    userAgent: ua,
  };
}
