import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'
import { findAdSlot } from '../lib/adSlots'

const I18N = {
  ko: {
    metaTitle: '카드뉴스 변환기 - HTML을 PNG + 영상으로 자동 변환',
    metaDesc: 'Claude가 만들어준 카드뉴스 HTML을 PNG 7장과 TTS 음성, 영상으로 자동 변환하세요.',
    iframeTitle: '카드뉴스 변환기',
    cooldownTitle: '변환 준비 중', cooldownSub: '아래 광고를 잠시 봐주세요 :)',
    adLabel: '광고',
  },
  en: {
    metaTitle: 'Card News Converter - Auto Convert HTML to PNG + Video',
    metaDesc: 'Automatically convert your card news HTML into 7 PNG slides, TTS audio, and video.',
    iframeTitle: 'Card News Converter',
    cooldownTitle: 'Getting ready...', cooldownSub: 'Please view the ad below while you wait :)',
    adLabel: 'Ad',
  },
}

export default function CardnewsDown() {
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const iframeRef = useRef(null)
  const [iframeHeight, setIframeHeight] = useState(2600)
  const [lang, setLang] = useState('ko')
  const [cooldown, setCooldown] = useState(0)
  const [maxCooldown, setMaxCooldown] = useState(12)
  const [showCooldownAd, setShowCooldownAd] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)

    // 페이지 진입 시 쿨다운 (iframe 변환 도구이므로 진입 시 1회)
    const end = localStorage.getItem('cdn_cooldown_end')
    if (end) {
      const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
      if (rem > 0) { setCooldown(rem); setShowCooldownAd(true) }
    } else {
      // 첫 진입 시 쿨다운 자동 시작
      const dur = maxCooldown
      setCooldown(dur)
      setShowCooldownAd(true)
      localStorage.setItem('cdn_cooldown_end', (Date.now() + dur * 1000).toString())
    }

    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.cooldown) setMaxCooldown(d.cooldown)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setSettingsLoaded(true))
  }, [])

  useEffect(() => {
    if (cooldown <= 0) { setShowCooldownAd(false); return }
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]

  useEffect(() => {
    function handleGa4Message(e) {
      if (!e.data || e.data.type !== 'ga4-event') return
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', e.data.event, e.data.params || {})
      }
    }
    window.addEventListener('message', handleGa4Message)
    return () => window.removeEventListener('message', handleGa4Message)
  }, [])

  useEffect(() => {
    let debounceTimer = null
    function handleMessage(e) {
      if (!e.data || e.data.type !== 'cardnews-height') return
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      const h = Number(e.data.height)
      if (!h || Number.isNaN(h)) return
      const newHeight = Math.max(2600, h + 24)
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => setIframeHeight(newHeight), 300)
    }
    window.addEventListener('message', handleMessage)
    return () => { window.removeEventListener('message', handleMessage); clearTimeout(debounceTimer) }
  }, [])

  const cooldownPct = maxCooldown > 0 ? cooldown / maxCooldown : 0
  const circumference = 2 * Math.PI * 24

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

      <Header lang={lang} onToggleLang={toggleLang} siteName="CardNews-Down" siteHref="/" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {settingsLoaded && adsOn && (
          <aside className="sidebar">
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} slotData={findAdSlot(adSlots, 'home_left')} number={2} label={t.adLabel} />
          </aside>
        )}

        <main className="main-content" style={{ maxWidth: 760, width: '100%' }}>

          {showCooldownAd && cooldown > 0 && (
            <div className="cooldown-block" style={{ marginBottom: 16 }}>
              <div className="cooldown-top">
                <div className="ring-wrap">
                  <svg className="ring-svg" viewBox="0 0 56 56">
                    <circle className="ring-bg" cx="28" cy="28" r="24" />
                    <circle className="ring-progress" cx="28" cy="28" r="24"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - cooldownPct)} />
                  </svg>
                  <span className="ring-num">{cooldown}</span>
                </div>
                <div className="cooldown-text">
                  <strong>{t.cooldownTitle}</strong>
                  <p>{t.cooldownSub}</p>
                </div>
              </div>
              {settingsLoaded && adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_COOLDOWN || '2222222222'} slotData={findAdSlot(adSlots, 'home_cooldown')} tall number={4} label={t.adLabel} />}
            </div>
          )}

          <iframe
            ref={iframeRef}
            src="/cardnews-down/index.html"
            title={t.iframeTitle}
            style={{
              width: '100%',
              height: iframeHeight + 'px',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: '#0f0f0f',
            }}
          />
        </main>

        {settingsLoaded && adsOn && (
          <aside className="sidebar">
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} slotData={findAdSlot(adSlots, 'home_right')} number={3} label={t.adLabel} />
          </aside>
        )}
      </div>

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={5} label={t.adLabel} />
        </div>
      )}

      <Footer lang={lang} siteName="CardNews-Down" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </>
  )
}
