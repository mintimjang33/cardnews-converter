import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'
import { findAdSlot } from '../lib/adSlots'

const TOOLS_KO = [
  { id: 'counter', label: '글자수 세기' },
  { id: 'clean',   label: '공백 정리' },
  { id: 'case',    label: '대소문자 변환' },
  { id: 'remove',  label: '텍스트 제거' },
  { id: 'sort',    label: '줄 정렬' },
  { id: 'diff',    label: '텍스트 비교' },
]
const TOOLS_EN = [
  { id: 'counter', label: 'Character Count' },
  { id: 'clean',   label: 'Clean Spaces' },
  { id: 'case',    label: 'Change Case' },
  { id: 'remove',  label: 'Remove Text' },
  { id: 'sort',    label: 'Sort Lines' },
  { id: 'diff',    label: 'Text Diff' },
]

const I18N = {
  ko: {
    metaTitle: 'Text-Down · 무료 텍스트 도구',
    metaDesc: '글자수 세기, 공백 제거, 텍스트 비교 등 무료 온라인 텍스트 도구',
    tools: TOOLS_KO,
    // counter
    counterTitle: '글자수 세기', counterDesc: '공백 포함/제외 글자수, 단어수, 줄수를 실시간으로 세어줍니다',
    statTotal: '글자수(공백포함)', statNospace: '글자수(공백제외)', statWords: '단어수', statSentences: '문장수', statLines: '줄수', statBytes: '바이트',
    btnReset: '초기화', btnCopy: '복사', btnCopyResult: '결과 복사', toastCopied: '복사됨!',
    phCounter: '텍스트를 여기에 붙여넣으세요...',
    // clean
    cleanTitle: '공백 / 줄바꿈 정리', cleanDesc: '불필요한 공백, 빈 줄을 제거합니다',
    optSpace: '연속 공백 제거', optEmpty: '빈 줄 제거', optTrim: '앞뒤 공백 제거',
    btnClean: '정리하기', phClean: '정리할 텍스트를 붙여넣으세요...',
    // case
    caseTitle: '대소문자 변환', caseDesc: '영문 텍스트의 대소문자를 변환합니다',
    btnUpper: '대문자', btnLower: '소문자', btnTitle: '첫글자 대문자', btnToggle: '대소문자 반전',
    phCase: '변환할 텍스트를 붙여넣으세요...',
    // remove
    removeTitle: '텍스트 제거', removeDesc: '특정 문자, HTML 태그, 특수문자 등을 제거합니다',
    removeOpts: [['html','HTML 태그 제거'],['special','특수문자 제거'],['number','숫자 제거'],['korean','한글 제거'],['english','영문 제거'],['duplicate','중복 줄 제거']],
    btnRemove: '제거하기', phRemove: '텍스트를 붙여넣으세요...',
    // sort
    sortTitle: '줄 정렬 / 뒤집기', sortDesc: '각 줄을 가나다순, 역순 등으로 정렬합니다',
    btnAsc: '가나다순', btnDesc: '역순', btnReverse: '줄 뒤집기', btnShuffle: '랜덤 섞기',
    phSort: '정렬할 텍스트를 줄 단위로 입력하세요...',
    // diff
    diffTitle: '텍스트 비교 (Diff)', diffDesc: '두 텍스트의 차이점을 줄 단위로 비교합니다',
    diffLabelA: '원본', diffLabelB: '비교',
    phDiffA: '원본 텍스트...', phDiffB: '비교할 텍스트...',
    btnDiff: '비교하기',
    diffStat: (s,r,a) => `동일 ${s}줄 · 삭제 ${r}줄 · 추가 ${a}줄`,
    placeholder: '결과가 여기에 표시됩니다',
    cooldownTitle: '잠시 대기 중', cooldownSub: '아래 광고를 잠시 봐주세요 :)',
    adLabel: '광고',
  },
  en: {
    metaTitle: 'Text-Down · Free Text Tools',
    metaDesc: 'Character counter, whitespace cleaner, text diff and more — free online text tools',
    tools: TOOLS_EN,
    // counter
    counterTitle: 'Character Count', counterDesc: 'Count characters (with/without spaces), words, sentences, and lines in real time',
    statTotal: 'Chars (with spaces)', statNospace: 'Chars (no spaces)', statWords: 'Words', statSentences: 'Sentences', statLines: 'Lines', statBytes: 'Bytes',
    btnReset: 'Reset', btnCopy: 'Copy', btnCopyResult: 'Copy Result', toastCopied: 'Copied!',
    phCounter: 'Paste your text here...',
    // clean
    cleanTitle: 'Clean Spaces / Line Breaks', cleanDesc: 'Remove unnecessary spaces and blank lines',
    optSpace: 'Remove extra spaces', optEmpty: 'Remove blank lines', optTrim: 'Trim leading/trailing spaces',
    btnClean: 'Clean', phClean: 'Paste text to clean...',
    // case
    caseTitle: 'Change Case', caseDesc: 'Convert the case of English text',
    btnUpper: 'UPPERCASE', btnLower: 'lowercase', btnTitle: 'Title Case', btnToggle: 'tOGGLE cASE',
    phCase: 'Paste text to convert...',
    // remove
    removeTitle: 'Remove Text', removeDesc: 'Remove specific characters, HTML tags, special chars, and more',
    removeOpts: [['html','Remove HTML tags'],['special','Remove special chars'],['number','Remove numbers'],['korean','Remove Korean'],['english','Remove English'],['duplicate','Remove duplicate lines']],
    btnRemove: 'Remove', phRemove: 'Paste text here...',
    // sort
    sortTitle: 'Sort / Reverse Lines', sortDesc: 'Sort each line alphabetically, reverse, or shuffle',
    btnAsc: 'A → Z', btnDesc: 'Z → A', btnReverse: 'Reverse Lines', btnShuffle: 'Shuffle',
    phSort: 'Enter text line by line...',
    // diff
    diffTitle: 'Text Diff', diffDesc: 'Compare two texts line by line',
    diffLabelA: 'Original', diffLabelB: 'Comparison',
    phDiffA: 'Original text...', phDiffB: 'Text to compare...',
    btnDiff: 'Compare',
    diffStat: (s,r,a) => `Same: ${s} · Removed: ${r} · Added: ${a}`,
    placeholder: 'Result will appear here',
    cooldownTitle: 'Please wait a moment', cooldownSub: 'Please view the ad below while you wait :)',
    adLabel: 'Ad',
  },
}

