import { useState, useEffect } from 'react'

const BASE_TOOLS = [
  { id: 'thumb-down',    label: '🖼 썸네일',   hint: '썸네일' },
  { id: 'sound-down',    label: '🔊 효과음',   hint: '효과음' },
  { id: 'clock-down',    label: '⏱ 타이머',   hint: '타이머' },
  { id: 'voice-down',    label: '🎤 보이스',   hint: '보이스' },
  { id: 'text-down',     label: '📝 텍스트',   hint: '텍스트' },
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

function fmt(n) { return (n || 0).toLocaleString() }

export default function KeywordPanel({ token }) {
  const [hintList, setHintList]         = useState([])
  const [loading, setLoading]           = useState({})
  const [expanded, setExpanded]         = useState(null)
  const [topData, setTopData]           = useState({})
  const [topLoading, setTopLoading]     = useState({})
  const [toast, setToast]               = useState('')
  const [tab, setTab]                   = useState('top')
  const [picks, setPicks]               = useState([])
  const [picksLoading, setPicksLoading] = useState(false)
  const [addKeyword, setAddKeyword]     = useState('')
  const [addLoading, setAddLoading]     = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadStats = () => {
    fetch('/api/tools/keyword-stats', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(data => setHintList(Array.isArray(data) ? data : []))
      .catch(console.error)
  }

  useEffect(() => { loadStats() }, [token])

  const loadPicks = async () => {
    setPicksLoading(true)
    try {
      const res = await fetch('/api/tools/keyword-picks', { headers: { 'x-admin-token': token } })
      setPicks(await res.json())
    } catch (e) { console.error(e) }
    setPicksLoading(false)
  }

  useEffect(() => { loadPicks() }, [token])

  const handleExpand = async (hint) => {
    if (expanded === hint) { setExpanded(null); return }
    setExpanded(hint)
    if (topData[hint]) return
    setTopLoading(l => ({ ...l, [hint]: true }))
    try {
      const res = await fetch(`/api/tools/keyword-top?hint=${encodeURIComponent(hint)}&limit=50`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      setTopData(d => ({ ...d, [hint]: data.results || [] }))
    } catch (e) { console.error(e) }
    setTopLoading(l => ({ ...l, [hint]: false }))
  }

  const handleUpdate = async (tool) => {
    setLoading(l => ({ ...l, [tool.hint]: true }))
    try {
      const res = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(tool.hint)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      loadStats()
      setTopData(d => ({ ...d, [tool.hint]: null }))
      showToast(`✅ ${tool.hint} 키워드 ${data.saved}개 저장 완료!`)
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setLoading(l => ({ ...l, [tool.hint]: false }))
  }

  const handleAdd = async () => {
    const kw = addKeyword.trim()
    if (!kw) return showToast('키워드를 입력해주세요')
    setAddLoading(true)
    try {
      const res = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(kw)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      loadStats()
      setTopData(d => ({ ...d, [kw]: null }))
      showToast(`✅ "${kw}" 연관 키워드 ${data.saved}개 추가됨!`)
      setAddKeyword('')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setAddLoading(false)
  }

  const handleDeleteHint = async (hint) => {
    if (!confirm(`"${hint}" 키워드 데이터를 전부 삭제할까요?`)) return
    try {
      const res = await fetch(`/api/tools/keyword-delete?hint=${encodeURIComponent(hint)}`, {
        method: 'DELETE', headers: { 'x-admin-token': token },
      })
      if (!res.ok) throw new Error('삭제 실패')
      loadStats()
      setTopData(d => { const n = { ...d }; delete n[hint]; return n })
      if (expanded === hint) setExpanded(null)
      showToast(`🗑 "${hint}" 삭제 완료`)
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const handlePick = async (hint, item) => {
    const isPicked = item.picked
    try {
      if (isPicked) {
        await fetch(`/api/tools/keyword-picks?tool_id=${encodeURIComponent(hint)}&keyword=${encodeURIComponent(item.keyword)}`, {
          method: 'DELETE', headers: { 'x-admin-token': token },
        })
      } else {
        await fetch('/api/tools/keyword-picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ tool_id: hint, keyword: item.keyword, pc: item.pc, mobile: item.mobile, total: item.total, competition: item.competition, hint }),
        })
      }
      setTopData(d => ({
        ...d,
        [hint]: (d[hint] || []).map(k => k.keyword === item.keyword ? { ...k, picked: !isPicked } : k),
      }))
      loadPicks()
      showToast(isPicked ? '⭐ 찜 해제됨' : '⭐ 찜에 추가됨!')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const handleUnpick = async (toolId, keyword) => {
    try {
      await fetch(`/api/tools/keyword-picks?tool_id=${encodeURIComponent(toolId)}&keyword=${encodeURIComponent(keyword)}`, {
        method: 'DELETE', headers: { 'x-admin-token': token },
      })
      setPicks(p => p.filter(k => !(k.tool_id === toolId && k.keyword === keyword)))
      showToast('⭐ 찜 해제됨')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const baseHints = new Set(BASE_TOOLS.map(t => t.hint))

  const baseRows = BASE_TOOLS.map(tool => {
    const stat = hintList.find(h => h.hint === tool.hint) || {}
    return { hint: tool.hint, label: tool.label, isBase: true, tool, collected_at: stat.collected_at, count: stat.count || 0 }
  })
  const extraRows = hintList
    .filter(h => !baseHints.has(h.hint))
    .map(h => ({ ...h, label: h.hint, isBase: false }))
  const allRows = [...baseRows, ...extraRows]

  const S = {
    th: { fontSize: 12, color: '#71717a', fontWeight: 600, padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #2a2a2a' },
    td: { fontSize: 13, color: '#d4d4d8', padding: '8px 10px', borderBottom: '1px solid #18181b' },
    tdNum: { fontSize: 13, color: '#f0f0f0', fontWeight: 700, padding: '8px 10px', borderBottom: '1px solid #18181b', textAlign: 'right' },
  }

  return (
    <div style={{ padding: 28, fontFamily: "'Outfit', sans-serif", maxWidth: 780 }}>
      <h2 style={{ color: '#f0f0f0', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🔍 키워드 검색량 관리</h2>
      <p style={{ color: '#71717a', fontSize: 13, marginBottom: 20 }}>키워드를 입력하면 네이버 연관 키워드 전체를 수집해서 아래 목록에 추가합니다.</p>

      {/* 키워드 추가 */}
      <div style={{ background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 12 }}>➕ 키워드 추가 수집</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={addKeyword}
            onChange={e => setAddKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="예: 유튜브썸네일, 포모도로, 알람"
            style={{
              flex: 1, background: '#27272a', border: '1px solid #3f3f46',
              borderRadius: 8, color: '#f0f0f0', fontSize: 13, padding: '8px 12px',
              fontFamily: "'Outfit', sans-serif", outline: 'none',
            }}
          />
          <button onClick={handleAdd} disabled={addLoading} style={{
            background: '#e63946', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 20px', fontSize: 13, fontWeight: 700,
            cursor: addLoading ? 'wait' : 'pointer', opacity: addLoading ? 0.6 : 1,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {addLoading ? '수집 중...' : '수집'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#52525b', marginTop: 8 }}>수집하면 아래 목록에 새 항목으로 추가됩니다.</div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['top', '📊 수집 현황'], ['picks', '⭐ 찜한 키워드']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === id ? '#e63946' : '#27272a',
            color: tab === id ? '#fff' : '#a1a1aa',
            fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
          }}>{label}</button>
        ))}
      </div>

      {/* 수집 현황 */}
      {tab === 'top' && (
        <div>
          {allRows.map(row => {
            const days        = daysSince(row.collected_at)
            const needsUpdate = days >= 30
            const isLoading   = loading[row.hint]
            const isExpanded  = expanded === row.hint
            const topList     = topData[row.hint] || []

            return (
              <div key={row.hint} style={{ marginBottom: 8 }}>
                <div style={{
                  background: '#1c1c1e',
                  border: `1px solid ${isExpanded ? '#e63946' : needsUpdate ? '#7f1d1d' : '#2a2a2a'}`,
                  borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: row.count > 0 ? 'pointer' : 'default',
                }} onClick={() => row.count > 0 && handleExpand(row.hint)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f0', minWidth: 120 }}>{row.label}</span>
                    <div>
                      <div style={{ fontSize: 13, color: needsUpdate ? '#f87171' : '#a1a1aa' }}>
                        네이버 검색일: <b style={{ color: needsUpdate ? '#fca5a5' : '#d4d4d8' }}>{formatDate(row.collected_at)}</b>
                      </div>
                      {row.count > 0 && (
                        <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>
                          키워드 <b style={{ color: '#e63946', fontSize: 13 }}>{fmt(row.count)}개</b> · 클릭해서 TOP 50 보기
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {row.count > 0 && (
                      <span style={{ fontSize: 18, color: isExpanded ? '#e63946' : '#52525b' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
                    {row.isBase && (
                      <button onClick={e => { e.stopPropagation(); handleUpdate(row.tool) }} disabled={isLoading} style={{
                        background: needsUpdate ? '#e63946' : '#27272a',
                        color: needsUpdate ? '#fff' : '#a1a1aa',
                        border: 'none', borderRadius: 8, padding: '8px 16px',
                        fontSize: 13, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                        opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap',
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        {isLoading ? '수집 중...' : '업데이트'}
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDeleteHint(row.hint) }} style={{
                      background: 'none', border: '1px solid #3f3f46', borderRadius: 8,
                      color: '#71717a', fontSize: 13, padding: '7px 10px',
                      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    }}>🗑</button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: '#161616', border: '1px solid #e63946', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                    {topLoading[row.hint] ? (
                      <div style={{ padding: 20, color: '#71717a', fontSize: 13, textAlign: 'center' }}>로딩 중...</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={S.th}>순위</th>
                            <th style={S.th}>키워드</th>
                            <th style={{ ...S.th, textAlign: 'right' }}>PC</th>
                            <th style={{ ...S.th, textAlign: 'right' }}>모바일</th>
                            <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                            <th style={S.th}>경쟁</th>
                            <th style={{ ...S.th, textAlign: 'center' }}>찜</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topList.map((item, i) => (
                            <tr key={item.keyword} style={{ background: item.picked ? '#1a1a00' : 'transparent' }}>
                              <td style={{ ...S.td, color: '#52525b' }}>{i + 1}</td>
                              <td style={{ ...S.td, fontWeight: 600, color: '#f0f0f0' }}>{item.keyword}</td>
                              <td style={S.tdNum}>{fmt(item.pc)}</td>
                              <td style={S.tdNum}>{fmt(item.mobile)}</td>
                              <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                              <td style={{ ...S.td, fontSize: 12 }}>{item.competition || '-'}</td>
                              <td style={{ ...S.td, textAlign: 'center' }}>
                                <button onClick={e => { e.stopPropagation(); handlePick(row.hint, item) }} style={{
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                                }}>
                                  {item.picked ? '⭐' : '☆'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 찜한 키워드 */}
      {tab === 'picks' && (
        <div>
          {picksLoading ? (
            <div style={{ color: '#71717a', fontSize: 13, padding: 20 }}>로딩 중...</div>
          ) : picks.length === 0 ? (
            <div style={{ color: '#52525b', fontSize: 14, padding: 20, textAlign: 'center' }}>
              아직 찜한 키워드가 없어요.<br/>
              <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>수집 현황 탭에서 ☆ 버튼으로 찜해두세요!</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>키워드 그룹</th>
                  <th style={S.th}>키워드</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>PC</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>모바일</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                  <th style={S.th}>경쟁</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>해제</th>
                </tr>
              </thead>
              <tbody>
                {picks.map(item => (
                  <tr key={`${item.tool_id}-${item.keyword}`}>
                    <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{item.tool_id}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#f0f0f0' }}>{item.keyword}</td>
                    <td style={S.tdNum}>{fmt(item.pc)}</td>
                    <td style={S.tdNum}>{fmt(item.mobile)}</td>
                    <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>{item.competition || '-'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <button onClick={() => handleUnpick(item.tool_id, item.keyword)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                      }}>⭐</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10,
          padding: '12px 24px', fontSize: 14, color: '#f0f0f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 9999,
        }}>{toast}</div>
      )}
    </div>
  )
}
