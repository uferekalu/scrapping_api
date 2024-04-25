import fetch from 'node-fetch'
import NodeCache from 'node-cache'

const cache = new NodeCache()

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

export async function getFavicon(url) {
  try {
    // Check if favicon URL is cached
    const cachedFaviconUrl = cache.get(url)
    if (cachedFaviconUrl) {
      return cachedFaviconUrl
    }

    const response = await fetch(url)
    const html = await response.text()
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)
    const faviconUrls = []

    // Check for favicon links in the head tag
    $(
      'head link[rel="icon"], head link[rel="apple-touch-icon"], head link[rel="apple-touch-icon"][sizes="180x180"], head link[rel="shortcut icon"], head link[rel="mask-icon"], head link[rel="preload"][as="image"]',
    ).each(function () {
      const faviconUrl = $(this).attr('href')
      const rel = $(this).attr('rel')
      if (
        faviconUrl &&
        (rel === 'icon' ||
          rel === 'apple-touch-icon' ||
          rel === 'shortcut icon' ||
          rel === 'mask-icon' ||
          rel === 'preload')
      ) {
        faviconUrls.push(faviconUrl)
      }
    })

    // If no favicon URLs found, return null
    if (!faviconUrls.length) {
      return null
    }

    // Handle relative URLs and redirects
    const resolvedFaviconUrls = await Promise.all(
      faviconUrls.map(async (faviconUrl) => {
        if (!faviconUrl.startsWith('http')) {
          faviconUrl = new URL(faviconUrl, url).href
        }
        const faviconResponse = await fetch(faviconUrl)
        if (faviconResponse.ok) {
          return faviconUrl
        }
        if (faviconResponse.redirected) {
          return faviconResponse.url
        }
        return null
      }),
    )

    // Return the first resolved favicon URL
    const validFaviconUrls = resolvedFaviconUrls.filter((url) => url !== null)
    if (validFaviconUrls.length > 0) {
      const faviconUrl = validFaviconUrls[0]
      // Cache the favicon URL
      cache.set(url, faviconUrl)
      return faviconUrl
    } else {
      return null
    }
  } catch (error) {
    console.error(error)
    return null
  }
}
