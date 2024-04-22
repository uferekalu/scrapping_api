import express from 'express'
import cors from 'cors'
import { isVideoUrl } from './utils/isVideoLink'

const app = express()

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

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
