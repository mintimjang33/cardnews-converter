import { useState, useEffect } from 'react'

const BASE_TOOLS = [
  { hint: '썸네일',   label: '🖼 썸네일' },
  { hint: '효과음',   label: '🔊 효과음' },
  { hint: '타이머',   label: '⏱ 타이머' },
  { hint: '보이스',   label: '🎤 보이스' },
  { hint: '텍스트',   label: '📝 텍스트' },
  { hint: '카드뉴스', label: '📰 카드뉴스' },
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


function FeatureIdeasTab({ token, showToast }) {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const STATUS_LABELS = {
    proposed: { label: '검토 중', color: '#facc15', bg: '#1c1c00' },
    building:  { label: '개발 중', color: '#60a5fa', bg: '#0f1f3d' },
    done:      { label: '완료',   color: '#4ade80', bg: '#052e16' },
    rejected:  { label: '보류',   color: '#71717a', bg: '#27272a' },
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tools/feature-ideas', {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      setIdeas(Array.isArray(data) ? data : [])
    } catch { setIdeas([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch('/api/tools/feature-ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
      showToast('✅ 상태 변경됨')
    } catch { showToast('❌ 변경 실패') }
  }

  const fmt = (n) => (n || 0).toLocaleString('ko-KR')

  const filtered = statusFilter === 'all' ? ideas : ideas.filter(i => i.status === statusFilter)

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: '#71717a', lineHeight: 1.7 }}>
        MCP <code style={{ color: '#e63946' }}>suggest_feature</code> 툴로 기록된 기능 추가 제안 목록입니다.<br />
        Claude가 황금키워드를 발견했을 때 기존 도구에 기능으로 추가하면 좋겠다고 판단하면 여기에 쌓입니다.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', '전체'], ['proposed', '검토 중'], ['building', '개발 중'], ['done', '완료'], ['rejected', '보류']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} style={{
            padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: statusFilter === v ? '#e63946' : '#27272a',
            color: statusFilter === v ? '#fff' : '#a1a1aa',
            fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
          }}>{l}</button>
        ))}
        <button onClick={load} style={{
          padding: '5px 14px', borderRadius: 8, border: '1px solid #3f3f46',
          background: 'none', color: '#71717a', fontSize: 13, cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
        }}>🔄 새로고침</button>
      </div>
      {loading ? (
        <div style={{ color: '#71717a', fontSize: 13, padding: 20, textAlign: 'center' }}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#52525b', fontSize: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💡</div>
          아직 기록된 아이디어가 없습니다.<br />
          <span style={{ fontSize: 12, color: '#3f3f46', marginTop: 6, display: 'block' }}>
            Claude가 글 작성 중 suggest_feature 툴을 호출하면 여기에 나타납니다.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(idea => {
            const s = STATUS_LABELS[idea.status] || STATUS_LABELS.proposed
            return (
              <div key={idea.id} style={{
                background: '#1c1c1e', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: '#27272a', color: '#a1a1aa',
                      }}>{idea.tool_id}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f0' }}>{idea.feature_name}</span>
                    </div>
                    {idea.keyword && (
                      <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>
                        🔑 키워드: <span style={{ color: '#a1a1aa' }}>{idea.keyword}</span>
                        {idea.total ? <span style={{ marginLeft: 8 }}>검색수 <strong style={{ color: '#e63946' }}>{fmt(idea.total)}</strong></span> : ''}
                        {idea.competition ? <span style={{ marginLeft: 8 }}>경쟁도 {idea.competition}</span> : ''}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.7 }}>{idea.notes}</div>
                    <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 8 }}>
                      {idea.created_at ? new Date(idea.created_at).toLocaleDateString('ko-KR') : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
                      whiteSpace: 'nowrap',
                    }}>{s.label}</span>
                    <select
                      value={idea.status}
                      onChange={e => handleStatusChange(idea.id, e.target.value)}
                      style={{
                        background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa',
                        borderRadius: 6, padding: '4px 8px', fontSize: 12,
                        cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      <option value="proposed">검토 중</option>
                      <option value="building">개발 중</option>
                      <option value="done">완료</option>
                      <option value="rejected">보류</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function KeywordPanel({ token }) {
  const [hintList, setHintList]           = useState([])
  const [loading, setLoading]             = useState({})
  const [expanded, setExpanded]           = useState(null)
  const [topData, setTopData]             = useState({})
  const [topLoading, setTopLoading]       = useState({})
  const [toast, setToast]                 = useState('')
  const [tab, setTab]                     = useState('top')
  const [picks, setPicks]                 = useState([])
  const [picksLoading, setPicksLoading]   = useState(false)
  const [addKeyword, setAddKeyword]       = useState('')
  const [addLoading, setAddLoading]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [allKeywords, setAllKeywords]     = useState([])
  const [allKwLimit, setAllKwLimit] = useState(100)
  const [allKwLoading, setAllKwLoading]   = useState(false)
  const [allKwLoaded, setAllKwLoaded]     = useState(false)
  const [goldenKeywords, setGoldenKeywords]         = useState([])
  const [goldenLoading, setGoldenLoading]           = useState(false)
  const [goldenLoaded, setGoldenLoaded]             = useState(false)
  const [goldenCompetition, setGoldenCompetition]   = useState('낮음')

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

  const loadAllKeywords = async (lim) => {
    setAllKwLoading(true)
    try {
      const res = await fetch(`/api/tools/keyword-all?limit=${lim || allKwLimit}`, { headers: { 'x-admin-token': token } })
      const data = await res.json()
      setAllKeywords(data.results || [])
      setAllKwLoaded(true)
    } catch (e) { console.error(e) }
    setAllKwLoading(false)
  }

  const loadGolden = async (comp) => {
    setGoldenLoading(true)
    try {
      const c = comp || goldenCompetition
      const res = await fetch(`/api/tools/keyword-golden?competition=${encodeURIComponent(c)}&limit=200`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      setGoldenKeywords(data.results || [])
      setGoldenLoaded(true)
    } catch (e) { console.error(e) }
    setGoldenLoading(false)
  }

  const handleGoldenCompetitionChange = (c) => {
    setGoldenCompetition(c)
    setGoldenLoaded(false)
    loadGolden(c)
  }

  const handleTabChange = (t) => {
    setTab(t)
    if (t === 'all') loadAllKeywords()
    if (t === 'golden' && !goldenLoaded) loadGolden()
  }

  const handleLimitChange = (lim) => {
    setAllKwLimit(lim)
    setAllKwLoaded(false)
    loadAllKeywords(lim)
  }

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

  const handleUpdateByHint = async (hint) => {
    setLoading(l => ({ ...l, [hint]: true }))
    try {
      const res = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(hint)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      loadStats()
      setTopData(d => ({ ...d, [hint]: null }))
      setAllKwLoaded(false)
      showToast(`✅ "${hint}" 키워드 ${data.saved}개 저장 완료!`)
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setLoading(l => ({ ...l, [hint]: false }))
  }

  const handleAdd = async () => {
    const kw = addKeyword.trim()
    if (!kw) return showToast('키워드를 입력해주세요')
    const exists = hintList.find(h => h.hint === kw)
    if (exists) {
      setConfirmDelete({ type: 'duplicate', hint: kw })
      return
    }
    setAddLoading(true)
    try {
      const res = await fetch(`/api/tools/keyword-volume?keyword=${encodeURIComponent(kw)}`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      loadStats()
      setAllKwLoaded(false)
      showToast(`✅ "${kw}" 연관 키워드 ${data.saved}개 추가됨!`)
      setAddKeyword('')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
    setAddLoading(false)
  }

  const handleDeleteHint = async (hint) => {
    try {
      const res = await fetch(`/api/tools/keyword-delete?hint=${encodeURIComponent(hint)}`, {
        method: 'DELETE', headers: { 'x-admin-token': token },
      })
      if (!res.ok) throw new Error('삭제 실패')
      loadStats()
      setTopData(d => { const n = { ...d }; delete n[hint]; return n })
      if (expanded === hint) setExpanded(null)
      setAllKwLoaded(false)
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

  const handleUnmarkUsed = async (toolId, keyword) => {
    try {
      const res = await fetch('/api/tools/keyword-picks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ tool_id: toolId, keyword, unmark: true }),
      })
      if (!res.ok) throw new Error('되돌리기 실패')
      loadPicks()
      showToast('↩️ 미사용으로 되돌림')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const handleMarkUsed = async (item) => {
    const title = window.prompt('이 키워드를 사용한 글 제목을 입력하세요')
    if (!title) return
    const slug = window.prompt('슬러그 (선택, 비워도 됩니다)') || ''
    try {
      const res = await fetch('/api/tools/keyword-picks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ tool_id: item.tool_id, keyword: item.keyword, used_in_title: title, used_in_slug: slug }),
      })
      if (!res.ok) throw new Error('처리 실패')
      loadPicks()
      showToast('✅ 사용 처리됨')
    } catch (e) { showToast(`❌ 오류: ${e.message}`) }
  }

  const labelMap = Object.fromEntries(BASE_TOOLS.map(t => [t.hint, t.label]))

  const allRows = [...hintList]
    .sort((a, b) => a.hint.localeCompare(b.hint, 'ko'))
    .map(h => ({ ...h, label: labelMap[h.hint] || h.hint }))

  const pendingPicks = picks.filter(p => !p.used_at)
  const usedPicks = picks.filter(p => p.used_at)
    .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())

  const S = {
    th: { fontSize: 12, color: '#71717a', fontWeight: 600, padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #2a2a2a' },
    td: { fontSize: 13, color: '#d4d4d8', padding: '8px 10px', borderBottom: '1px solid #18181b' },
    tdNum: { fontSize: 13, color: '#f0f0f0', fontWeight: 700, padding: '8px 10px', borderBottom: '1px solid #18181b', textAlign: 'right' },
  }

  return (
    <div style={{ padding: 28, fontFamily: "'Outfit', sans-serif", maxWidth: 780 }}>
      <h2 style={{ color: '#f0f0f0', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🔍 키워드 검색량 관리</h2>
      <p style={{ color: '#71717a', fontSize: 13, marginBottom: 20 }}>키워드를 입력하면 네이버 연관 키워드 전체를 수집해서 아래 목록에 추가합니다.</p>

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['top', '📊 수집 현황'],
          ['all', '📈 전체 순위'],
          ['golden', '🏆 황금키워드'],
          ['picks', '⭐ 찜한 키워드'],
          ['used', '✅ 사용 키워드'],
          ['ideas', '💡 아이디어 제안'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => handleTabChange(id)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === id ? '#e63946' : '#27272a',
            color: tab === id ? '#fff' : '#a1a1aa',
            fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
          }}>{label}</button>
        ))}
      </div>

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
                    <button onClick={e => { e.stopPropagation(); handleUpdateByHint(row.hint) }} disabled={isLoading} style={{
                      background: needsUpdate ? '#e63946' : '#27272a',
                      color: needsUpdate ? '#fff' : '#a1a1aa',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontSize: 13, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                      opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap',
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      {isLoading ? '수집 중...' : '업데이트'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'delete', hint: row.hint }) }} style={{
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
                  <th style={{ ...S.th, textAlign: 'right' }}>문서수</th>
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

      {tab === 'all' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[100, 200, 500, 1000].map(n => (
              <button key={n} onClick={() => handleLimitChange(n)} style={{
                padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: allKwLimit === n ? '#e63946' : '#27272a',
                color: allKwLimit === n ? '#fff' : '#a1a1aa',
                fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
              }}>{n}개</button>
            ))}
            <span style={{ fontSize: 12, color: '#52525b', alignSelf: 'center', marginLeft: 8 }}>
              현재 {allKeywords.length.toLocaleString()}개 표시
            </span>
          </div>
          {allKwLoading ? (
            <div style={{ color: '#71717a', fontSize: 13, padding: 20, textAlign: 'center' }}>로딩 중...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>순위</th>
                  <th style={S.th}>그룹</th>
                  <th style={S.th}>키워드</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>PC</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>모바일</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>문서수</th>
                  <th style={S.th}>경쟁</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>찜</th>
                </tr>
              </thead>
              <tbody>
                {allKeywords.map((item, i) => {
                  const isPicked = picks.some(p => p.keyword === item.keyword && p.tool_id === item.hint)
                  return (
                    <tr key={`${item.hint}-${item.keyword}`} style={{ background: isPicked ? '#1a1a00' : 'transparent' }}>
                      <td style={{ ...S.td, color: '#52525b' }}>{i + 1}</td>
                      <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{item.hint}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#f0f0f0' }}>{item.keyword}</td>
                      <td style={S.tdNum}>{fmt(item.pc)}</td>
                      <td style={S.tdNum}>{fmt(item.mobile)}</td>
                      <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{item.competition || '-'}</td>
                      <td style={{ ...S.tdNum, fontSize: 12, color: '#71717a' }}>{item.doc_count != null ? fmt(item.doc_count) : '-'}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <button onClick={() => handlePick(item.hint, { ...item, picked: isPicked })} style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                        }}>
                          {isPicked ? '⭐' : '☆'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'golden' && (
        <div>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12, lineHeight: 1.6 }}>
            검색량은 높고 경쟁은 낮은 키워드를 그룹(도구) 구분 없이 전체에서 찾아 보여줍니다.
            아래일수록 합계가 낮아지니, <b style={{ color: '#f0f0f0' }}>위쪽일수록 더 좋은 후보</b>예요.
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['낮음', '중간', '높음', 'all'].map(c => (
              <button key={c} onClick={() => handleGoldenCompetitionChange(c)} style={{
                padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: goldenCompetition === c ? '#e63946' : '#27272a',
                color: goldenCompetition === c ? '#fff' : '#a1a1aa',
                fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
              }}>{c === 'all' ? '전체' : '경쟁 ' + c}</button>
            ))}
            <span style={{ fontSize: 12, color: '#52525b', alignSelf: 'center', marginLeft: 8 }}>
              {goldenKeywords.length.toLocaleString()}개 표시
            </span>
          </div>
          {goldenLoading ? (
            <div style={{ color: '#71717a', fontSize: 13, padding: 20, textAlign: 'center' }}>로딩 중...</div>
          ) : goldenKeywords.length === 0 ? (
            <div style={{ color: '#52525b', fontSize: 14, padding: 20, textAlign: 'center' }}>
              이 경쟁도에 해당하는 키워드가 없어요.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>순위</th>
                  <th style={S.th}>그룹</th>
                  <th style={S.th}>키워드</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>PC</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>모바일</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>문서수</th>
                  <th style={S.th}>경쟁</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>찜</th>
                </tr>
              </thead>
              <tbody>
                {goldenKeywords.map((item, i) => {
                  const isPicked = picks.some(p => p.keyword === item.keyword && p.tool_id === item.hint)
                  return (
                    <tr key={`${item.hint}-${item.keyword}`} style={{ background: isPicked ? '#1a1a00' : 'transparent' }}>
                      <td style={{ ...S.td, color: '#52525b' }}>{i + 1}</td>
                      <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{item.hint}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#f0f0f0' }}>{item.keyword}</td>
                      <td style={S.tdNum}>{fmt(item.pc)}</td>
                      <td style={S.tdNum}>{fmt(item.mobile)}</td>
                      <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                      <td style={{ ...S.tdNum, fontSize: 12, color: '#71717a' }}>{item.doc_count != null ? fmt(item.doc_count) : '-'}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{item.competition || '-'}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <button onClick={() => handlePick(item.hint, { ...item, picked: isPicked })} style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                        }}>
                          {isPicked ? '⭐' : '☆'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'picks' && (
        <div>
          {picksLoading ? (
            <div style={{ color: '#71717a', fontSize: 13, padding: 20 }}>로딩 중...</div>
          ) : pendingPicks.length === 0 ? (
            <div style={{ color: '#52525b', fontSize: 14, padding: 20, textAlign: 'center' }}>
              아직 쓸 차례를 기다리는 찜 키워드가 없어요.<br/>
              <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>수집 현황 / 전체 순위 / 황금키워드 탭에서 ☆ 버튼으로 찜해두세요!</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>그룹</th>
                  <th style={S.th}>키워드</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>PC</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>모바일</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>문서수</th>
                  <th style={S.th}>경쟁</th>
                  <th style={S.th}>메모</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>사용 처리</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>해제</th>
                </tr>
              </thead>
              <tbody>
                {pendingPicks.map(item => (
                  <tr key={`${item.tool_id}-${item.keyword}`}>
                    <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{item.tool_id}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#f0f0f0' }}>{item.keyword}</td>
                    <td style={S.tdNum}>{fmt(item.pc)}</td>
                    <td style={S.tdNum}>{fmt(item.mobile)}</td>
                    <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>{item.competition || '-'}</td>
                    <td style={{ ...S.td, fontSize: 12, color: '#a1a1aa', maxWidth: 200 }}>{item.memo || '-'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <button onClick={() => handleMarkUsed(item)} style={{
                        background: '#16a34a22', border: '1px solid #16a34a55', color: '#4ade80',
                        borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                      }}>✅ 사용함</button>
                    </td>
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

      {tab === 'used' && (
        <div>
          {picksLoading ? (
            <div style={{ color: '#71717a', fontSize: 13, padding: 20 }}>로딩 중...</div>
          ) : usedPicks.length === 0 ? (
            <div style={{ color: '#52525b', fontSize: 14, padding: 20, textAlign: 'center' }}>
              아직 사용 처리된 키워드가 없어요.<br/>
              <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>찜한 키워드 탭의 "✅ 사용함" 버튼으로 기록해두세요!</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>사용일</th>
                  <th style={S.th}>그룹</th>
                  <th style={S.th}>키워드</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>합계</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>문서수</th>
                  <th style={S.th}>사용한 글</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>되돌리기</th>
                </tr>
              </thead>
              <tbody>
                {usedPicks.map(item => (
                  <tr key={`${item.tool_id}-${item.keyword}`}>
                    <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{formatDate(item.used_at)}</td>
                    <td style={{ ...S.td, fontSize: 12, color: '#71717a' }}>{item.tool_id}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#f0f0f0' }}>{item.keyword}</td>
                    <td style={{ ...S.tdNum, color: '#e63946' }}>{fmt(item.total)}</td>
                    <td style={{ ...S.td, fontSize: 13, color: '#d4d4d8' }}>
                      {item.used_in_title || '-'}
                      {item.used_in_slug && (
                        <div style={{ fontSize: 11, color: '#52525b' }}>/blog/{item.used_in_slug}</div>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <button onClick={() => handleUnmarkUsed(item.tool_id, item.keyword)} style={{
                        background: 'none', border: '1px solid #3f3f46', color: '#a1a1aa',
                        borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                      }}>↩️ 되돌리기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
        }} onClick={() => setConfirmDelete(null)}>
          <div style={{
            background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 12,
            padding: 28, width: 320, fontFamily: "'Outfit', sans-serif",
          }} onClick={e => e.stopPropagation()}>
            {confirmDelete.type === 'duplicate' ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 10 }}>⚠️ 이미 있는 키워드</div>
                <div style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20 }}>
                  <b style={{ color: '#e63946' }}>"{confirmDelete.hint}"</b>는 이미 수집된 키워드예요.<br/>
                  업데이트하려면 해당 항목의 업데이트 버튼을 눌러주세요.
                </div>
                <button onClick={() => setConfirmDelete(null)} style={{
                  width: '100%', background: '#27272a', color: '#f0f0f0', border: 'none',
                  borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}>확인</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 10 }}>🗑 키워드 삭제</div>
                <div style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20 }}>
                  <b style={{ color: '#e63946' }}>"{confirmDelete.hint}"</b> 키워드 데이터를 전부 삭제할까요?
                  <span style={{ fontSize: 12, color: '#52525b', marginTop: 4, display: 'block' }}>삭제 후 복구가 불가능합니다.</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(null)} style={{
                    flex: 1, background: '#27272a', color: '#a1a1aa', border: 'none',
                    borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}>취소</button>
                  <button onClick={async () => {
                    const hint = confirmDelete.hint
                    setConfirmDelete(null)
                    await handleDeleteHint(hint)
                  }} style={{
                    flex: 1, background: '#e63946', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}>삭제</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {tab === 'ideas' && (
        <FeatureIdeasTab token={token} showToast={showToast} />
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
