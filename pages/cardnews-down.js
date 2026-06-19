import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'

const I18N = {
  ko: {
    metaTitle: '카드뉴스 변환기 - HTML을 PNG + 영상으로 자동 변환',
    metaDesc: 'Claude가 만들어준 카드뉴스 HTML을 PNG 7장과 TTS 음성, 영상으로 자동 변환하세요.',
    iframeTitle: '카드뉴스 변환기',
    adLabel: '광고',
  },
  en: {
    metaTitle: 'Card News Converter - Auto Convert HTML to PNG + Video',
    metaDesc: 'Automatically convert your card news HTML into 7 PNG slides, TTS audio, and video.',
    iframeTitle: 'Card News Converter',
    adLabel: 'Ad',
  },
}

export default function CardnewsDown() {
  const adsOn = true
  const iframeRef = useRef(null)
  const [iframeHeight, setIframeHeight] = useState(2600)
  const [lang, setLang] = useState('ko')

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]

  useEffect(() => {
    let debounceTimer = null;
    function handleMessage(e) {
      if (!e.data || e.data.type !== 'cardnews-height') return
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      const h = Number(e.data.height)
      if (!h || Number.isNaN(h)) return
      const newHeight = Math.max(2600, h + 24)
      // 300ms 디바운스 — 안정된 값이 들어올 때만 반영
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setIframeHeight(newHeight)
      }, 300)
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(debounceTimer)
    }
  }, [])

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

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {adsOn && (
          <aside className="sidebar">
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} label={t.adLabel} />
          </aside>
        )}

        <main className="main-content" style={{ maxWidth: 760, width: '100%' }}>
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

        {adsOn && (
          <aside className="sidebar">
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} label={t.adLabel} />
          </aside>
        )}
      </div>

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} label={t.adLabel} />
        </div>
      )}

      <Footer lang={lang} siteName="CardNews-Down" adsOn={adsOn} />
    </>
  )
}
