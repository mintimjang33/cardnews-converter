import { useState, useEffect } from 'react'

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

function fmt(n) { return (n || 0).toLocaleString() }

export default function KeywordPanel({ token }) {
  const [stats, setStats]           = useState({})
  const [loading, setLoading]       = useState({})
  const [expanded, setExpanded]     = useState(null)
  const [topData, setTopData]       = useState({})
  const [topLoading, setTopLoading] = useState({})
  const [toast, setToast]           = useState('')
  const [tab, setTab]               = useState('top')
  const [picks, setPicks]           = useState([])
  const [picksLoading, setPicksLoading] = useState(false)

  // 키워드 추가 관련
  const [addKeyword, setAddKeyword]   = useState('')      // 입력값
  
  const [addLoading, setAddLoading]   = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    fetch('/api/tools/keyword-stats', { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(setStats).catch(console.error)
  }, [token])

  const loadPicks = async () => {
    setPicksLoading(true)
    try {
      const res = await fetch('/api/tools/keyword-picks', { headers: { 'x-admin-token': token } })
      setPicks(await res.json())
    } catch (e) { console.error(e) }
    setPicksLoading(false)
  }

  useEffect(() => { loadPicks() }, [token])

  const handleExpand = async (toolId) => {
    if (expanded === toolId) { setExpanded(null); return }
    setExpanded(toolId)
    if (topData[toolId]) return
    setTopLoading(l => ({ ...l, [toolId]: true }))
    try {
      const res = await fetch(`/api/tools/keyword-top?tool_id=${toolId}&limit=50`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      setTopData(d => ({ ...d, [toolId]: data.results || [] }))
    } catch (e) { console.error(e) }
    setTopLoading(l => ({ ...l, [toolId]: false }))
  }

  const handleUpdate = async (tool) => {
    setLoading(l => ({ ...l, [tool.id]: true }))
    try {
      const res = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(tool.hint)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      setStats(s => ({ ...s, [tool.id]: { collected_at: new Date().toISOString(), count: data.saved } }))
      setTopData(d => ({ ...d, [tool.id]: null }))
      showToast(`✅ ${tool.hint} 키워드 ${data.saved}개 저장 완료!`)
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setLoading(l => ({ ...l, [tool.id]: false }))
  }

  // 키워드 추가 수집
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
      // stats 갱신
      setStats(s => ({
        ...s,
        [addToolId]: {
          collected_at: new Date().toISOString(),
          count: (s[addToolId]?.count || 0) + data.saved,
        },
      }))
      setTopData(d => ({ ...d, [addToolId]: null })) // TOP 캐시 초기화
      showToast(`✅ "${kw}" 연관 키워드 ${data.saved}개 추가 저장 완료!`)
      setAddKeyword('')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setAddLoading(false)
  }

  const handlePick = async (toolId, item) => {
    const isPicked = item.picked
    try {
      if (isPicked) {
        await fetch(`/api/tools/keyword-picks?tool_id=${toolId}&keyword=${encodeURIComponent(item.keyword)}`, {
          method: 'DELETE', headers: { 'x-admin-token': token },
        })
      } else {
        const tool = TOOLS.find(t => t.id === toolId)
        await fetch('/api/tools/keyword-picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ tool_id: toolId, keyword: item.keyword, pc: item.pc, mobile: item.mobile, total: item.total, competition: item.competition, hint: tool?.hint }),
        })
      }
      setTopData(d => ({
        ...d,
        [toolId]: (d[toolId] || []).map(k =>
          k.keyword === item.keyword ? { ...k, picked: !isPicked } : k
        ),
      }))
      loadPicks()
      showToast(isPicked ? '⭐ 찜 해제됨' : '⭐ 찜에 추가됨!')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const handleUnpick = async (toolId, keyword) => {
    try {
      await fetch(`/api/tools/keyword-picks?tool_id=${toolId}&keyword=${encodeURIComponent(keyword)}`, {
        method: 'DELETE', headers: { 'x-admin-token': token },
      })
      setPicks(p => p.filter(k => !(k.tool_id === toolId && k.keyword === keyword)))
      setTopData(d => ({
        ...d,
        [toolId]: (d[toolId] || []).map(k =>
          k.keyword === keyword ? { ...k, picked: false } : k
        ),
      }))
      showToast('⭐ 찜 해제됨')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const toolLabel = (id) => TOOLS.find(t => t.id === id)?.label || id

  const S = {
    card: { background: '#1c1c1e', border: '1px solid #2a2a2a', borderRadius: 10, padding: '14px 18px', marginBottom: 10 },
    th: { fontSize: 12, color: '#71717a', fontWeight: 600, padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #2a2a2a' },
    td: { fontSize: 13, color: '#d4d4d8', padding: '8px 10px', borderBottom: '1px solid #18181b' },
    tdNum: { fontSize: 13, color: '#f0f0f0', fontWeight: 700, padding: '8px 10px', borderBottom: '1px solid #18181b', textAlign: 'right' },
  }

  return (
    <div style={{ padding: 28, fontFamily: "'Outfit', sans-serif", maxWidth: 780 }}>
      <h2 style={{ color: '#f0f0f0', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🔍 키워드 검색량 관리</h2>
      <p style={{ color: '#71717a', fontSize: 13, marginBottom: 20 }}>도구별 네이버 연관 키워드를 수집하고, 검색량 높은 키워드를 찜해두세요.</p>

      {/* ── 키워드 추가 수집 */}
      <div style={{ background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 12 }}>➕ 키워드 추가 수집</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={addKeyword}
            onChange={e => setAddKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="예: 포모도로, 알람, 집중타이머"
            style={{
              flex: 1, minWidth: 200,
              background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8,
              color: '#f0f0f0', fontSize: 13, padding: '8px 12px',
              fontFamily: "'Outfit', sans-serif", outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={addLoading}
            style={{
              background: '#e63946', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: addLoading ? 'wait' : 'pointer', opacity: addLoading ? 0.6 : 1,
              fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap',
            }}
          >
            {addLoading ? '수집 중...' : '수집'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#52525b', marginTop: 8 }}>
          입력한 키워드의 네이버 연관 키워드 전체를 수집해서 선택한 도구에 추가합니다.
        </div>
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

      {/* ── 수집 현황 탭 */}
      {tab === 'top' && (
        <div>
          {TOOLS.map(tool => {
            const stat        = stats[tool.id] || {}
            const days        = daysSince(stat.collected_at)
            const needsUpdate = days >= 30
            const isLoading   = loading[tool.id]
            const isExpanded  = expanded === tool.id
            const topList     = topData[tool.id] || []

            return (
              <div key={tool.id} style={{ marginBottom: 8 }}>
                <div style={{
                  ...S.card, marginBottom: 0,
                  border: `1px solid ${isExpanded ? '#e63946' : needsUpdate ? '#7f1d1d' : '#2a2a2a'}`,
                  borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: stat.count > 0 ? 'pointer' : 'default',
                }} onClick={() => stat.count > 0 && handleExpand(tool.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f0', minWidth: 100 }}>{tool.label}</span>
                    <div>
                      <div style={{ fontSize: 13, color: needsUpdate ? '#f87171' : '#a1a1aa' }}>
                        네이버 검색일: <b style={{ color: needsUpdate ? '#fca5a5' : '#d4d4d8' }}>{formatDate(stat.collected_at)}</b>
                      </div>
                      {stat.count > 0 && (
                        <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>
                          키워드 {fmt(stat.count)}개 저장됨 · 클릭해서 TOP 50 보기
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {stat.count > 0 && (
                      <span style={{ fontSize: 18, color: isExpanded ? '#e63946' : '#52525b' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleUpdate(tool) }} disabled={isLoading} style={{
                      background: needsUpdate ? '#e63946' : '#27272a',
                      color: needsUpdate ? '#fff' : '#a1a1aa',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontSize: 13, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                      opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap',
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      {isLoading ? '수집 중...' : '업데이트'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: '#161616', border: '1px solid #e63946', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                    {topLoading[tool.id] ? (
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
                                <button onClick={e => { e.stopPropagation(); handlePick(tool.id, item) }} style={{
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1,
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

      {/* ── 찜한 키워드 탭 */}
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
                  <th style={S.th}>도구</th>
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
                    <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{toolLabel(item.tool_id)}</td>
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
