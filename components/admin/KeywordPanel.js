import { useState, useEffect } from 'react'
import { S } from './AdminUI'

const TOOLS = [
  { id: 'thumb-down',    label: '🖼 썸네일',   hint: '썸네일' },
  { id: 'sound-down',    label: '🔊 효과음',   hint: '효과음' },
  { id: 'clock-down',    label: '⏱ 타이머',   hint: '타이머' },
  { id: 'voice-down',    label: '🎤 보이스',   hint: '음성타이핑' },
  { id: 'text-down',     label: '📝 텍스트',   hint: '글자수세기' },
  { id: 'cardnews-down', label: '📰 카드뉴스', hint: '카드뉴스' },
]

function formatDate(iso) {
  if (!iso) return '기록 없음'
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function daysSince(iso) {
  if (!iso) return 999
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function KeywordPanel({ token }) {
  const [stats, setStats]     = useState({})   // { 'thumb-down': { collected_at, count } }
  const [loading, setLoading] = useState({})   // { 'thumb-down': true }
  const [toast, setToast]     = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // 각 도구별 최신 수집 날짜 + 키워드 수 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res  = await fetch('/api/tools/keyword-stats', {
          headers: { 'x-admin-token': token },
        })
        const data = await res.json()
        setStats(data)
      } catch (e) {
        console.error(e)
      }
    }
    fetchStats()
  }, [token])

  const handleUpdate = async (tool) => {
    const hint = TOOLS.find(t => t.id === tool)?.hint
    if (!hint) return
    setLoading(l => ({ ...l, [tool]: true }))
    try {
      const res  = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(hint)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      // 수집일 갱신
      setStats(s => ({
        ...s,
        [tool]: { collected_at: new Date().toISOString(), count: data.saved },
      }))
      showToast(`✅ ${hint} 키워드 ${data.saved}개 저장 완료!`)
    } catch (e) {
      showToast(`❌ 오류: ${e.message}`)
    }
    setLoading(l => ({ ...l, [tool]: false }))
  }

  return (
    <div style={{ padding: 28, fontFamily: "'Outfit', sans-serif", maxWidth: 720 }}>
      <h2 style={{ color: '#f0f0f0', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        🔍 키워드 검색량 관리
      </h2>
      <p style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>
        도구별 네이버 연관 키워드 검색량을 수집합니다. 30일마다 업데이트를 권장합니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TOOLS.map(tool => {
          const stat    = stats[tool.id] || {}
          const days    = daysSince(stat.collected_at)
          const needsUpdate = days >= 30
          const isLoading   = loading[tool.id]

          return (
            <div key={tool.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#1c1c1e', border: `1px solid ${needsUpdate ? '#7f1d1d' : '#2a2a2a'}`,
              borderRadius: 10, padding: '14px 18px',
            }}>
              {/* 도구명 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f0' }}>{tool.label}</span>
              </div>

              {/* 수집일 + 키워드 수 */}
              <div style={{ flex: 1, paddingLeft: 16 }}>
                <div style={{ fontSize: 13, color: needsUpdate ? '#f87171' : '#a1a1aa' }}>
                  네이버 검색일: <b style={{ color: needsUpdate ? '#fca5a5' : '#d4d4d8' }}>
                    {formatDate(stat.collected_at)}
                  </b>
                </div>
                {stat.count != null && (
                  <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>
                    저장된 키워드 {stat.count.toLocaleString()}개
                    {needsUpdate && days < 999 && ` · ${days}일 경과`}
                  </div>
                )}
                {needsUpdate && days >= 30 && days < 999 && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠️ 30일 이상 경과 — 업데이트 권장</div>
                )}
              </div>

              {/* 업데이트 버튼 */}
              <button
                onClick={() => handleUpdate(tool.id)}
                disabled={isLoading}
                style={{
                  background: needsUpdate ? '#e63946' : '#27272a',
                  color: needsUpdate ? '#fff' : '#a1a1aa',
                  border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  cursor: isLoading ? 'wait' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif",
                  transition: 'all .15s',
                }}
              >
                {isLoading ? '수집 중...' : '업데이트'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10,
          padding: '12px 24px', fontSize: 14, color: '#f0f0f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 9999,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
