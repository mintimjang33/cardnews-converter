import { useState, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'

const LANGS = {
  ko: {
    metaTitle: 'Thumb-Down - YouTube 썸네일 무료 다운로드',
    metaDesc: '유튜브 영상 URL만 입력하면 HD, HQ, SD 등 모든 해상도의 썸네일을 무료로 즉시 다운로드하세요.',
    badge: '무료 · 빠름 · 간편',
    heroTitle1: 'YouTube 썸네일을',
    heroTitle2: '바로 다운로드',
    heroSub: '유튜브 URL을 붙여넣으면 모든 해상도의 썸네일을 무료로 받을 수 있어요.',
    placeholder: '유튜브 URL을 여기에 붙여넣으세요...',
    btnGet: '썸네일 가져오기',
    btnLoading: '불러오는 중...',
    btnWait: (n) => `${n}초 후 사용 가능`,
    errorInvalid: '올바른 유튜브 URL을 입력해주세요.',
    cooldownTitle: '다음 검색 대기 중',
    cooldownSub: '아래 광고를 잠시 봐주세요 :)',
    adLabel: '광고',
    resultsTitle: '다운로드할 해상도를 선택하세요',
    dlBtn: '다운로드',
    qualities: { maxres: 'HD · 1280×720', sd: 'SD · 640×480', hq: 'HQ · 480×360', mq: 'MQ · 320×180' },
    notAvail: '이 해상도는 없는 영상도 있어요',
    howTitle: '사용 방법',
    how1: '유튜브 영상에서 URL 복사',
    how2: '위 입력창에 URL 붙여넣기',
    how3: '원하는 해상도 선택 후 다운로드',
  },
  en: {
    metaTitle: 'Thumb-Down - Free YouTube Thumbnail Downloader',
    metaDesc: 'Download YouTube thumbnails in HD, HQ, SD and all qualities for free. Just paste the video URL.',
    badge: 'Free · Fast · Easy',
    heroTitle1: 'Download YouTube',
    heroTitle2: 'Thumbnails Instantly',
    heroSub: 'Paste any YouTube URL and get all thumbnail qualities for free.',
    placeholder: 'Paste YouTube URL here...',
    btnGet: 'Get Thumbnails',
    btnLoading: 'Loading...',
    btnWait: (n) => `Wait ${n}s`,
    errorInvalid: 'Please enter a valid YouTube URL.',
    cooldownTitle: 'Getting next thumbnails ready...',
    cooldownSub: 'Please view the ad below while you wait.',
    adLabel: 'Advertisement',
    resultsTitle: 'Choose a resolution to download',
    dlBtn: 'Download',
    qualities: { maxres: 'HD · 1280×720', sd: 'SD · 640×480', hq: 'HQ · 480×360', mq: 'MQ · 320×180' },
    notAvail: 'Not available for all videos',
    howTitle: 'How to Use',
    how1: 'Copy the URL from any YouTube video',
    how2: 'Paste it into the input box above',
    how3: 'Choose your preferred quality and download',
  },
}

function extractVideoId(url) {
  const str = url.trim()
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = str.match(p)
    if (m) return m[1]
  }
  return null
}

function getThumbs(videoId) {
  const base = `https://img.youtube.com/vi/${videoId}`
  return [
    { key: 'maxres', url: `${base}/maxresdefault.jpg` },
    { key: 'sd',     url: `${base}/sddefault.jpg` },
    { key: 'hq',     url: `${base}/hqdefault.jpg` },
    { key: 'mq',     url: `${base}/mqdefault.jpg` },
  ]
}

