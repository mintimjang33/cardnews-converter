import { useEffect, useRef, useState } from 'react'
import { SLOT_BANNER_SIZE } from '../lib/adSlotSizes'

// 광고 번호 뱃지 컴포넌트
function AdBadge({ number, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%',
        background: '#e63946', color: '#fff',
        fontSize: 11, fontWeight: 800, flexShrink: 0,
      }}>{number}</span>
      <span style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// 슬롯 사이즈에 맞는 쿠팡 배너/위젯 HTML을 하나 골라온다 (여러 개 등록돼 있으면 무작위)
// source가 'coupang' 또는 ('random'이면서 애드센스 코드가 없을 때) 사용된다
function useCoupangBanner(slotId, enabled) {
  const [html, setHtml] = useState(null)
  useEffect(() => {
    if (!enabled || !slotId) { setHtml(null); return }
    const size = SLOT_BANNER_SIZE[slotId]
    if (!size) { setHtml(null); return }
    fetch('/api/admin/coupang-widgets')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const matches = (Array.isArray(data) ? data : []).filter(w => w.enabled && w.widget_html && w.size === size)
        if (matches.length === 0) { setHtml(null); return }
        setHtml(matches[Math.floor(Math.random() * matches.length)].widget_html)
      })
      .catch(() => setHtml(null))
  }, [slotId, enabled])
  return html
}

