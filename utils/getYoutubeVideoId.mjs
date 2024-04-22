export function getYouTubeVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

// Helper function to check if a URL is a YouTube channel URL
export function isYouTubeChannel(url) {
    return /^https?:\/\/(?:www\.)?youtube\.com\/(?:user|c|channel)\/.+$/.test(url);
  }
  
