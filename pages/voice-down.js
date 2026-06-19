import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot } from '../components/AdSlot'

const VOICE_LANGS = [
  { code: 'ko-KR', flag: '🇰🇷', label: '한국어' },
  { code: 'en-US', flag: '🇺🇸', label: 'English' },
  { code: 'ja-JP', flag: '🇯🇵', label: '日本語' },
  { code: 'zh-CN', flag: '🇨🇳', label: '中文' },
  { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
  { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
]

export default function VoiceDown() {
  const [voiceLang, setVoiceLang] = useState('ko-KR')
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState('대기 중')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [adsOn, setAdsOn] = useState(true)
  const [supported, setSupported] = useState(true)

  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const isRecordingRef = useRef(false)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    const savedVoiceLang = localStorage.getItem('vd_voice_lang')
    if (savedVoiceLang) setVoiceLang(savedVoiceLang)

    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
    }).catch(() => {})
  }, [])

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    setIsRecording(false)
    recognitionRef.current?.stop()
    setStatus('대기 중')
  }, [])

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = voiceLang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsRecording(true)
      isRecordingRef.current = true
      setStatus('🔴 듣는 중...')
    }
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
      else { setIsRecording(false); setStatus('대기 중') }
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        isRecordingRef.current = false
        setIsRecording(false)
        setStatus('대기 중')
      }
    }

    recognitionRef.current = recognition
    finalTextRef.current = text && !text.endsWith(' ') ? text + ' ' : text
    recognition.start()
  }, [voiceLang, text])

  const toggleRecording = useCallback(() => {
    isRecordingRef.current ? stopRecording() : startRecording()
  }, [startRecording, stopRecording])

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        toggleRecording()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleRecording])

  const handleVoiceLang = (code) => {
    setVoiceLang(code)
    localStorage.setItem('vd_voice_lang', code)
    if (isRecordingRef.current) stopRecording()
  }

  const handleClear = () => { setText(''); finalTextRef.current = '' }

  const handleCopy = () => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <Head>
        <title>Voice-Down - 무료 음성 타이핑 | 클릭 한 번으로 말하기</title>
        <meta name="description" content="클릭 한 번으로 말하면 자동으로 텍스트 변환! 한국어·영어·일본어·중국어 지원. 무료 음성 인식 타이핑 도구." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header siteName="Unified Tools" siteHref="/" />

      <div className="wrap">
        {adsOn && <div style={{ marginTop: 24 }}><AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} /></div>}

        <section className="hero">
          <div className="hero-badge">무료 · 클릭 한 번 · 음성 타이핑</div>
          <h1 className="hero-title">클릭 한 번으로 <span className="hl">음성 타이핑</span></h1>
          <p className="hero-sub">말하면 자동으로 텍스트 변환! 키보드 없이 편하게 타이핑하세요.</p>
        </section>

        {!supported && (
          <div className="no-support">❌ 이 브라우저는 음성인식을 지원하지 않습니다. 크롬(Chrome) 또는 엣지(Edge)를 사용해주세요.</div>
        )}

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
                <span className="mic-label">{isRecording ? '클릭해서 중지' : '클릭해서 말하기'}</span>
              </button>
            </div>

            <div className="status-row">
              <span className={`status-text${isRecording ? ' active' : ''}`}>{status}</span>
            </div>

            <div className="output-wrap">
              <div className="output-label">
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>인식된 텍스트</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>단축키: 스페이스바</span>
              </div>
              <textarea className="output-textarea" value={text} onChange={e => setText(e.target.value)} placeholder="여기에 음성이 텍스트로 변환됩니다..." />
              <div className="action-btns">
                <button className="action-btn" onClick={handleClear}>지우기</button>
                <button className={`action-btn copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
                  {copied ? '복사됨 ✓' : '복사'}
                </button>
              </div>
            </div>

            {adsOn && <div style={{ marginBottom: 32 }}><AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} /></div>}
          </>
        )}

        <section className="how-section">
          <h2 className="section-title">사용 방법</h2>
          <div className="steps">
            {['인식 언어 선택', '버튼 클릭 후 말하기', '변환된 텍스트 복사·붙여넣기'].map((step, i) => (
              <div key={i} className="step">
                <div className="step-num">{i + 1}</div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer siteName="Unified Tools" />
    </>
  )
}
