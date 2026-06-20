import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'
import { findAdSlot } from '../lib/adSlots'

const LANGS = {
  ko: {
    metaTitle: 'Sound-Down - 무료 효과음 다운로드 | CC0 저작권 무료',
    metaDesc: '동물소리, 유튜브 효과음, 자연의 소리, 밈 사운드 등 CC0 무료 효과음을 검색·미리듣기·다운로드하세요.',
    badge: '무료 · CC0 · 저작권 걱정 없음',
    heroTitle1: '저작권 걱정 없는',
    heroTitle2: '무료 효과음',
    heroSub: '동물소리·유튜브 효과음·밈사운드·자연의 소리 등 모든 CC0 무료 효과음을 한 곳에서!',
    searchPlaceholder: '효과음 검색... (예: 강아지, 알림음, 빗소리)',
    searchBtn: '검색', searching: '검색 중...', waitBtn: (n) => `${n}초 대기`,
    allCat: '전체', resultsLabel: (n) => `검색 결과 ${n}개`,
    play: '재생', pause: '정지', download: '다운로드', license: 'CC0 무료',
    cooldownTitle: '다운로드 준비 중...', cooldownSub: '아래 광고를 잠시 봐주세요 :)',
    adLabel: '광고',
    howTitle: '사용 방법',
    how1: '원하는 효과음 검색 또는 카테고리 선택',
    how2: '재생 버튼으로 미리듣기',
    how3: '다운로드 버튼 클릭 → 무료 저장',
    noResult: '검색 결과가 없어요. 다른 키워드로 검색해보세요!',
  },
  en: {
    metaTitle: 'Sound-Down - Free Sound Effects Download | CC0 Royalty Free',
    metaDesc: 'Download free CC0 sound effects: animal sounds, YouTube effects, nature sounds, meme sounds. No copyright worries!',
    badge: 'Free · CC0 · Royalty Free',
    heroTitle1: 'Royalty-Free',
    heroTitle2: 'Sound Effects',
    heroSub: 'Animal sounds, YouTube effects, meme sounds, nature & more — all CC0 free in one place!',
    searchPlaceholder: 'Search sounds... (e.g. dog, notification, rain)',
    searchBtn: 'Search', searching: 'Searching...', waitBtn: (n) => `Wait ${n}s`,
    allCat: 'All', resultsLabel: (n) => `${n} results found`,
    play: 'Play', pause: 'Pause', download: 'Download', license: 'CC0 Free',
    cooldownTitle: 'Preparing download...', cooldownSub: 'Please view the ad below while you wait.',
    adLabel: 'Advertisement',
    howTitle: 'How to Use',
    how1: 'Search or pick a category',
    how2: 'Preview with the play button',
    how3: 'Click download — free to save!',
    noResult: 'No results found. Try a different keyword!',
  },
}

const CATEGORIES = {
  ko: [
    { id: 'all', icon: '🎵', label: '전체' },
    { id: 'animal', icon: '🐾', label: '동물' },
    { id: 'youtube', icon: '💥', label: '유튜브 효과음' },
    { id: 'nature', icon: '🌿', label: '자연의 소리' },
    { id: 'meme', icon: '😂', label: '밈 사운드' },
    { id: 'game', icon: '🎮', label: '게임 효과음' },
    { id: 'ui', icon: '🔔', label: 'UI/앱' },
    { id: 'space', icon: '🚀', label: '우주/특수' },
    { id: 'asmr', icon: '😴', label: 'ASMR' },
  ],
  en: [
    { id: 'all', icon: '🎵', label: 'All' },
    { id: 'animal', icon: '🐾', label: 'Animals' },
    { id: 'youtube', icon: '💥', label: 'YouTube SFX' },
    { id: 'nature', icon: '🌿', label: 'Nature' },
    { id: 'meme', icon: '😂', label: 'Meme Sounds' },
    { id: 'game', icon: '🎮', label: 'Game SFX' },
    { id: 'ui', icon: '🔔', label: 'UI/App' },
    { id: 'space', icon: '🚀', label: 'Space/Sci-Fi' },
    { id: 'asmr', icon: '😴', label: 'ASMR' },
  ],
}

const CAT_QUERY = {
  animal:  { ko: '동물 울음소리', en: 'animal sound' },
  youtube: { ko: '알림음 효과음', en: 'notification alert sound effect' },
  nature:  { ko: '자연 빗소리',   en: 'nature rain wind' },
  meme:    { ko: '밈 재미있는',   en: 'meme funny sound effect' },
  game:    { ko: '게임 효과음',   en: 'game sound effect' },
  ui:      { ko: 'UI 클릭 버튼',  en: 'ui click button interface' },
  space:   { ko: '우주 SF',       en: 'space sci-fi cosmic' },
  asmr:    { ko: 'ASMR 백색소음', en: 'asmr white noise relaxing' },
}

