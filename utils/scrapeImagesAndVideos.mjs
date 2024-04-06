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

    $('img').each((index, element) => {
      const imageUrl = $(element).attr('src')
      if (imageUrl) {
        images.push(imageUrl)
      }
    })

    $('video source').each((index, element) => {
      const videoUrl = $(element).attr('src')
      if (videoUrl) {
        videos.push(videoUrl)
      }
    })
    
    $('video').each((index, element) => {
      const videoUrl = $(element).attr('src')
      if (videoUrl) {
        videos.push(videoUrl)
      }
    })

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

    $('a').each((index, element) => {
      const href = $(element).attr('href')
      if (
        href &&
        (href.includes('.mp4') ||
          href.includes('.mov') ||
          href.includes('.wmv') ||
          href.includes('.webm'))
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
