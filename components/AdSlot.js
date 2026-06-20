import { useEffect, useRef } from 'react'

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

  // 관리자 코드 사용 모드 (active && code 둘 다 있을 때만 실제 광고 표시)
  const hasManagedCode = !!(slotData && slotData.active && slotData.code)
  // 대기 상태: active는 켜져 있지만 코드가 아직 없음 → 빈 자리(placeholder)만 표시
  const isWaiting = !!(slotData && slotData.active && !slotData.code)
  useInjectAdCode(codeRef, hasManagedCode ? slotData.code : null, [hasManagedCode, slotData?.code])

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

  const hasManagedCode = !!(slotData && slotData.active && slotData.code)
  const isWaiting = !!(slotData && slotData.active && !slotData.code)
  useInjectAdCode(codeRef, hasManagedCode ? slotData.code : null, [hasManagedCode, slotData?.code])

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
