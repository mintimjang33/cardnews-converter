export default async function handler(req, res) {
  const { url, name = 'sound' } = req.query
  const allowed = ['cdn.freesound.org', 'freesound.org', 'cdn.pixabay.com', 'mixkit.imgix.net']
  const isAllowed = allowed.some(d => url?.includes(d))
  if (!url || !isAllowed) return res.status(403).json({ error: 'Invalid URL' })
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error()
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${name}.mp3"`)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(buffer))
  } catch {
    // 프록시 실패 → 클라이언트가 직접 열도록 URL 반환
    res.status(200).json({ fallback: true, directUrl: url })
  }
}
