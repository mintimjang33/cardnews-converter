import { useEffect, useRef } from 'react'

export function AdSlot({ slot, format = 'auto', tall = false, label = '광고', style: extraStyle = {} }) {
  const ref = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client])

  if (!client) return (
    <div className={`ad-slot${tall ? ' tall' : ''}`} style={extraStyle}>
      <span style={{ fontSize: 20 }}>📢</span>
      <span>{label} 영역</span>
      <span style={{ fontSize: 11, color: '#444', marginTop: 4 }}>NEXT_PUBLIC_ADSENSE_CLIENT 환경변수 설정 후 표시</span>
    </div>
  )

  return (
    <div style={extraStyle}>
      <p className="ad-tag">{label}</p>
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

export function SidebarAd({ slot, label = '광고' }) {
  const ref = useRef(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !ref.current) return
    try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [client])

  if (!client) return (
    <div className="sidebar-ad-placeholder">
      <span style={{ fontSize: 18 }}>📢</span>
      <span style={{ fontSize: 12, color: '#555', marginTop: 6 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#444', marginTop: 4, textAlign: 'center' }}>160×600</span>
    </div>
  )

  return (
    <div>
      <p className="ad-tag">{label}</p>
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
