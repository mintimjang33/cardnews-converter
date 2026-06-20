export default async function handler(req, res) {
  const { url } = req.query
  if (!url || !url.startsWith('https://img.youtube.com/vi/')) {
    return res.status(403).json({ error: 'Invalid URL' })
  }
  // 서버 프록시 시도 → 실패하면 직접 URL 반환
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error('upstream error')
    const buffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Content-Disposition', 'attachment; filename="youtube_thumbnail.jpg"')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(buffer))
  } catch {
    // 프록시 실패 시 → 클라이언트가 직접 다운로드하도록 URL 반환
    res.status(200).json({ fallback: true, directUrl: url })
  }
}
