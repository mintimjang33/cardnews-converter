import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { AdSlot } from '../../components/AdSlot'
import { findAdSlot } from '../../lib/adSlots'
import { categoryLabel } from '../../lib/blogCategories'
import { parseMarkdown as parseMd } from '../../lib/parseMarkdown.js'

// 도구 경로 매핑 (블로그 카테고리 코드 → 실제 도구 페이지)
const TOOL_HREF = {
  'thumb-down': '/thumb-down',
  'sound-down': '/sound-down',
  'clock-down': '/clock-down',
  'voice-down': '/voice-down',
  'text-down': '/text-down',
  'cardnews-down': '/cardnews-down',
}

// ── 관련도 점수 계산: 같은 카테고리(+3), 같은 태그(+2/개), 제목 키워드 겹침(+1/개)
function scoreRelated(post, allPosts) {
  if (!post || !Array.isArray(allPosts) || allPosts.length === 0) return []
  return allPosts
    .filter(p => p && p.id !== post.id)
    .map(p => {
      let score = 0
      if (p.category && p.category === post.category) score += 3
      const postTags = Array.isArray(post.tags) ? post.tags : []
      const pTags = Array.isArray(p.tags) ? p.tags : []
      pTags.forEach(t => { if (postTags.includes(t)) score += 2 })
      const kw = (post.title || '').replace(/[^가-힣a-z0-9]/gi, ' ').split(/\s+/).filter(w => w.length > 1)
      kw.forEach(w => { if ((p.title || '').includes(w)) score += 1 })
      return { ...p, _score: score }
    })
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score || new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
}

// ── 본문 중간 삽입용 미니 카드
function InlineRelatedCard({ post }) {
  return (
    <div style={{ margin: '28px 0', padding: 1, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 14 }}>
      <Link href={`/blog/${post.slug || post.id}`}
        style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', textAlign: 'left', background: 'var(--bg)', borderRadius: 13, padding: '16px 20px', textDecoration: 'none' }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📎</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, letterSpacing: '0.5px' }}>관련 글</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
          {post.summary && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.summary}</div>}
        </div>
        <span style={{ color: 'var(--accent)', fontSize: 16, flexShrink: 0 }}>→</span>
      </Link>
    </div>
  )
}

// ── 본문 HTML을 블록 단위로 쪼개서 4문단마다 관련 글 카드 자동 삽입
function ContentWithInlineLinks({ html, relatedPool }) {
  if (!html) return null
  const safePool = Array.isArray(relatedPool) ? relatedPool : []
  const blocks = []
  const re = /(<(?:p|h[2-6]|ul|ol|blockquote|pre|table)[^>]*>[\s\S]*?<\/(?:p|h[2-6]|ul|ol|blockquote|pre|table)>)/gi
  let last = 0, m
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) blocks.push(html.slice(last, m.index))
    blocks.push(m[0])
    last = re.lastIndex
  }
  if (last < html.length) blocks.push(html.slice(last))

  const INTERVAL = 4
  const result = []
  let paraCount = 0
  let cardIdx = 0
  const usedIds = new Set()

  blocks.forEach((block, i) => {
    result.push(<div key={`b${i}`} className="md-body" dangerouslySetInnerHTML={{ __html: block }} />)
    if (/^<(?:p|h[2-6]|ul|ol)/i.test(block.trim())) paraCount++
    if (paraCount > 0 && paraCount % INTERVAL === 0 && cardIdx < safePool.length) {
      const card = safePool[cardIdx]
      if (card && !usedIds.has(card.id)) {
        usedIds.add(card.id)
        result.push(<InlineRelatedCard key={`rc${cardIdx}`} post={card} />)
        cardIdx++
      }
    }
  })
  return <>{result}</>
}

