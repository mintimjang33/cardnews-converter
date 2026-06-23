// pages/api/sitemap.xml.js
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://www.downtools.co.kr'

const STATIC_PAGES = [
  { url: '/',              changefreq: 'daily',   priority: '1.0' },
  { url: '/thumb-down',   changefreq: 'weekly',  priority: '0.9' },
  { url: '/sound-down',   changefreq: 'weekly',  priority: '0.9' },
  { url: '/clock-down',   changefreq: 'weekly',  priority: '0.9' },
  { url: '/voice-down',   changefreq: 'weekly',  priority: '0.9' },
  { url: '/text-down',    changefreq: 'weekly',  priority: '0.9' },
  { url: '/cardnews-down',changefreq: 'weekly',  priority: '0.9' },
  { url: '/blog',         changefreq: 'daily',   priority: '0.8' },
  { url: '/faq',          changefreq: 'monthly', priority: '0.5' },
  { url: '/terms',        changefreq: 'monthly', priority: '0.3' },
  { url: '/privacy',      changefreq: 'monthly', priority: '0.3' },
]

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const now = new Date().toISOString().slice(0, 10)

  // 블로그 발행글 slug 목록 조회
  let blogUrls = []
  try {
    const supabase = getSupabase()
    if (supabase) {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .eq('post_type', 'blog')
        .order('published_at', { ascending: false })
      blogUrls = (data || []).map(p => ({
        url: `/blog/${p.slug}`,
        lastmod: (p.updated_at || p.published_at || now).slice(0, 10),
        changefreq: 'monthly',
        priority: '0.7',
      }))
    }
  } catch {}

  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')

  const blogEntries = blogUrls.map(p => `
  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${blogEntries}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  res.status(200).send(xml)
}