export default function ThumbDown() {
  const [lang, setLang] = useState('ko')
  const [url, setUrl] = useState('')
  const [thumbs, setThumbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [maxCooldown, setMaxCooldown] = useState(12)
  const [showCooldownAd, setShowCooldownAd] = useState(false)
  const [adsOn, setAdsOn] = useState(true)

  const t = LANGS[lang]

  useEffect(() => {
    const savedLang = localStorage.getItem('td_lang')
    if (savedLang && LANGS[savedLang]) setLang(savedLang)
    const end = localStorage.getItem('td_cooldown_end')
    if (end) {
      const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
      if (rem > 0) { setCooldown(rem); setShowCooldownAd(true) }
    }
    fetch('/api/settings/get')
      .then(r => r.json())
      .then(data => {
        if (data.cooldown) setMaxCooldown(data.cooldown)
        if (data.adsOn !== undefined) setAdsOn(data.adsOn)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (cooldown <= 0) { setShowCooldownAd(false); return }
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('td_lang', next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cooldown > 0 || loading) return
    setError('')
    const id = extractVideoId(url)
    if (!id) { setError(t.errorInvalid); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    setThumbs(getThumbs(id))
    setLoading(false)
    const dur = maxCooldown
    setCooldown(dur)
    setShowCooldownAd(true)
    localStorage.setItem('td_cooldown_end', (Date.now() + dur * 1000).toString())
  }

  const handleDownload = async (thumbUrl, key) => {
    try {
      const res = await fetch(`/api/tools/thumb-download?url=${encodeURIComponent(thumbUrl)}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `youtube_thumbnail_${key}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(thumbUrl, '_blank')
    }
  }

  const cooldownPct = maxCooldown > 0 ? cooldown / maxCooldown : 0
  const circumference = 2 * Math.PI * 24

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={t.metaTitle} />
        <meta property="og:description" content={t.metaDesc} />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Thumb-Down" siteHref="/" />

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} label={t.adLabel} /></aside>}

        <main className="main-content">
          <section className="hero">
            <div className="hero-badge">{t.badge}</div>
            <h1 className="hero-title">{t.heroTitle1} <span className="highlight">{t.heroTitle2}</span></h1>
            <p className="hero-sub">{t.heroSub}</p>
          </section>

          <form onSubmit={handleSubmit}>
            <div className="search-box">
              <input type="text" className="search-input" placeholder={t.placeholder}
                value={url} onChange={e => setUrl(e.target.value)}
                disabled={loading || cooldown > 0} />
              <button type="submit"
                className={`search-btn${cooldown > 0 ? ' waiting' : ''}`}
                disabled={loading || cooldown > 0}>
                {loading ? t.btnLoading : cooldown > 0 ? t.btnWait(cooldown) : t.btnGet}
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>

          {showCooldownAd && cooldown > 0 && (
            <div className="cooldown-block">
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
              {adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_COOLDOWN || '2222222222'} format="rectangle" tall label={t.adLabel} />}
            </div>
          )}

          {thumbs.length > 0 && (
            <section className="results-section">
              <h2 className="results-title">{t.resultsTitle}</h2>
              <div className="thumb-grid">
                {thumbs.map(thumb => (
                  <div key={thumb.key} className="thumb-card">
                    <div className="thumb-img-wrap">
                      <img src={thumb.url} alt={t.qualities[thumb.key]} className="thumb-img"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      <div className="thumb-na"><span>🚫</span><span style={{ fontSize: 12 }}>{t.notAvail}</span></div>
                    </div>
                    <div className="thumb-footer">
                      <span className="quality-badge">{t.qualities[thumb.key]}</span>
                      <button className="dl-btn" onClick={() => handleDownload(thumb.url, thumb.key)}>↓ {t.dlBtn}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {thumbs.length > 0 && adsOn && (
            <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} label={t.adLabel} />
          )}

          <section className="how-section">
            <h2 className="section-title">{t.howTitle}</h2>
            <div className="steps">
              {[t.how1, t.how2, t.how3].map((text, i) => (
                <div key={i} className="step">
                  <div className="step-num">{i + 1}</div>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} label={t.adLabel} /></aside>}
      </div>

      <Footer lang={lang} adsOn={adsOn} siteName="Thumb-Down" />
    </>
  )
}
