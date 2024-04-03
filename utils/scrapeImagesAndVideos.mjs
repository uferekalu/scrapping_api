import fetch from 'node-fetch'
import cheerio from 'cheerio'

export async function scrapeImagesAndVideos(url) {
  try {
    const response = await fetch(url)
    const html = await response.text()
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)

    const images = []
    const videos = []

    // Scrape image URLs
    $('img').each((index, element) => {
      const imageUrl = $(element).attr('src')
      if (imageUrl) {
        images.push(imageUrl)
      }
    })

    // Scrape video URLs from video elements
    $('video source').each((index, element) => {
      const videoUrl = $(element).attr('src')
      if (videoUrl) {
        videos.push(videoUrl)
      }
    })

    // Scrape video URLs from iframes (YouTube, Vimeo, Dailymotion)
    $('iframe').each((index, element) => {
      const src = $(element).attr('src')
      if (
        src &&
        (src.includes('youtube') ||
          src.includes('vimeo') ||
          src.includes('dailymotion'))
      ) {
        videos.push(src)
      }
    })

    // Scrape video URLs from anchor tags linking to video files
    $('a').each((index, element) => {
      const href = $(element).attr('href')
      if (
        href &&
        (href.includes('.mp4') ||
          href.includes('.mov') ||
          href.includes('.wmv'))
      ) {
        videos.push(href)
      }
    })

    return { images, videos }
  } catch (error) {
    console.error('Error scraping:', error)
    return { images: [], videos: [] }
  }
}