// 관리자가 저장한 <script>/<ins> 코드를 안전하게 DOM에 주입 (innerHTML은 <script>를 실행하지 않으므로 직접 삽입)
function useInjectAdCode(containerRef, code, deps = []) {
  useEffect(() => {
    const el = containerRef.current
    if (!el || !code) return
    el.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.innerHTML = code
    // 스크립트 태그는 innerHTML로 넣으면 실행되지 않으므로 새로 만들어 교체
    Array.from(wrapper.querySelectorAll('script')).forEach(oldScript => {
      const newScript = document.createElement('script')
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value))
      newScript.textContent = oldScript.textContent
      oldScript.replaceWith(newScript)
    })
    el.appendChild(wrapper)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * AdSlot — 본문/배너용 광고 영역
 * slotData가 주어지면 관리자(admin)가 저장한 코드를 사용
 * slotData가 없거나 active=false면 기존 환경변수 기반 동작으로 폴백
 */
export function AdSlot({ slot, format = 'auto', tall = false, label = '광고', number, slotData = null, style: extraStyle = {} }) {
  const ref = useRef(null)
  const codeRef = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  const source = slotData?.source || 'adsense'
  const wantsCoupang = !!(slotData && slotData.active && (source === 'coupang' || source === 'random'))
  const coupangHtml = useCoupangBanner(slotData?.id, wantsCoupang)

  // 소스에 따라 실제로 보여줄 콘텐츠를 고른다 (random은 코드/쿠팡 중 있는 것을, 둘 다 있으면 무작위로)
  const hasAdsenseCode = !!(slotData && slotData.active && slotData.code && source !== 'coupang')
  const useCoupang = source === 'coupang'
    ? !!coupangHtml
    : source === 'random'
      ? (coupangHtml && (!hasAdsenseCode || Math.random() < 0.5))
      : false
  const finalCode = useCoupang ? coupangHtml : (hasAdsenseCode ? slotData.code : null)

  // 관리자 코드 사용 모드 (active && 표시할 콘텐츠가 있을 때만 실제 광고 표시)
  const hasManagedCode = !!(slotData && slotData.active && finalCode)
  // 대기 상태: active는 켜져 있지만 보여줄 콘텐츠가 아직 없음 → 빈 자리(placeholder)만 표시
  const isWaiting = !!(slotData && slotData.active && !finalCode)
  useInjectAdCode(codeRef, hasManagedCode ? finalCode : null, [hasManagedCode, finalCode])

  useEffect(() => {
    if (hasManagedCode) return // 관리자 코드 모드에서는 adsbygoogle 자동 push 불필요 (코드 자체에 포함됨)
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client, hasManagedCode])

  // slotData가 명시적으로 전달됐는데 OFF(active=false) → 완전히 숨김
  if (slotData && !slotData.active) return null

  if (hasManagedCode) return (
    <div style={extraStyle}>
      {number && <AdBadge number={number} label={label} />}
      <div ref={codeRef} />
    </div>
  )

  // 대기 상태: 자리만 보여주고 광고는 없음
  if (isWaiting) return (
    <div className={`ad-slot${tall ? ' tall' : ''}`} style={extraStyle}>
      {number && <AdBadge number={number} label={label} />}
      <span style={{ fontSize: 20 }}>📢</span>
      <span>{label} 영역</span>
      <span style={{ fontSize: 11, color: '#444', marginTop: 4 }}>관리자 페이지에서 광고 코드를 등록하세요</span>
    </div>
  )

  if (!client) return (
    <div className={`ad-slot${tall ? ' tall' : ''}`} style={extraStyle}>
      {number && <AdBadge number={number} label={label} />}
      <span style={{ fontSize: 20 }}>📢</span>
      <span>{label} 영역</span>
      <span style={{ fontSize: 11, color: '#444', marginTop: 4 }}>관리자 페이지에서 광고 코드를 등록하세요</span>
    </div>
  )

  return (
    <div style={extraStyle}>
      {number && <AdBadge number={number} label={label} />}
      <ins ref={ref} className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

/**
 * SidebarAd — 사이드바(세로형) 광고 영역
 * slotData가 주어지면 관리자(admin)가 저장한 코드를 사용
 */
export function SidebarAd({ slot, label = '광고', number, slotData = null }) {
  const ref = useRef(null)
  const codeRef = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  const source = slotData?.source || 'adsense'
  const wantsCoupang = !!(slotData && slotData.active && (source === 'coupang' || source === 'random'))
  const coupangHtml = useCoupangBanner(slotData?.id, wantsCoupang)
  const hasAdsenseCode = !!(slotData && slotData.active && slotData.code && source !== 'coupang')
  const useCoupang = source === 'coupang'
    ? !!coupangHtml
    : source === 'random'
      ? (coupangHtml && (!hasAdsenseCode || Math.random() < 0.5))
      : false
  const finalCode = useCoupang ? coupangHtml : (hasAdsenseCode ? slotData.code : null)

  const hasManagedCode = !!(slotData && slotData.active && finalCode)
  const isWaiting = !!(slotData && slotData.active && !finalCode)
  useInjectAdCode(codeRef, hasManagedCode ? finalCode : null, [hasManagedCode, finalCode])

  useEffect(() => {
    if (hasManagedCode) return
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client, hasManagedCode])

  // OFF(active=false) → 완전히 숨김
  if (slotData && !slotData.active) return null

  if (hasManagedCode) return (
    <div>
      {number && <AdBadge number={number} label={label} />}
      <div ref={codeRef} />
    </div>
  )

  // 대기 상태: 자리만 보여주고 광고는 없음
  if (isWaiting) return (
    <div className="sidebar-ad-placeholder">
      {number && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: '50%',
          background: '#e63946', color: '#fff',
          fontSize: 11, fontWeight: 800, marginBottom: 6,
        }}>{number}</span>
      )}
      <span style={{ fontSize: 18 }}>📢</span>
      <span style={{ fontSize: 12, color: '#555', marginTop: 6 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#444', marginTop: 4, textAlign: 'center' }}>160×600</span>
    </div>
  )

  if (!client) return (
    <div className="sidebar-ad-placeholder">
      {number && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: '50%',
          background: '#e63946', color: '#fff',
          fontSize: 11, fontWeight: 800, marginBottom: 6,
        }}>{number}</span>
      )}
      <span style={{ fontSize: 18 }}>📢</span>
      <span style={{ fontSize: 12, color: '#555', marginTop: 6 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#444', marginTop: 4, textAlign: 'center' }}>160×600</span>
    </div>
  )

  return (
    <div>
      {number && <AdBadge number={number} label={label} />}
      <ins ref={ref} className="adsbygoogle"
        style={{ display: 'block', width: '160px', height: '600px' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
    </div>
  )
}
