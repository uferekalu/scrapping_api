import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import NodeCache from 'node-cache'
import { fileURLToPath } from 'url'
import { isVideoUrl } from './utils/isVideoLink'
import { getFavicon } from './utils/scrapeImagesAndVideos.mjs'
import unirest from 'unirest'

const cache = new NodeCache({ stdTTL: 3600 })
const app = express()

const browserOptions = {
  headless: true,
  args: ['--no-sandbox'],
}

const launchOptions = {
  timeout: 60000,
}

const writeFileAsync = promisify(fs.writeFile)

app.get('/api/images', cors(), async (req, res) => {
  const url = req.query.url
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing.' })
  }

  try {
    const fetch = (await import('node-fetch')).default
    const response = await fetch(url)
    const html = await response.text()

    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)
    const imageLinks = []

    $('img').each((index, element) => {
      const src = $(element).attr('src')
      if (
        src &&
        (src.toLowerCase().endsWith('.png') ||
          src.toLowerCase().endsWith('.jpg') ||
          src.toLowerCase().endsWith('.svg'))
      ) {
        imageLinks.push(src)
      }
    })

    if (imageLinks.length > 0) {
      res.json({ images: imageLinks })
    } else {
      res.json({ message: 'No images found with the specified extensions.' })
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch images.' })
  }
})

app.get('/api/videos', cors(), async (req, res) => {
  const url = req.query.url
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing.' })
  }

  try {
    const response = await fetch(url)
    const html = await response.text()
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)
    const mediaLinks = []

    $('a').each((index, element) => {
      const href = $(element).attr('href')
      if (href) {
        if (isVideoUrl(href)) {
          mediaLinks.push(href)
        }
      }
    })

    if (mediaLinks.length === 0) {
      $('a').each((index, element) => {
        const text = $(element).text()
        if (text.toLowerCase().includes('video')) {
          mediaLinks.push($(element).attr('href'))
        }
      })
    }

    if (mediaLinks.length > 0) {
      res.json({ videos: mediaLinks })
    } else {
      res.json({ message: 'No video files found.' })
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch video files.' })
  }
})

app.get('/api/pdfs', cors(), async (req, res) => {
  const url = req.query.url
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing.' })
  }

  try {
    const response = await fetch(url)
    const html = await response.text()
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)
    const pdfLinks = []

    $('a').each((index, element) => {
      const href = $(element).attr('href')
      if (href) {
        if (href.toLowerCase().endsWith('.pdf')) {
          pdfLinks.push(href)
        } else if (href.toLowerCase().includes('.pdf')) {
          pdfLinks.push(href)
        }
      }
    })

    if (pdfLinks.length === 0) {
      $('a').each((index, element) => {
        const text = $(element).text()
        if (text.toLowerCase().includes('pdf')) {
          pdfLinks.push($(element).attr('href'))
        }
      })
    }

    if (pdfLinks.length > 0) {
      res.json({ pdfs: pdfLinks })
    } else {
      res.json({ message: 'No PDF files found.' })
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch PDF files.' })
  }
})

app.get('/api/download-pdf', cors(), async (req, res) => {
  const pdfUrl = req.query.url

  try {
    console.log('Fetching PDF from URL:', pdfUrl)
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch PDF')
    }

    console.log('Converting PDF to Blob')
    const pdfBlob = await response.blob()

    console.log('Setting response headers')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="downloaded_file.pdf"',
    )
    res.setHeader('Content-Type', 'application/pdf')

    console.log('Sending PDF response')
    console.log(pdfBlob)
    res.send(pdfBlob)
  } catch (error) {
    console.error('Error downloading file:', error)
    res.status(500).json({ error: 'Failed to download PDF file.' })
  }
})

