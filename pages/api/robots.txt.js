// pages/api/robots.txt.js
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://www.downtools.co.kr/api/sitemap.xml
`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.status(200).send(robots)
}