function Waveform({ playing }) {
  const heights = [8,14,20,28,36,28,40,28,36,20,28,14,8,14,20]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 40, flexShrink: 0 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 3, height: `${h}px`, borderRadius: 2,
          background: playing ? 'var(--accent)' : 'var(--surface3)',
          transition: 'height 0.3s',
          animation: playing ? `wave 0.8s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.06}s`,
        }} />
      ))}
      <style>{`@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
    </div>
  )
}

export default function SoundDown() {
  const [lang, setLang] = useState('ko')
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const [maxCooldown, setMaxCooldown] = useState(12)
  const [showCooldownAd, setShowCooldownAd] = useState(false)
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const audioRef = useRef(null)

  const t = LANGS[lang]
  const cats = CATEGORIES[lang]

  useEffect(() => {
    const savedLang = localStorage.getItem('sd_lang')
    if (savedLang && LANGS[savedLang]) setLang(savedLang)
    const end = localStorage.getItem('sd_cooldown_end')
    if (end) {
      const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
      if (rem > 0) { setCooldown(rem); setShowCooldownAd(true) }
    }
    fetch('/api/settings/get')
      .then(r => r.json())
      .then(data => {
        if (data.cooldown) setMaxCooldown(data.cooldown)
        if (data.adsOn !== undefined) setAdsOn(data.adsOn)
        if (data.adSlots !== undefined) setAdSlots(data.adSlots)
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
    localStorage.setItem('sd_lang', next)
  }

  const doSearch = async (q, cat = activeCat) => {
    const searchQuery = q.trim() || (cat !== 'all' ? CAT_QUERY[cat]?.[lang] : '') || (lang === 'ko' ? '효과음' : 'sound effect')
    setLoading(true); setSearched(true); setSounds([])
    try {
      const res = await fetch(`/api/tools/sound-search?q=${encodeURIComponent(searchQuery)}&lang=${lang}`)
      const data = await res.json()
      setSounds(data.sounds || [])
    } catch { setSounds([]) }
    setLoading(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading) return
    setActiveCat('all')
    doSearch(query, 'all')
  }

  const handleCat = (catId) => {
    setActiveCat(catId)
    setQuery('')
    if (catId === 'all') { setSounds([]); setSearched(false); return }
    doSearch('', catId)
  }

  const handlePlay = (sound) => {
    if (playingId === sound.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(sound.preview)
    audio.play().catch(() => {})
    audio.onended = () => setPlayingId(null)
    audioRef.current = audio
    setPlayingId(sound.id)
  }

  const handleDownload = async (sound) => {
    const dur = maxCooldown
    setCooldown(dur); setShowCooldownAd(true)
    localStorage.setItem('sd_cooldown_end', (Date.now() + dur * 1000).toString())
    try {
      const res = await fetch(`/api/tools/sound-download?url=${encodeURIComponent(sound.download)}&name=${encodeURIComponent(sound.name)}`)
      if (!res.ok) throw new Error()
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        window.open(json.directUrl || sound.download, '_blank')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${sound.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.mp3`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { window.open(sound.download, '_blank') }
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

      <Header lang={lang} onToggleLang={toggleLang} siteName="Sound-Down" siteHref="/" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {settingsLoaded && adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} slotData={findAdSlot(adSlots, 'home_left')} number={2} label={t.adLabel} /></aside>}

        <main className="main-content">
          <section className="hero">
            <div className="hero-badge">{t.badge}</div>
            <h1 className="hero-title">{t.heroTitle1} <span className="highlight">{t.heroTitle2}</span></h1>
            <p className="hero-sub">{t.heroSub}</p>
          </section>

          {/* 카테고리 */}
          <div className="cat-chips" style={{ marginTop: 24 }}>
            {cats.map(cat => (
              <button key={cat.id} className={`cat-chip${activeCat === cat.id ? ' active' : ''}`}
                onClick={() => handleCat(cat.id)}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <form onSubmit={handleSubmit}>
            <div className="search-box">
              <input type="text" className="search-input" placeholder={t.searchPlaceholder}
                value={query} onChange={e => setQuery(e.target.value)} disabled={loading} />
              <button type="submit" className="search-btn" disabled={loading}>
                {loading ? t.searching : t.searchBtn}
              </button>
            </div>
          </form>

          {/* 쿨다운 */}
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
              {settingsLoaded && adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_COOLDOWN || '2222222222'} slotData={findAdSlot(adSlots, 'home_cooldown')} tall number={4} label={t.adLabel} />}
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>검색 중...</div>
          )}

          {/* 결과 */}
          {!loading && sounds.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <h2 className="results-title">{t.resultsLabel(sounds.length)}</h2>
              <div className="sound-list">
                {sounds.map(sound => (
                  <div key={sound.id} className="sound-card">
                    <button className={`play-btn${playingId === sound.id ? ' playing' : ''}`}
                      onClick={() => handlePlay(sound)}>
                      {playingId === sound.id ? '⏸' : '▶'}
                    </button>
                    <div className="sound-info">
                      <div className="sound-name">{sound.name}</div>
                      <div className="sound-meta">
                        <span style={{ marginRight: 8, fontSize: 11, color: 'var(--text2)' }}>{sound.category}</span>
                        <span style={{ marginRight: 8, fontSize: 11, color: 'var(--text3)' }}>{sound.duration}s</span>
                        <span style={{ fontSize: 11, color: 'var(--accent2)' }}>{t.license}</span>
                      </div>
                    </div>
                    <Waveform playing={playingId === sound.id} />
                    <button className="sound-dl-btn" onClick={() => handleDownload(sound)}>
                      ↓ {t.download}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && searched && sounds.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔇</div>
              <p>{t.noResult}</p>
            </div>
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

        {settingsLoaded && adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} slotData={findAdSlot(adSlots, 'home_right')} number={3} label={t.adLabel} /></aside>}
      </div>

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={5} label={t.adLabel} />
        </div>
      )}

      <Footer lang={lang} adsOn={adsOn} siteName="Sound-Down" slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </>
  )
}