// ── 하단 "이런 것도 궁금하지 않으세요?" 블록
function CuriosityBlock({ post, allPosts, inlineUsedIds }) {
  if (!post || !Array.isArray(allPosts)) return null
  const safeUsedIds = inlineUsedIds instanceof Set ? inlineUsedIds : new Set()
  const pool = scoreRelated(post, allPosts).filter(p => !safeUsedIds.has(p.id)).slice(0, 4)
  if (pool.length === 0) return null
  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: '2px solid var(--border)' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>🤔 이런 것도 궁금하지 않으세요?</div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>비슷한 주제의 글을 더 읽어보세요</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {pool.map(p => (
          <Link key={p.id} href={`/blog/${p.slug || p.id}`}
            style={{ textAlign: 'left', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
            {p.category && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px', alignSelf: 'flex-start' }}>{categoryLabel(p.category)}</span>}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45 }}>{p.title}</div>
            {p.summary && <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.summary}</div>}
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>읽어보기 →</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── 도구 사용 유도 하단 박스 (출석부 식 "회원가입 유도"를 우리 결 = "도구 무료 사용"으로 변경)
function ToolCTABlock({ post }) {
  const href = TOOL_HREF[post?.category] || '/'
  const label = categoryLabel(post?.category) || '도구'
  return (
    <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 22 }}>🚀</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{label} 바로 써보기</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, flex: 1 }}>가입 없이 무료로 바로 사용할 수 있어요</div>
        <Link href={href} style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
          무료로 사용하기 →
        </Link>
      </div>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 22 }}>🧰</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>다른 도구도 둘러보기</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, flex: 1 }}>썸네일, 효과음, 타이머 등 모든 도구를 무료로 사용하세요</div>
        <Link href="/" style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
          전체 도구 보기 →
        </Link>
      </div>
    </div>
  )
}

export default function BlogPost() {
  const [post, setPost] = useState(null)
  const [allPosts, setAllPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('ko')
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const slug = window.location.pathname.split('/blog/')[1]
    if (!slug) return
    fetch(`/api/blog/posts?slug=${slug}`)
      .then(r => r.json())
      .then(data => { setPost(data); setLoading(false) })
      .catch(() => setLoading(false))
    // 내부링크 추천용 전체 글 목록 (최대 100개)
    fetch('/api/blog/posts?limit=100')
      .then(r => r.json())
      .then(data => setAllPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setSettingsLoaded(true))
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const adLabel = lang === 'en' ? 'Ad' : '광고'

  if (loading) return (
    <div className="light-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
      불러오는 중...
    </div>
  )

  if (!post || post.error) return (
    <div className="light-theme" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 36 }}>📭</div>
      <p style={{ color: 'var(--text2)' }}>글을 찾을 수 없습니다</p>
      <Link href="/blog" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>← 블로그 목록</Link>
    </div>
  )

  return (
    <div className="light-theme">
      <Head>
        <title>{post.title} - Blog</title>
        <meta name="description" content={post.summary || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.summary || ''} />
        {post.cover_image && <meta property="og:image" content={post.cover_image} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Blog" siteHref="/blog" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={adLabel} />
        </div>
      )}

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 760 }}>
        <Link href="/blog" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          ← 목록으로
        </Link>

        {post.cover_image && (
          <img src={post.cover_image} alt={post.title}
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 28, display: 'block' }} referrerPolicy="no-referrer" />
        )}

        {post.category && (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--text2)', marginBottom: 14, display: 'inline-block' }}>
            {categoryLabel(post.category)}
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
        {settingsLoaded && adsOn && (
          <div style={{ marginBottom: 28 }}>
            <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={3} label={adLabel} />
          </div>
        )}

        {(() => {
          const bodyHtml = parseMd(post.content)
          const relatedPool = scoreRelated(post, allPosts).slice(0, 3)
          const inlineUsedIds = new Set(relatedPool.map(p => p.id))
          return (
            <>
              <ContentWithInlineLinks html={bodyHtml} relatedPool={relatedPool} />

              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--text3)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 🤔 이런 것도 궁금하지 않으세요? — 본문 중간 카드에 안 쓰인 글 최대 4개 */}
              <CuriosityBlock post={post} allPosts={allPosts} inlineUsedIds={inlineUsedIds} />

              {/* 이 글의 도구 바로 써보기 + 전체 도구 둘러보기 */}
              <ToolCTABlock post={post} />
            </>
          )
        })()}
      </div>

      <Footer lang={lang} siteName="Unified Tools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </div>
  )
}
