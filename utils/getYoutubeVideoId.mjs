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
  

export async function fetchYouTubeChannelVideos(channelUrl) {
  const channelName = channelUrl.split('/').pop()

  // Make request to YouTube Data API to fetch channel information
  const response = await axios.get(
    `https://www.googleapis.com/youtube/v3/channels?key=AIzaSyC_Oh9wMNjsGnYp44yBrf9Mf0B9ULVLguA&forUsername=${channelName}&part=id`,
  )

  // Extract channel ID from API response
  const channelId = response.data.items[0].id

  // Make request to YouTube Data API to fetch videos
  const videosResponse = await axios.get(
    `https://www.googleapis.com/youtube/v3/search?key=AIzaSyC_Oh9wMNjsGnYp44yBrf9Mf0B9ULVLguA&channelId=${channelId}&part=snippet,id&order=date&maxResults=10`,
  )

  // Extract video information from API response
  const videos = videosResponse.data.items.map((item) => ({
    title: item.snippet.title,
    videoId: item.id.videoId,
    thumbnailUrl: item.snippet.thumbnails.default.url,
    videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }))

  return videos
}