app.get('/api/summary', cors(), async (req, res) => {
  const { url } = req.query
  try {
    const response = await fetch(url)
    const html = await response.text()
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)

    let title = ''
    let description = ''

    const titleElement = $('title')
    if (titleElement.length > 0) {
      title = titleElement.text().trim()
    }

    const descriptionElement = $('meta[name="description"]')
    if (descriptionElement.length > 0) {
      description = descriptionElement.attr('content')
      if (description) {
        description = description.trim()
      }
    }

    if (!description && title) {
      description = title
    } else if (!description && !title) {
      description =
        'No description available. Click on the link to see the website in details'
    }

    console.log(description)

    res.json({ title, description })
  } catch (error) {
    console.error('Error fetching webpage content:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get('/api/thumbnail', cors(), async (req, res) => {
  const url = req.query.url
  const width = req.query.width || 1024
  const height = req.query.height || 768
  const filename = `${crypto
    .createHash('sha256')
    .update(req.query.url)
    .digest('hex')}-${width}x${height}.png`
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const cacheKey = `thumbnail-${filename}`

  try {
    const cachedThumbnail = cache.get(cacheKey)
    if (cachedThumbnail) {
      res
        .status(200)
        .json({ url: `${req.protocol}://${req.get('host')}/${filename}` })
      return
    }

    const browser = await puppeteer.launch(browserOptions, launchOptions)
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.setViewport({ width, height })
    const thumbnail = await page.screenshot({ type: 'png' })
    await browser.close()

    await writeFileAsync(path.join(dirname, 'public', filename), thumbnail)
    cache.set(cacheKey, thumbnail, 3600)

    res
      .status(200)
      .json({ url: `${req.protocol}://${req.get('host')}/${filename}` })
  } catch (error) {
    console.error(error)
    res.status(500).send('Error generating thumbnail')
  }
})

app.get('/api/favicon', cors(), async (req, res) => {
  const url = req.query.url
  const faviconUrl = await getFavicon(url)

  if (!faviconUrl) {
    return res.status(404).send('Favicon not found')
  }

  res.json(faviconUrl)
})

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getOrganicData = async (url, maxResults = 40) => {
  const cheerio = (await import('cheerio')).default

  const mainQuery = url.split('?q=')[1];
  console.log("query", mainQuery)

  const resultsPerPage = 10
  let remainingResults = maxResults
  let startIndex = 0
  let organicResults = []

  while (remainingResults > 0) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      url,
    )}&start=${startIndex}`

    try {
      const response = await unirest.get(searchUrl).headers({
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
      })

      if (!response.ok) {
        console.error(`HTTP error, status = ${response.status}`)
        return null
      }

      const $ = cheerio.load(response.body)

      $('.g').each((i, el) => {
        const title = $(el).find('h3').text()
        const link = $(el).find('a').attr('href')
        const snippet = $(el).find('.VwiC3b span').html()
        const displayedLink = $(el).find('.tjvcx').text()
        const imageUrl = $(el).find('.XNo5Ab').attr('src')

        organicResults.push({
          title,
          link,
          snippet,
          displayedLink,
          imageUrl,
        })
      })

      startIndex += resultsPerPage
      remainingResults -= resultsPerPage
      
      await delay(1000)
    } catch (error) {
      console.error('Error fetching search results:', error)
      return null
    }
  }

  return organicResults.slice(0, maxResults)
}

// const getOrganicData = async (url) => {
//   const cheerio = (await import('cheerio')).default
//   return new Promise((resolve, reject) => {
//     unirest
//       .get(url)
//       .headers({
// 'User-Agent':
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
//       })
//       .end((response) => {
//         if (response.error) {
//           reject(response.error)
//           return
//         }

//         const $ = cheerio.load(response.body)
//         console.log(response.status)
//         const titles = []
//         const links = []
//         const snippets = []
//         const displayedLinks = []

//         $('.g .yuRUbf h3').each((i, el) => {
//           titles[i] = $(el).text()
//         })
//         $('.yuRUbf a').each((i, el) => {
//           links[i] = $(el).attr('href')
//         })
//         $('.g .VwiC3b ').each((i, el) => {
//           snippets[i] = $(el).text()
//         })
//         $('.g .yuRUbf .NJjxre .tjvcx').each((i, el) => {
//           displayedLinks[i] = $(el).text()
//         })

//         const organicResults = []

//         for (let i = 0; i < titles.length; i++) {
//           organicResults[i] = {
//             title: titles[i],
//             links: links[i],
//             snippet: snippets[i],
//             displayedLink: displayedLinks[i],
//           }
//         }
//         console.log(organicResults)
//         resolve(organicResults)
//       })
//   })
// }

app.get('/api/googleScrape', cors(), async (req, res) => {
  const url = req.query.url
  try {
    const organicResults = await getOrganicData(url)
    res.json(organicResults)
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
    console.error(error)
  }
})

app.use(express.static('public'))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
