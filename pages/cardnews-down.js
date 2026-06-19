import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'

export default function CardnewsDown() {
  const adsOn = true
  const iframeRef = useRef(null)
  const [iframeHeight, setIframeHeight] = useState(2600)

  useEffect(() => {
    function handleMessage(e) {
      if (!e.data || e.data.type !== 'cardnews-height') return
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      const h = Number(e.data.height)
      if (!h || Number.isNaN(h)) return
      const newHeight = Math.max(2600, h + 24)
      // 높이가 늘어날 때만 반응 — 절대 줄이지 않음으로써 루프 차단
      setIframeHeight(prev => newHeight > prev ? newHeight : prev)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <>
      <Head>
        <title>카드뉴스 변환기 - HTML을 PNG + 영상으로 자동 변환</title>
        <meta name="description" content="Claude가 만들어준 카드뉴스 HTML을 PNG 7장과 TTS 음성, 영상으로 자동 변환하세요." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header siteName="Unified Tools" siteHref="/" />

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} label="광고" />
        </div>
      )}

      <div className="page-layout">
        {adsOn && (
          <aside className="sidebar">
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} label="광고" />
          </aside>
        )}

        <main className="main-content" style={{ maxWidth: 760, width: '100%' }}>
          <iframe
            ref={iframeRef}
            src="/cardnews-down/index.html"
            title="카드뉴스 변환기"
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
            <SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} label="광고" />
          </aside>
        )}
      </div>

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} label="광고" />
        </div>
      )}

      <Footer siteName="Unified Tools" />
    </>
  )
}
