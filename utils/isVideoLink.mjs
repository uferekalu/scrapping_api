export function isVideoUrl(url) {
  // Add more video URL patterns if necessary
  const videoUrlPatterns = [
    'youtube.com',
    'vimeo.com',
    'dailymotion.com',
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.wmv',
    '.flv',
    '.webm',
    '.ogg',
    '.3gp',
    '.mpeg',
  ]
  return videoUrlPatterns.some((pattern) => url.includes(pattern))
}
