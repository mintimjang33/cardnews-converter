import { useState, useEffect, useCallback } from 'react'
import { S, Toast } from './AdminUI'

const ACCENT = '#e63946'

const GROUP_ICONS = {
  '핵심 블로그 자동화': '✍️',
  '키워드·SEO':         '🔍',
  '광고·수익화':         '💰',
  'Supabase 직접 조회·수정': '🗄️',
  '기타':                '🔧',
}

function AddServerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', url: '', description: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim() && form.url.trim()
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:14, padding:28, width:480, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:20, color:'#f0f0f0' }}>🖥️ MCP 서버 추가</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={S.label}>서버 이름 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              style={S.input} placeholder="예: DownTools-Mcp" />
          </div>
          <div>
            <label style={S.label}>MCP URL *</label>
            <input value={form.url} onChange={e => set('url', e.target.value)}
              style={S.input} placeholder="https://example.vercel.app/api/mcp" />
          </div>
          <div>
            <label style={S.label}>설명</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              style={S.input} placeholder="서버 설명" />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>취소</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            style={{ ...S.btn(), opacity: valid ? 1 : 0.4 }}>등록</button>
        </div>
      </div>
    </div>
  )
}

function EditServerModal({ server, onClose, onSave }) {
  const [form, setForm] = useState({ name: server.name || '', url: server.url || '', description: server.description || '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim() && form.url.trim()
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:14, padding:28, width:480, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:20, color:'#f0f0f0' }}>✏️ MCP 서버 수정</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={S.label}>서버 이름 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>MCP URL *</label>
            <input value={form.url} onChange={e => set('url', e.target.value)}
              style={{ ...S.input, fontFamily:'monospace' }} placeholder="https://example.vercel.app/api/mcp?key=..." />
            <div style={{ fontSize:11, color:'#666', marginTop:4 }}>인증이 필요한 서버라면 URL 끝에 ?key=공유비밀키 를 포함해주세요.</div>
          </div>
          <div>
            <label style={S.label}>설명</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} style={S.input} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>취소</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            style={{ ...S.btn(), opacity: valid ? 1 : 0.4 }}>저장</button>
        </div>
      </div>
    </div>
  )
}

function AddToolModal({ serverId, groups, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', group_name: groups[0] || '기타', description: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim()
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:14, padding:28, width:480, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:20, color:'#f0f0f0' }}>🔧 툴 추가</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={S.label}>그룹 *</label>
            <select value={form.group_name} onChange={e => set('group_name', e.target.value)} style={S.input}>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="기타">기타</option>
            </select>
          </div>
          <div>
            <label style={S.label}>툴 이름 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              style={{ ...S.input, fontFamily:'monospace' }} placeholder="예: get_publish_log" />
          </div>
          <div>
            <label style={S.label}>설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} style={S.textarea} placeholder="이 툴이 하는 일을 설명해주세요" />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>취소</button>
          <button onClick={() => valid && onSave({ ...form, server_id: serverId })} disabled={!valid}
            style={{ ...S.btn(), opacity: valid ? 1 : 0.4 }}>등록</button>
        </div>
      </div>
    </div>
  )
}

