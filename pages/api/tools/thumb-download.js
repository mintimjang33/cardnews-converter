export default async function handler(req, res) {
  const { url } = req.query
  if (!url || !url.startsWith('https://img.youtube.com/vi/')) {
    return res.status(403).json({ error: 'Invalid URL' })
  }
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!response.ok) return res.status(404).json({ error: 'Not found' })
    const buffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Content-Disposition', 'attachment; filename="youtube_thumbnail.jpg"')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(buffer))
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
}
