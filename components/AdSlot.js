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

export function AdSlot({ slot, format = 'auto', tall = false, label = '광고', number, style: extraStyle = {} }) {
  const ref = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client])

  if (!client) return (
    <div className={`ad-slot${tall ? ' tall' : ''}`} style={extraStyle}>
      {number && <AdBadge number={number} label={label} />}
      <span style={{ fontSize: 20 }}>📢</span>
      <span>{label} 영역</span>
      <span style={{ fontSize: 11, color: '#444', marginTop: 4 }}>NEXT_PUBLIC_ADSENSE_CLIENT 환경변수 설정 후 표시</span>
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

export function SidebarAd({ slot, label = '광고', number }) {
  const ref = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client])

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
