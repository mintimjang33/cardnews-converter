import { useState, useEffect } from 'react'

// 사이트 공지 팝업 — admin > 팝업 관리에서 등록한 활성 팝업 중 가장 최근 1개를 보여준다.
// "오늘 하루 보지 않기"를 누르면 localStorage에 날짜를 기록해 같은 날 다시 띄우지 않는다.
export default function PopupDisplay() {
  const [popup, setPopup] = useState(null)

  useEffect(() => {
    fetch('/api/admin/popups')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data.popups) ? data.popups : []
        const now = Date.now()
        const active = list.filter(p => !p.expires_at || new Date(p.expires_at).getTime() >= now)
        if (active.length === 0) return
        const target = active[0]
        const hideKey = `dt_popup_hide_${target.id}`
        const hiddenUntil = localStorage.getItem(hideKey)
        if (hiddenUntil && new Date(hiddenUntil) > new Date()) return
        setPopup(target)
      })
      .catch(() => {})
  }, [])

  if (!popup) return null

  const hideToday = () => {
    const tomorrow = new Date()
    tomorrow.setHours(24, 0, 0, 0)
    localStorage.setItem(`dt_popup_hide_${popup.id}`, tomorrow.toISOString())
    setPopup(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={() => setPopup(null)}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: popup.bg_color || '#161616', color: popup.text_color || '#f0f0f0',
          borderRadius: 14, padding: 28, width: '100%', maxWidth: 380,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative',
        }}>
        <button onClick={() => setPopup(null)} style={{
          position: 'absolute', top: 12, right: 14, background: 'none', border: 'none',
          fontSize: 20, color: popup.text_color || '#f0f0f0', opacity: 0.6, cursor: 'pointer',
        }}>✕</button>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, paddingRight: 20 }}>{popup.title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: popup.link_url ? 18 : 20 }}>{popup.content}</div>
        {popup.link_url && (
          <a href={popup.link_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '9px 18px', borderRadius: 8,
            background: '#e63946', color: '#fff', fontWeight: 700, fontSize: 13,
            textDecoration: 'none', marginBottom: 14,
          }}>{popup.link_label || '자세히 보기'}</a>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          <button onClick={hideToday} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 12 }}>
            오늘 하루 보지 않기
          </button>
          <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12 }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