export default function McpPanel({ adminToken }) {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedServer, setExpandedServer] = useState(null)
  const [expandedGroup, setExpandedGroup] = useState({})
  const [showAddServer, setShowAddServer] = useState(false)
  const [addToolFor, setAddToolFor] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mcps', { headers: { 'x-admin-token': adminToken } })
      const data = await res.json()
      if (Array.isArray(data.servers)) {
        setServers(data.servers)
        if (data.servers.length > 0) setExpandedServer(data.servers[0].id)
      }
    } catch {}
    setLoading(false)
  }, [adminToken])

  useEffect(() => { load() }, [load])

  const addServer = async (form) => {
    setShowAddServer(false)
    const res = await fetch('/api/admin/mcps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ type: 'server', ...form }),
    })
    if (res.ok) { showToast('✅ 서버 등록됨'); load() }
  }

  const addTool = async (form) => {
    setAddToolFor(null)
    const res = await fetch('/api/admin/mcps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ type: 'tool', ...form }),
    })
    if (res.ok) { showToast('✅ 툴 등록됨'); load() }
  }

  const [syncingId, setSyncingId] = useState(null)
  const [editingServer, setEditingServer] = useState(null)

  const updateServer = async (form) => {
    const id = editingServer.id
    setEditingServer(null)
    const res = await fetch('/api/admin/mcps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ type: 'update_server', id, ...form }),
    })
    if (res.ok) { showToast('✅ 서버 정보 수정됨'); load() }
    else showToast('❌ 수정 실패')
  }

  const syncServer = async (id) => {
    setSyncingId(id)
    try {
      const res = await fetch('/api/admin/mcps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ type: 'sync', server_id: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(`❌ ${data.error || '동기화 실패'}`)
      } else {
        const parts = [`✅ 동기화 완료 — 총 ${data.total}개`]
        if (data.added) parts.push(`신규 ${data.added}개`)
        if (data.updated) parts.push(`갱신 ${data.updated}개`)
        if (data.missing?.length) parts.push(`⚠️ 서버에서 사라짐: ${data.missing.join(', ')}`)
        showToast(parts.join(' · '))
        load()
      }
    } catch {
      showToast('❌ 동기화 실패 — 네트워크 오류')
    }
    setSyncingId(null)
  }

  const deleteServer = async (id) => {
    if (!confirm('서버와 소속 툴이 모두 삭제됩니다. 계속할까요?')) return
    await fetch('/api/admin/mcps', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ type: 'server', id }),
    })
    setServers(prev => prev.filter(s => s.id !== id))
    showToast('삭제됨')
  }

  const deleteTool = async (serverId, toolId) => {
    if (!confirm('툴을 삭제할까요?')) return
    await fetch('/api/admin/mcps', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ type: 'tool', id: toolId }),
    })
    setServers(prev => prev.map(s => s.id === serverId
      ? { ...s, tools: s.tools.filter(t => t.id !== toolId) }
      : s
    ))
    showToast('툴 삭제됨')
  }

  const copyUrl = (url) => {
    navigator.clipboard?.writeText(url).then(() => showToast('URL 복사됨'))
  }

  const toggleGroup = (serverId, groupName) => {
    const key = `${serverId}__${groupName}`
    setExpandedGroup(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isGroupOpen = (serverId, groupName) => {
    const key = `${serverId}__${groupName}`
    return expandedGroup[key] !== false // 기본 열림
  }

  const totalTools = servers.reduce((a, s) => a + (s.tools?.length || 0), 0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:'#f0f0f0' }}>🔌 MCP 관리</div>
          <div style={{ fontSize:12, color:'#888', marginTop:3 }}>
            서버 <span style={{ color:ACCENT, fontWeight:700 }}>{servers.length}개</span>
            {' · '}툴 <span style={{ color:ACCENT, fontWeight:700 }}>{totalTools}개</span>
          </div>
        </div>
        <button onClick={() => setShowAddServer(true)} style={{ ...S.btn(), padding:'8px 16px', fontSize:13 }}>+ 서버 추가</button>
      </div>

      {loading ? (
        <div style={{ color:'#888', textAlign:'center', padding:'40px 0' }}>불러오는 중...</div>
      ) : servers.length === 0 ? (
        <div style={{ color:'#666', textAlign:'center', padding:'60px 0' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔌</div>
          <div style={{ marginBottom:16 }}>등록된 MCP 서버가 없어요</div>
          <button onClick={() => setShowAddServer(true)} style={{ ...S.btn(), fontSize:13 }}>+ 서버 추가하기</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {servers.map(s => {
            const grouped = (s.tools || []).reduce((acc, t) => {
              const g = t.group_name || '기타'
              if (!acc[g]) acc[g] = []
              acc[g].push(t)
              return acc
            }, {})
            const groupNames = Object.keys(grouped)
            const isOpen = expandedServer === s.id

            return (
              <div key={s.id} style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:12, overflow:'hidden' }}>

                <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10, background:'#1f1f1f', borderBottom: isOpen ? '1px solid #2a2a2a' : 'none', cursor:'pointer' }}
                  onClick={() => setExpandedServer(isOpen ? null : s.id)}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'#f0f0f0' }}>{s.name}</span>
                      <span style={{ fontSize:11, color:'#888', background:'#2a2a2a', borderRadius:6, padding:'1px 8px' }}>
                        {groupNames.length}개 그룹 · {s.tools?.length || 0}개 툴
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'#666', marginTop:3, fontFamily:'monospace' }}>{s.url}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); copyUrl(s.url) }}
                    style={{ background:'none', border:'1px solid #333', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#4ade80', cursor:'pointer', fontWeight:700, flexShrink:0 }}>
                    URL 복사
                  </button>
                  <button onClick={e => { e.stopPropagation(); setEditingServer(s) }}
                    style={{ background:'none', border:'1px solid #333', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#888', cursor:'pointer', fontWeight:700, flexShrink:0 }}>
                    ✏️ 수정
                  </button>
                  <button onClick={e => { e.stopPropagation(); syncServer(s.id) }} disabled={syncingId === s.id}
                    style={{ background:'none', border:'1px solid #1e3a5f', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#60a5fa', cursor: syncingId === s.id ? 'default' : 'pointer', fontWeight:700, flexShrink:0, opacity: syncingId === s.id ? 0.6 : 1 }}>
                    {syncingId === s.id ? '동기화 중…' : '🔄 동기화'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteServer(s.id) }}
                    style={{ background:'none', border:'1px solid #7f1d1d', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#f87171', cursor:'pointer', fontWeight:700, flexShrink:0 }}>
                    삭제
                  </button>
                  <span style={{ color:'#666', fontSize:12, flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                    {groupNames.map(gName => {
                      const gTools = grouped[gName]
                      const gOpen = isGroupOpen(s.id, gName)
                      const icon = GROUP_ICONS[gName] || '🔧'
                      return (
                        <div key={gName} style={{ border:'1px solid #2a2a2a', borderRadius:10, overflow:'hidden' }}>
                          <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:8, background:'#1f1f1f', cursor:'pointer' }}
                            onClick={() => toggleGroup(s.id, gName)}>
                            <span style={{ fontSize:15 }}>{icon}</span>
                            <span style={{ fontWeight:700, fontSize:13, color:'#f0f0f0', flex:1 }}>{gName}</span>
                            <span style={{ fontSize:11, color:'#888', background:'#2a2a2a', borderRadius:6, padding:'1px 7px' }}>{gTools.length}개</span>
                            <span style={{ color:'#666', fontSize:11 }}>{gOpen ? '▲' : '▼'}</span>
                          </div>

                          {gOpen && (
                            <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:4 }}>
                              {gTools.map(t => (
                                <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'#161616', border:'1px solid #2a2a2a', borderRadius:7 }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <span style={{ fontWeight:700, fontSize:12, color:'#f0f0f0', fontFamily:'monospace' }}>{t.name}</span>
                                    {t.description && (
                                      <div style={{ fontSize:11, color:'#888', marginTop:2, lineHeight:1.5 }}>{t.description}</div>
                                    )}
                                  </div>
                                  <button onClick={() => deleteTool(s.id, t.id)}
                                    style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:14, flexShrink:0, padding:'0 2px' }}
                                    title="삭제">✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <button onClick={() => setAddToolFor(s.id)}
                      style={{ ...S.btnGhost, padding:'7px 16px', fontSize:12, alignSelf:'flex-start', marginTop:4 }}>
                      + 툴 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddServer && <AddServerModal onClose={() => setShowAddServer(false)} onSave={addServer} />}
      {editingServer && (
        <EditServerModal server={editingServer} onClose={() => setEditingServer(null)} onSave={updateServer} />
      )}
      {addToolFor && (
        <AddToolModal
          serverId={addToolFor}
          groups={Object.keys(GROUP_ICONS)}
          onClose={() => setAddToolFor(null)}
          onSave={addTool}
        />
      )}
      <Toast msg={toast} />
    </div>
  )
}
