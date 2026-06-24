import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'
import { findAdSlot } from '../lib/adSlots'

const VOICE_LANGS = [
  { code: 'ko-KR', flag: '🇰🇷', label: '한국어' },
  { code: 'en-US', flag: '🇺🇸', label: 'English' },
  { code: 'ja-JP', flag: '🇯🇵', label: '日本語' },
  { code: 'zh-CN', flag: '🇨🇳', label: '中文' },
  { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
  { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
]

const I18N = {
  ko: {
    metaTitle: 'Voice-Down - 무료 음성 타이핑 | 클릭 한 번으로 말하기',
    metaDesc: '클릭 한 번으로 말하면 자동으로 텍스트 변환! 한국어·영어·일본어·중국어 지원. 무료 음성 인식 타이핑 도구.',
    badge: '무료 · 클릭 한 번 · 음성 타이핑',
    heroTitle: '클릭 한 번으로', heroHighlight: '음성 타이핑',
    heroSub: '말하면 자동으로 텍스트 변환! 키보드 없이 편하게 타이핑하세요.',
    noSupport: '❌ 이 브라우저는 음성인식을 지원하지 않습니다. 크롬(Chrome) 또는 엣지(Edge)를 사용해주세요.',
    statusIdle: '대기 중', statusListening: '🔴 듣는 중...',
    btnStop: '클릭해서 중지', btnStart: '클릭해서 말하기',
    labelRecognized: '인식된 텍스트', labelShortcut: '단축키: 스페이스바',
    placeholder: '여기에 음성이 텍스트로 변환됩니다...',
    btnClear: '지우기', btnCopy: '복사', btnCopied: '복사됨 ✓',
    howTitle: '사용 방법',
    steps: ['인식 언어 선택', '버튼 클릭 후 말하기', '변환된 텍스트 복사·붙여넣기'],
    cooldownTitle: '잠시 대기 중', cooldownSub: '아래 광고를 잠시 봐주세요 :)',
    adLabel: '광고',
  },
  en: {
    metaTitle: 'Voice-Down - Free Voice Typing | Speak with One Click',
    metaDesc: 'Speak and convert to text instantly with one click! Supports Korean, English, Japanese, Chinese. Free speech recognition typing tool.',
    badge: 'Free · One Click · Voice Typing',
    heroTitle: 'Voice Typing', heroHighlight: 'With One Click',
    heroSub: 'Speak and auto-convert to text! Type comfortably without a keyboard.',
    noSupport: '❌ This browser does not support speech recognition. Please use Chrome or Edge.',
    statusIdle: 'Ready', statusListening: '🔴 Listening...',
    btnStop: 'Click to stop', btnStart: 'Click to speak',
    labelRecognized: 'Recognized Text', labelShortcut: 'Shortcut: Spacebar',
    placeholder: 'Your speech will be converted to text here...',
    btnClear: 'Clear', btnCopy: 'Copy', btnCopied: 'Copied ✓',
    howTitle: 'How to Use',
    steps: ['Select recognition language', 'Click button and speak', 'Copy & paste the converted text'],
    cooldownTitle: 'Please wait a moment', cooldownSub: 'Please view the ad below while you wait :)',
    adLabel: 'Ad',
  },
}

export default function VoiceDown() {
  const [voiceLang, setVoiceLang] = useState('ko-KR')
  const [isRecording, setIsRecording] = useState(false)
  const [lang, setLang] = useState('ko')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [supported, setSupported] = useState(true)
  const [cooldown, setCooldown] = useState(0)
  const [maxCooldown, setMaxCooldown] = useState(12)
  const [showCooldownAd, setShowCooldownAd] = useState(false)

  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const isRecordingRef = useRef(false)

  const t = I18N[lang]

  useEffect(() => {
    const savedVoiceLang = localStorage.getItem('vd_voice_lang')
    if (savedVoiceLang) setVoiceLang(savedVoiceLang)

    const savedLang = localStorage.getItem('dt_lang')
    if (savedLang === 'en' || savedLang === 'ko') setLang(savedLang)

    const end = localStorage.getItem('vd_cooldown_end')
    if (end) {
      const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
      if (rem > 0) { setCooldown(rem); setShowCooldownAd(true) }
    }

    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.cooldown) setMaxCooldown(d.cooldown)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setSettingsLoaded(true))

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
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

  const stopRecording = useCallback((triggerCooldown = false) => {
    isRecordingRef.current = false
    setIsRecording(false)
    recognitionRef.current?.stop()
    if (triggerCooldown) {
      setCooldown(c => c > 0 ? c : maxCooldown)
      setShowCooldownAd(true)
      localStorage.setItem('vd_cooldown_end', (Date.now() + maxCooldown * 1000).toString())
    }
  }, [maxCooldown])

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = voiceLang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => { setIsRecording(true); isRecordingRef.current = true }
    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTextRef.current += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setText(finalTextRef.current + interim)
    }
    recognition.onend = () => {
      if (isRecordingRef.current) recognition.start()
      else setIsRecording(false)
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') { isRecordingRef.current = false; setIsRecording(false) }
    }
    recognitionRef.current = recognition
    finalTextRef.current = text && !text.endsWith(' ') ? text + ' ' : text
    recognition.start()
  }, [voiceLang, text])

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) stopRecording(true)
    else startRecording()
  }, [startRecording, stopRecording])

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault(); toggleRecording()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleRecording])

  const handleVoiceLang = (code) => {
    setVoiceLang(code)
    localStorage.setItem('vd_voice_lang', code)
    if (isRecordingRef.current) stopRecording(false)
  }

  const handleClear = () => { setText(''); finalTextRef.current = '' }
  const handleCopy = () => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
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
        <meta property="og:image" content="https://www.downtools.co.kr/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://www.downtools.co.kr/voice-down" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DownTools" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.metaTitle} />
        <meta name="twitter:description" content={t.metaDesc} />
        <meta name="twitter:image" content="https://www.downtools.co.kr/og-image.png" />
        <link rel="canonical" href="https://www.downtools.co.kr/voice-down" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Voice-Down" siteHref="/" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {settingsLoaded && adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} slotData={findAdSlot(adSlots, 'home_left')} number={2} label={t.adLabel} /></aside>}
        <main className="main-content" style={{ padding: '24px 20px 60px' }}>

          <section className="hero">
            <div className="hero-badge">{t.badge}</div>
            <h1 className="hero-title">{t.heroTitle} <span className="hl">{t.heroHighlight}</span></h1>
            <p className="hero-sub">{t.heroSub}</p>
          </section>

          {!supported && <div className="no-support">{t.noSupport}</div>}

          {supported && (
            <>
              <div className="lang-tabs">
                {VOICE_LANGS.map(vl => (
                  <button key={vl.code} className={`lang-tab${voiceLang === vl.code ? ' active' : ''}`} onClick={() => handleVoiceLang(vl.code)}>
                    {vl.flag} {vl.label}
                  </button>
                ))}
              </div>

              <div className="mic-wrap">
                <button className={`mic-btn${isRecording ? ' recording' : ''}`} onClick={toggleRecording}>
                  <span className="mic-icon">{isRecording ? '⏹' : '🎤'}</span>
                  <span className="mic-label">{isRecording ? t.btnStop : t.btnStart}</span>
                </button>
              </div>

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

              <div className="status-row">
                <span className={`status-text${isRecording ? ' active' : ''}`}>
                  {isRecording ? t.statusListening : t.statusIdle}
                </span>
              </div>

              <div className="output-wrap">
                <div className="output-label">
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>{t.labelRecognized}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t.labelShortcut}</span>
                </div>
                <textarea className="output-textarea" value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} />
                <div className="action-btns">
                  <button className="action-btn" onClick={handleClear}>{t.btnClear}</button>
                  <button className={`action-btn copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
                    {copied ? t.btnCopied : t.btnCopy}
                  </button>
                </div>
              </div>
            </>
          )}

          <section className="how-section">
            <h2 className="section-title">{t.howTitle}</h2>
            <div className="steps">
              {t.steps.map((step, i) => (
                <div key={i} className="step">
                  <div className="step-num">{i + 1}</div>
                  <p>{step}</p>
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

      <Footer lang={lang} siteName="Voice-Down" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </>
  )
}
