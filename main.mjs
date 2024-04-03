import express from 'express'
import cors from 'cors'
import { scrapeImagesAndVideos } from './utils/scrapeImagesAndVideos.mjs'

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

app.get('/api/videos', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing.' });
  }

  try {
    const { videos } = await scrapeImagesAndVideos(url);
    
    // If no videos found, send a message
    if (videos.length > 0) {
      res.json({ videos });
    } else {
      res.json({ message: 'No videos found.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch videos.' });
  }
});

app.get('/api/pdfs', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing.' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const cheerio = (await import('cheerio')).default
    const $ = cheerio.load(html)
    const pdfLinks = [];

    // Find all anchor tags and check if their href attribute ends with .pdf
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.toLowerCase().endsWith('.pdf')) {
        pdfLinks.push(href);
      }
    });

    // If no PDFs found, send a message
    if (pdfLinks.length > 0) {
      res.json({ pdfs: pdfLinks });
    } else {
      res.json({ message: 'No PDF files found.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch PDF files.' });
  }
});

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})