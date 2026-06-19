import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'

const TOOLS = [
  { id: 'counter', label: '글자수 세기' },
  { id: 'clean',   label: '공백 정리' },
  { id: 'case',    label: '대소문자 변환' },
  { id: 'remove',  label: '텍스트 제거' },
  { id: 'sort',    label: '줄 정렬' },
  { id: 'diff',    label: '텍스트 비교' },
]

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
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
    }).catch(() => {})
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1500) }
  const copy = (text) => { navigator.clipboard.writeText(text).then(() => showToast('복사됨!')) }

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
  }

  const runCase = (type) => {
    const r =
      type === 'upper'  ? caseInput.toUpperCase() :
      type === 'lower'  ? caseInput.toLowerCase() :
      type === 'title'  ? caseInput.replace(/\b\w/g, c => c.toUpperCase()) :
      caseInput.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('')
    setCaseResult(r)
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
    setDiffHtml(`<div style="font-size:12px;color:#888;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f0f0ea">동일 ${same}줄 · 삭제 ${removed}줄 · 추가 ${added}줄</div>` + html)
  }

  const placeholder = <span style={{ color: '#bbb', fontSize: 13 }}>결과가 여기에 표시됩니다</span>

  return (
    <>
      <Head>
        <title>Text-Down · 무료 텍스트 도구</title>
        <meta name="description" content="글자수 세기, 공백 제거, 텍스트 비교 등 무료 온라인 텍스트 도구" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <Header siteName="Text-Down" siteHref="/" />

      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60, fontFamily: "'Outfit', -apple-system, sans-serif" }}>
        {adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} style={{ marginBottom: 24 }} />}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {TOOLS.map(t => (
            <button key={t.id}
              style={{ padding: '7px 14px', fontSize: 13, border: `1px solid ${tool === t.id ? '#1a1a1a' : '#e0e0da'}`, background: tool === t.id ? '#1a1a1a' : '#fff', color: tool === t.id ? '#fff' : '#555', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => setTool(t.id)}>{t.label}
            </button>
          ))}
        </div>

        {/* 글자수 세기 */}
        {tool === 'counter' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>글자수 세기</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>공백 포함/제외 글자수, 단어수, 줄수를 실시간으로 세어줍니다</p></div>
            <textarea style={S.textarea} value={counterText} onChange={e => setCounterText(e.target.value)} placeholder="텍스트를 여기에 붙여넣으세요..." />
            <div style={S.statsBar}>
              <div style={S.stat}>글자수(공백포함) <strong>{c.total.toLocaleString()}</strong></div>
              <div style={S.stat}>글자수(공백제외) <strong>{c.nospace.toLocaleString()}</strong></div>
              <div style={S.stat}>단어수 <strong>{c.words.toLocaleString()}</strong></div>
              <div style={S.stat}>문장수 <strong>{c.sentences}</strong></div>
              <div style={S.stat}>줄수 <strong>{c.lines.toLocaleString()}</strong></div>
              <div style={S.stat}>바이트 <strong>{c.bytes >= 1024 ? (c.bytes / 1024).toFixed(1) + 'KB' : c.bytes + 'B'}</strong></div>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => setCounterText('')}>초기화</button>
              <button style={S.btn(false)} onClick={() => copy(counterText)}>복사</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
          </div>
        )}

        {/* 공백 정리 */}
        {tool === 'clean' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>공백 / 줄바꿈 정리</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>불필요한 공백, 빈 줄을 제거합니다</p></div>
            <textarea style={S.textarea} value={cleanInput} onChange={e => setCleanInput(e.target.value)} placeholder="정리할 텍스트를 붙여넣으세요..." />
            <div style={S.options}>
              {[['optSpace', optSpace, setOptSpace, '연속 공백 제거'], ['optEmpty', optEmpty, setOptEmpty, '빈 줄 제거'], ['optTrim', optTrim, setOptTrim, '앞뒤 공백 제거']].map(([, val, set, label]) => (
                <label key={label} style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} /> {label}
                </label>
              ))}
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)} onClick={runClean}>정리하기</button>
              <button style={S.btn(false)} onClick={() => copy(cleanResult)}>결과 복사</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{cleanResult || placeholder}</div>
          </div>
        )}

        {/* 대소문자 */}
        {tool === 'case' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>대소문자 변환</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>영문 텍스트의 대소문자를 변환합니다</p></div>
            <textarea style={S.textarea} value={caseInput} onChange={e => setCaseInput(e.target.value)} placeholder="변환할 텍스트를 붙여넣으세요..." />
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={() => runCase('upper')}>대문자</button>
              <button style={S.btn(false)} onClick={() => runCase('lower')}>소문자</button>
              <button style={S.btn(false)} onClick={() => runCase('title')}>첫글자 대문자</button>
              <button style={S.btn(false)} onClick={() => runCase('toggle')}>대소문자 반전</button>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => copy(caseResult)}>결과 복사</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{caseResult || placeholder}</div>
          </div>
        )}

        {adsOn && <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_MIDDLE || '3333333333'} style={{ margin: '16px 0' }} />}

        {/* 텍스트 제거 */}
        {tool === 'remove' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>텍스트 제거</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>특정 문자, HTML 태그, 특수문자 등을 제거합니다</p></div>
            <textarea style={S.textarea} value={removeInput} onChange={e => setRemoveInput(e.target.value)} placeholder="텍스트를 붙여넣으세요..." />
            <div style={S.options}>
              <select value={removeType} onChange={e => setRemoveType(e.target.value)} style={{ padding: '5px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6 }}>
                <option value="html">HTML 태그 제거</option>
                <option value="special">특수문자 제거</option>
                <option value="number">숫자 제거</option>
                <option value="korean">한글 제거</option>
                <option value="english">영문 제거</option>
                <option value="duplicate">중복 줄 제거</option>
              </select>
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)} onClick={runRemove}>제거하기</button>
              <button style={S.btn(false)} onClick={() => copy(removeResult)}>결과 복사</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={S.result}>{removeResult || placeholder}</div>
          </div>
        )}

        {/* 줄 정렬 */}
        {tool === 'sort' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>줄 정렬 / 뒤집기</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>각 줄을 가나다순, 역순 등으로 정렬합니다</p></div>
            <textarea style={S.textarea} value={sortInput} onChange={e => setSortInput(e.target.value)} placeholder="정렬할 텍스트를 줄 단위로 입력하세요..." />
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={() => runSort('asc')}>가나다순</button>
              <button style={S.btn(false)} onClick={() => runSort('desc')}>역순</button>
              <button style={S.btn(false)} onClick={() => runSort('reverse')}>줄 뒤집기</button>
              <button style={S.btn(false)} onClick={() => runSort('shuffle')}>랜덤 섞기</button>
            </div>
            <div style={S.actions}>
              <button style={S.btn(false)} onClick={() => copy(sortResult)}>결과 복사</button>
              {toast && <span style={S.toast}>{toast}</span>}
            </div>
            <div style={{ ...S.result, fontFamily: 'monospace', fontSize: 13 }}>{sortResult || placeholder}</div>
          </div>
        )}

        {/* 텍스트 비교 */}
        {tool === 'diff' && (
          <div style={S.panel}>
            <div style={S.panelHeader}><h2 style={{ fontSize: 15, fontWeight: 600 }}>텍스트 비교 (Diff)</h2><p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>두 텍스트의 차이점을 줄 단위로 비교합니다</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f0f0ea' }}>
              <div style={{ borderRight: '1px solid #f0f0ea' }}>
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0f0ea' }}>원본</div>
                <textarea style={{ ...S.textarea, minHeight: 140, borderBottom: 'none' }} value={diffA} onChange={e => setDiffA(e.target.value)} placeholder="원본 텍스트..." />
              </div>
              <div>
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0f0ea' }}>비교</div>
                <textarea style={{ ...S.textarea, minHeight: 140, borderBottom: 'none' }} value={diffB} onChange={e => setDiffB(e.target.value)} placeholder="비교할 텍스트..." />
              </div>
            </div>
            <div style={S.actions}>
              <button style={S.btn(true)}  onClick={runDiff}>비교하기</button>
              <button style={S.btn(false)} onClick={() => { setDiffA(''); setDiffB(''); setDiffHtml('') }}>초기화</button>
            </div>
            {diffHtml
              ? <div style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.8, minHeight: 80 }} dangerouslySetInnerHTML={{ __html: diffHtml }} />
              : <div style={{ padding: '12px 16px', color: '#bbb', fontSize: 13 }}>결과가 여기에 표시됩니다</div>
            }
          </div>
        )}
      </div>

      <Footer siteName="Text-Down" />
    </>
  )
}