const S = {
  panel:       { background: '#fff', border: '1px solid #e5e5e0', borderRadius: 12, overflow: 'hidden' },
  panelHeader: { padding: '14px 16px', borderBottom: '1px solid #f0f0ea' },
  textarea:    { width: '100%', minHeight: 180, padding: 14, fontSize: 14, lineHeight: 1.6, border: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#1a1a1a', background: '#fafaf8', outline: 'none', borderBottom: '1px solid #f0f0ea', display: 'block' },
  actions:     { padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #f0f0ea' },
  btn:  (p)  => ({ padding: '7px 14px', fontSize: 13, border: `1px solid ${p ? '#1a1a1a' : '#e0e0da'}`, background: p ? '#1a1a1a' : '#fff', color: p ? '#fff' : '#333', borderRadius: 8, cursor: 'pointer' }),
  statsBar:    { padding: '10px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', background: '#fafaf8' },
  stat:        { fontSize: 12, color: '#888' },
  result:      { padding: '14px 16px', minHeight: 80, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#1a1a1a' },
  options:     { padding: '10px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid #f0f0ea', background: '#fafaf8', alignItems: 'center' },
  toast:       { fontSize: 12, color: '#22c55e' },
}

export default function TextDown() {
  const [tool, setTool] = useState('counter')
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [lang, setLang] = useState('ko')
  const [cooldown, setCooldown] = useState(0)
  const [maxCooldown, setMaxCooldown] = useState(12)
  const [showCooldownAd, setShowCooldownAd] = useState(false)

  const [counterText, setCounterText] = useState('')
  const [cleanInput, setCleanInput]   = useState('')
  const [cleanResult, setCleanResult] = useState('')
  const [optSpace, setOptSpace] = useState(true)
  const [optEmpty, setOptEmpty] = useState(true)
  const [optTrim,  setOptTrim]  = useState(true)
  const [caseInput,   setCaseInput]   = useState('')
  const [caseResult,  setCaseResult]  = useState('')
  const [removeInput,  setRemoveInput]  = useState('')
  const [removeResult, setRemoveResult] = useState('')
  const [removeType,   setRemoveType]   = useState('html')
  const [sortInput,  setSortInput]  = useState('')
  const [sortResult, setSortResult] = useState('')
  const [diffA, setDiffA] = useState('')
  const [diffB, setDiffB] = useState('')
  const [diffHtml, setDiffHtml] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)
    const end = localStorage.getItem('txtdown_cooldown_end')
    if (end) {
      const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
      if (rem > 0) { setCooldown(rem); setShowCooldownAd(true) }
    }
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.cooldown) setMaxCooldown(d.cooldown)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
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
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]

  const triggerCooldown = () => {
    setCooldown(c => c > 0 ? c : maxCooldown)
    setShowCooldownAd(true)
    localStorage.setItem('txtdown_cooldown_end', (Date.now() + maxCooldown * 1000).toString())
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1500) }
  const copy = (text) => { navigator.clipboard.writeText(text).then(() => showToast(t.toastCopied)) }

  const c = {
    total:     counterText.length,
    nospace:   counterText.replace(/\s/g, '').length,
    words:     counterText.trim() ? counterText.trim().split(/\s+/).length : 0,
    sentences: counterText.trim() ? (counterText.match(/[.!?。！？]+/g) || []).length : 0,
    lines:     counterText ? counterText.split('\n').length : 0,
    bytes:     new Blob([counterText]).size,
  }

  const runClean = () => {
    let t = cleanInput
    if (optSpace) t = t.replace(/ {2,}/g, ' ')
    if (optEmpty) t = t.split('\n').filter(l => l.trim()).join('\n')
    if (optTrim)  t = t.split('\n').map(l => l.trim()).join('\n').trim()
    setCleanResult(t)
    triggerCooldown()
  }

  const runCase = (type) => {
    const r =
      type === 'upper'  ? caseInput.toUpperCase() :
      type === 'lower'  ? caseInput.toLowerCase() :
      type === 'title'  ? caseInput.replace(/\b\w/g, c => c.toUpperCase()) :
      caseInput.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('')
    setCaseResult(r)
    triggerCooldown()
  }

  const runRemove = () => {
    let r = removeInput
    if (removeType === 'html')      r = r.replace(/<[^>]+>/g, '')
    else if (removeType === 'special')   r = r.replace(/[^\w\s가-힣]/g, '')
    else if (removeType === 'number')    r = r.replace(/[0-9]/g, '')
    else if (removeType === 'korean')    r = r.replace(/[가-힣]/g, '')
    else if (removeType === 'english')   r = r.replace(/[a-zA-Z]/g, '')
    else if (removeType === 'duplicate') {
      const seen = new Set()
      r = r.split('\n').filter(l => { if (seen.has(l)) return false; seen.add(l); return true }).join('\n')
    }
    setRemoveResult(r)
    triggerCooldown()
  }

  const runSort = (type) => {
    let lines = sortInput.split('\n')
    if (type === 'asc')     lines.sort((a, b) => a.localeCompare(b, 'ko'))
    else if (type === 'desc')    lines.sort((a, b) => b.localeCompare(a, 'ko'))
    else if (type === 'reverse') lines.reverse()
    else if (type === 'shuffle') {
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]]
      }
    }
    setSortResult(lines.join('\n'))
    triggerCooldown()
  }

  const runDiff = () => {
    const a = diffA.split('\n'), b = diffB.split('\n')
    const max = Math.max(a.length, b.length)
    let html = '', same = 0, removed = 0, added = 0
    for (let i = 0; i < max; i++) {
      const la = a[i] ?? null, lb = b[i] ?? null
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (la === lb) { html += `<div style="padding:1px 4px">${esc(la || '')}</div>`; same++ }
      else {
        if (la !== null) { html += `<div style="background:#fff0f0;color:#c0392b;padding:1px 4px">- ${esc(la)}</div>`; removed++ }
        if (lb !== null) { html += `<div style="background:#f0fff0;color:#27ae60;padding:1px 4px">+ ${esc(lb)}</div>`; added++ }
      }
    }
    setDiffHtml(`<div style="font-size:12px;color:#888;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f0f0ea">${t.diffStat(same, removed, added)}</div>` + html)
    triggerCooldown()
  }

  const placeholder = <span style={{ color: '#bbb', fontSize: 13 }}>{t.placeholder}</span>
  const cooldownPct = maxCooldown > 0 ? cooldown / maxCooldown : 0
  const circumference = 2 * Math.PI * 24

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="Text-Down" siteHref="/" />

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label={t.adLabel} />
        </div>
      )}

      <div className="page-layout">
        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} slotData={findAdSlot(adSlots, 'home_left')} number={2} label={t.adLabel} /></aside>}
        <main className="main-content" style={{ paddingTop: 24, paddingBottom: 60, padding: '24px 20px 60px', fontFamily: "'Outfit', -apple-system, sans-serif" }}>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {t.tools.map(item => (
            <button key={item.id}
              style={{ padding: '7px 14px', fontSize: 13, border: `1px solid ${tool === item.id ? '#1a1a1a' : '#e0e0da'}`, background: tool === item.id ? '#1a1a1a' : '#fff', color: tool === item.id ? '#fff' : '#555', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => setTool(item.id)}>{item.label}
            </button>
          ))}
        </div>

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
            {adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_COOLDOWN || '2222222222'} slotData={findAdSlot(adSlots, 'home_cooldown')} tall number={4} label={t.adLabel} />}
          </div>
        )}

        {/* Character Counter */}
        {tool === 'counter' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.counterTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.counterDesc}</p></div>
            <textarea style={S.textarea} value={counterText} onChange={e => setCounterText(e.target.value)} placeholder={t.phCounter} />
            <div style={S.statsBar}>
              <div style={S.stat}>{t.statTotal} <strong>{c.total.toLocaleString()}</strong></div>
              <div style={S.stat}>{t.statNospace} <strong>{c.nospace.toLocaleString()}</strong></div>
              <div style={S.stat}>{t.statWords} <strong>{c.words.toLocaleString()}</strong></div>
              <div style={S.stat}>{t.statSentences} <strong>{c.sentences}</strong></div>
              <div style={S.stat}>{t.statLines} <strong>{c.lines.toLocaleString()}</strong></div>
              <div style={S.stat}>{t.statBytes} <strong>{c.bytes >= 1024 ? (c.bytes / 1024).toFixed(1) + 'KB' : c.bytes + 'B'}</strong></div>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => setCounterText('')}>{t.btnReset}</button>
              <button style={S.btn(false)} onClick={() => copy(counterText)}>{t.btnCopy}</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
          </div>
        )}

        {/* Clean Spaces */}
        {tool === 'clean' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.cleanTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.cleanDesc}</p></div>
            <textarea style={S.textarea} value={cleanInput} onChange={e => setCleanInput(e.target.value)} placeholder={t.phClean} />
            <div style={S.options}>
              {[[optSpace, setOptSpace, t.optSpace], [optEmpty, setOptEmpty, t.optEmpty], [optTrim, setOptTrim, t.optTrim]].map(([val, set, label]) => (
                <label key={label} style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} /> {label}
                </label>
              ))}
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)} onClick={runClean}>{t.btnClean}</button>
              <button style={S.btn(false)} onClick={() => copy(cleanResult)}>{t.btnCopyResult}</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{cleanResult || placeholder}</div>
          </div>
        )}

        {/* Change Case */}
        {tool === 'case' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.caseTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.caseDesc}</p></div>
            <textarea style={S.textarea} value={caseInput} onChange={e => setCaseInput(e.target.value)} placeholder={t.phCase} />
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={() => runCase('upper')}>{t.btnUpper}</button>
              <button style={S.btn(false)} onClick={() => runCase('lower')}>{t.btnLower}</button>
              <button style={S.btn(false)} onClick={() => runCase('title')}>{t.btnTitle}</button>
              <button style={S.btn(false)} onClick={() => runCase('toggle')}>{t.btnToggle}</button>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => copy(caseResult)}>{t.btnCopyResult}</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{caseResult || placeholder}</div>
          </div>
        )}

