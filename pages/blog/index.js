import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { AdSlot } from '../../components/AdSlot'
import { findAdSlot } from '../../lib/adSlots'

const CATEGORIES = [
  { id: 'all',        label: '전체' },
  { id: 'thumb-down', label: '🖼 썸네일' },
  { id: 'sound-down', label: '🔊 효과음' },
  { id: 'clock-down', label: '⏱ 타이머' },
  { id: 'voice-down', label: '🎤 보이스' },
  { id: 'text-down',  label: '📝 텍스트' },
  { id: 'general',    label: '💡 일반' },
]

export default function BlogIndex() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [lang, setLang] = useState('ko')
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])

  const loadPosts = async (category) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 30 })
      if (category && category !== 'all') params.set('category', category)
      const res = await fetch(`/api/blog/posts?${params}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch { setPosts([]) }
    setLoading(false)
  }

  useEffect(() => { loadPosts(activeCategory) }, [activeCategory])

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

  return (
    <>
      <Head>
        <title>블로그 - Unified Tools</title>
        <meta name="description" content="YouTube 썸네일, 효과음, 온라인 도구 관련 팁과 정보" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Blog" siteHref="/blog" />

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={adLabel} />
        </div>
      )}

      <div className="wrap" style={{ paddingTop: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>📝 블로그</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>유용한 팁, 사용법, 업데이트 소식</p>

        {/* 카테고리 필터 */}
        <div className="cat-chips" style={{ marginBottom: 28 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} className={`cat-chip${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}>
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', height: 220, opacity: 0.4 }} />
            ))
          ) : posts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p>아직 작성된 글이 없습니다</p>
            </div>
          ) : posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{
                background: 'var(--surface)', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'border-color 0.2s',
                height: '100%',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {post.thumbnail && (
                  <img src={post.thumbnail} alt={post.title}
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: 18 }}>
                  {post.category && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: 'var(--surface2)', color: 'var(--text2)', marginBottom: 8, display: 'inline-block',
                    }}>{post.category}</span>
                  )}
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '8px 0 6px', lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  {post.summary && (
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {post.summary}
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
                    {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {adsOn && (
          <div style={{ marginTop: 40 }}>
            <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={3} label={adLabel} />
          </div>
        )}
      </div>

      <Footer lang={lang} siteName="Unified Tools" adsOn={adsOn} />
    </>
  )
}
