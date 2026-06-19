import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot } from '../components/AdSlot'

const TOOLS = [
  {
    href: '/cardnews-down',
    icon: '📰',
    name: '카드뉴스 변환기',
    desc: { ko: 'HTML 카드뉴스를 PNG 7장 + 영상으로 자동 변환', en: 'Convert HTML card news into PNG slides + video' },
    color: '#FF4B6E',
  },
  {
    href: '/thumb-down',
    icon: '🖼',
    name: 'Thumb-Down',
    desc: { ko: 'YouTube 썸네일 무료 다운로드', en: 'Free YouTube Thumbnail Downloader' },
    color: '#e63946',
  },
  {
    href: '/sound-down',
    icon: '🔊',
    name: 'Sound-Down',
    desc: { ko: '무료 CC0 효과음 다운로드', en: 'Free CC0 Sound Effects' },
    color: '#00d4aa',
  },
  // 나머지 사이트 추가 예정
  { href: '/clock-down',  icon: '⏱', name: 'Clock-Down',  desc: { ko: '알람·타이머·스탑워치·포모도로', en: 'Alarm · Timer · Stopwatch · Pomodoro' }, color: '#f97316' },
  { href: '/voice-down',  icon: '🎤', name: 'Voice-Down',  desc: { ko: '음성 타이핑 / 텍스트 변환', en: 'Voice Typing & Speech to Text' }, color: '#8b5cf6' },
  { href: '/text-down',   icon: '📝', name: 'Text-Down',   desc: { ko: '글자수 세기 · 공백 정리 · 텍스트 변환', en: 'Word Counter & Text Tools' }, color: '#3b82f6' },
]

export default function Home() {
  return (
    <>
      <Head>
        <title>DownTools - 무료 온라인 도구 모음</title>
        <meta name="description" content="YouTube 썸네일 다운로드, CC0 효과음, 타이머 등 무료 온라인 도구를 한 곳에서" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header siteName="DownTools" siteHref="/" />

      <div className="wrap">
        {/* 상단 광고 */}
        <div style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} label="광고" />
        </div>

        {/* 히어로 */}
        <section className="hero">
          <div className="hero-badge">무료 · 빠름 · 간편</div>
          <h1 className="hero-title">모든 온라인 도구를<br /><span className="highlight">한 곳에서</span></h1>
          <p className="hero-sub">YouTube 썸네일, 효과음, 타이머 등 유용한 무료 도구 모음</p>
        </section>

        {/* 툴 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 48 }}>
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.coming ? '#' : tool.href}
              style={{ textDecoration: 'none', pointerEvents: tool.coming ? 'none' : 'auto' }}>
              <div style={{
                background: 'var(--surface)', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius)', padding: 24,
                transition: 'all 0.2s', cursor: tool.coming ? 'default' : 'pointer',
                opacity: tool.coming ? 0.5 : 1,
                ':hover': { borderColor: tool.color }
              }}
                onMouseEnter={e => { if (!tool.coming) e.currentTarget.style.borderColor = tool.color }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${tool.color}22`, border: `1.5px solid ${tool.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 14,
                }}>
                  {tool.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tool.name}</span>
                  {tool.coming && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--surface3)', color: 'var(--text3)' }}>준비중</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tool.desc.ko}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* 하단 광고 */}
        <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} label="광고" />
      </div>

      <Footer siteName="DownTools" />
    </>
  )
}
