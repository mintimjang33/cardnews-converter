import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { AdSlot } from '../../components/AdSlot'
import { findAdSlot } from '../../lib/adSlots'

function parseMd(md) {
  if (!md) return ''
  return md
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:10px 0">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .split('\n\n').map(b => {
      b = b.trim(); if (!b) return ''
      if (/^<(h[1-3]|ul|ol|pre|blockquote|hr)/.test(b)) return b
      return `<p>${b.replace(/\n/g, '<br>')}</p>`
    }).join('\n')
}

export default function BlogPost() {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('ko')
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])

  useEffect(() => {
    const slug = window.location.pathname.split('/blog/')[1]
    if (!slug) return
    fetch(`/api/blog/posts?slug=${slug}`)
      .then(r => r.json())
      .then(data => { setPost(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {})
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const adLabel = lang === 'en' ? 'Ad' : '광고'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
      불러오는 중...
    </div>
  )

  if (!post || post.error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 36 }}>📭</div>
      <p style={{ color: 'var(--text2)' }}>글을 찾을 수 없습니다</p>
      <Link href="/blog" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>← 블로그 목록</Link>
    </div>
  )

  return (
    <>
      <Head>
        <title>{post.title} - Blog</title>
        <meta name="description" content={post.summary || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.summary || ''} />
        {post.thumbnail && <meta property="og:image" content={post.thumbnail} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Blog" siteHref="/blog" />

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={adLabel} />
        </div>
      )}

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 760 }}>
        <Link href="/blog" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          ← 목록으로
        </Link>

        {post.thumbnail && (
          <img src={post.thumbnail} alt={post.title}
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 28, display: 'block' }} />
        )}

        {post.category && (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--text2)', marginBottom: 14, display: 'inline-block' }}>
            {post.category}
          </span>
        )}

        <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.3, marginBottom: 12, color: 'var(--text)' }}>{post.title}</h1>

        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>
          {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
          {post.author ? ` · ${post.author}` : ''}
        </div>

        {post.summary && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 28, fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
            {post.summary}
          </div>
        )}

        {/* 본문 중간 광고 */}
        {adsOn && (
          <div style={{ marginBottom: 28 }}>
            <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={3} label={adLabel} />
          </div>
        )}

        <div className="md-body" dangerouslySetInnerHTML={{ __html: parseMd(post.content) }} />

        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--text3)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Footer lang={lang} siteName="Unified Tools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} />
    </>
  )
}