{/* Remove Text */}
        {tool === 'remove' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.removeTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.removeDesc}</p></div>
            <textarea style={S.textarea} value={removeInput} onChange={e => setRemoveInput(e.target.value)} placeholder={t.phRemove} />
            <div style={S.options}>
              <select value={removeType} onChange={e => setRemoveType(e.target.value)} style={{ padding: '5px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6 }}>
                {t.removeOpts.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)} onClick={runRemove}>{t.btnRemove}</button>
              <button style={S.btn(false)} onClick={() => copy(removeResult)}>{t.btnCopyResult}</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{removeResult || placeholder}</div>
          </div>
        )}

        {/* Sort Lines */}
        {tool === 'sort' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.sortTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.sortDesc}</p></div>
            <textarea style={S.textarea} value={sortInput} onChange={e => setSortInput(e.target.value)} placeholder={t.phSort} />
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={() => runSort('asc')}>{t.btnAsc}</button>
              <button style={S.btn(false)} onClick={() => runSort('desc')}>{t.btnDesc}</button>
              <button style={S.btn(false)} onClick={() => runSort('reverse')}>{t.btnReverse}</button>
              <button style={S.btn(false)} onClick={() => runSort('shuffle')}>{t.btnShuffle}</button>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => copy(sortResult)}>{t.btnCopyResult}</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={{ ...S.result, fontFamily: 'monospace', fontSize: 13 }}>{sortResult || placeholder}</div>
          </div>
        )}

        {/* Text Diff */}
        {tool === 'diff' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>{t.diffTitle}</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.diffDesc}</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f0f0ea' }}>
              <div style={{ borderRight: '1px solid #f0f0ea' }}>
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0f0ea' }}>{t.diffLabelA}</div>
                <textarea style={{ ...S.textarea, minHeight: 140, borderBottom: 'none' }} value={diffA} onChange={e => setDiffA(e.target.value)} placeholder={t.phDiffA} />
              </div>
              <div>
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0f0ea' }}>{t.diffLabelB}</div>
                <textarea style={{ ...S.textarea, minHeight: 140, borderBottom: 'none' }} value={diffB} onChange={e => setDiffB(e.target.value)} placeholder={t.phDiffB} />
              </div>
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={runDiff}>{t.btnDiff}</button>
              <button style={S.btn(false)} onClick={() => { setDiffA(''); setDiffB(''); setDiffHtml('') }}>{t.btnReset}</button>
            </div>
            {diffHtml
              ? <div style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.8, minHeight: 80 }} dangerouslySetInnerHTML={{ __html: diffHtml }} />
              : <div style={{ padding: '12px 16px', color: '#bbb', fontSize: 13 }}>{t.placeholder}</div>
            }
          </div>
        )}
        </main>
        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} slotData={findAdSlot(adSlots, 'home_right')} number={3} label={t.adLabel} /></aside>}
      </div>

      {adsOn && (
        <div className="wrap" style={{ marginTop: 24, marginBottom: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} slotData={findAdSlot(adSlots, 'home_middle')} number={5} label={t.adLabel} />
        </div>
      )}

      <Footer lang={lang} siteName="Text-Down" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} />
    </>
  )
}
