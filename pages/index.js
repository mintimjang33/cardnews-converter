import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'
import { findAdSlot } from '../lib/adSlots'

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

const I18N = {
  ko: {
    metaTitle: 'DownTools - 무료 온라인 도구 모음',
    metaDesc: 'YouTube 썸네일 다운로드, CC0 효과음, 타이머 등 무료 온라인 도구를 한 곳에서',
    badge: '무료 · 빠름 · 간편',
    heroTitle: '모든 온라인 도구를',
    heroHighlight: '한 곳에서',
    heroSub: 'YouTube 썸네일, 효과음, 타이머 등 유용한 무료 도구 모음',
    coming: '준비중',
    adLabel: '광고',
  },
  en: {
    metaTitle: 'DownTools - Free Online Tools Collection',
    metaDesc: 'YouTube thumbnail downloader, CC0 sound effects, timer and more — all free online tools in one place',
    badge: 'Free · Fast · Easy',
    heroTitle: 'All Online Tools',
    heroHighlight: 'In One Place',
    heroSub: 'YouTube thumbnails, sound effects, timers and more — free tools collection',
    coming: 'Coming Soon',
    adLabel: 'Ad',
  },
}

export default function Home() {
  const [lang, setLang] = useState('ko')
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

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

  const t = I18N[lang]

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="DownTools" siteHref="/" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {settingsLoaded && adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} slotData={findAdSlot(adSlots, 'home_left')} number={2} label={t.adLabel} /></aside>}

        <main className="main-content" style={{ padding: '0 20px' }}>
          {/* 히어로 */}
          <section className="hero">
            <div className="hero-badge">{t.badge}</div>
            <h1 className="hero-title">{t.heroTitle}<br /><span className="highlight">{t.heroHighlight}</span></h1>
            <p className="hero-sub">{t.heroSub}</p>
          </section>

          {/* 툴 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
            {TOOLS.map(tool => (
              <Link key={tool.href} href={tool.coming ? '#' : tool.href}
                style={{ textDecoration: 'none', pointerEvents: tool.coming ? 'none' : 'auto' }}>
                <div style={{
                  background: 'var(--surface)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: 24,
                  transition: 'all 0.2s', cursor: tool.coming ? 'default' : 'pointer',
                  opacity: tool.coming ? 0.5 : 1,
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
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--surface3)', color: 'var(--text3)' }}>{t.coming}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tool.desc[lang]}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>

        {settingsLoaded && adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} slotData={findAdSlot(adSlots, 'home_right')} number={3} label={t.adLabel} /></aside>}
      </div>

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={5} label={t.adLabel} />
        </div>
      )}

      <Footer lang={lang} siteName="DownTools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </>
  )
}
