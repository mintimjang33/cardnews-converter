// 관리자 페이지 공용 스타일 & 작은 UI 컴포넌트
export const S = {
  card: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  input: {
    background: '#1f1f1f', border: '1px solid #333', borderRadius: 8,
    padding: '10px 14px', color: '#f0f0f0', fontFamily: "'Outfit', sans-serif",
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: '#1f1f1f', border: '1px solid #333', borderRadius: 8,
    padding: '10px 14px', color: '#f0f0f0', fontFamily: 'monospace',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
    resize: 'vertical', lineHeight: 1.7,
  },
  btn: (color = '#e63946') => ({
    background: color, color: '#fff', border: 'none', borderRadius: 9,
    padding: '10px 22px', fontFamily: "'Outfit', sans-serif",
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  }),
  btnGhost: {
    background: 'none', color: '#888', border: '1px solid #333', borderRadius: 9,
    padding: '10px 22px', fontFamily: "'Outfit', sans-serif",
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  label: { color: '#888', fontSize: 12, marginBottom: 5, display: 'block', fontWeight: 600 },
  row: { background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 16px', marginBottom: 8 },
}

export function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 50, height: 28, borderRadius: 14,
      background: value ? '#e63946' : '#333',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, background: '#fff',
        position: 'absolute', top: 3, left: value ? 25 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1f1f1f', border: '1px solid #333', borderRadius: 10,
      padding: '12px 22px', fontSize: 14, color: '#f0f0f0', zIndex: 999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>{msg}</div>
  )
}
