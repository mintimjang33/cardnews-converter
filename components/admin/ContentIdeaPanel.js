import { useState, useEffect } from 'react'
import { S } from './AdminUI'

const TOOL_OPTIONS = [
  { value: 'thumb-down',    label: '썸네일 다운' },
  { value: 'sound-down',    label: '효과음 다운' },
  { value: 'clock-down',    label: '타이머' },
  { value: 'voice-down',    label: '음성타이핑' },
  { value: 'text-down',     label: '글자수세기' },
  { value: 'cardnews-down', label: '카드뉴스' },
]

const TYPE_LABELS = {
  keyword: { label: '키워드',   color: '#e63946', bg: '#2a0a0b' },
  idea:    { label: '아이디어', color: '#60a5fa', bg: '#0f1f3d' },
  angle:   { label: '각도',     color: '#4ade80', bg: '#052e16' },
  memo:    { label: '메모',     color: '#facc15', bg: '#1c1c00' },
}

const STATUS_LABELS = {
  pending: { label: '미사용', color: '#71717a', bg: '#27272a' },
  used:    { label: '사용됨', color: '#4ade80', bg: '#052e16' },
}

const ACCENT = '#e63946'

function Badge({ type }) {
  const t = TYPE_LABELS[type] || { label: type, color: '#888', bg: '#222' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: t.bg, color: t.color }}>
      {t.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── 탭 관리 모달 ──────────────────────────────────────────────────────
function TabManagerModal({ tabs, onClose, onSave }) {
  const [localTabs, setLocalTabs] = useState(tabs.map(t => ({ ...t })))
  const [newLabel, setNewLabel] = useState('')

  const addTab = () => {
    const label = newLabel.trim()
    if (!label) return
    setLocalTabs(prev => [...prev, { id: 'tab_' + Date.now(), label, icon: '📌' }])
    setNewLabel('')
  }
  const removeTab = (id) => setLocalTabs(prev => prev.filter(t => t.id !== id))
  const updateLabel = (id, label) => setLocalTabs(prev => prev.map(t => t.id === id ? { ...t, label } : t))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 28, width: 420, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#f0f0f0' }}>탭 관리</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTab()}
            placeholder="새 탭 이름" style={{ ...S.input, flex: 1 }} />
          <button onClick={addTab} style={{ ...S.btn(), padding: '10px 16px', whiteSpace: 'nowrap' }}>+ 추가</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {localTabs.map(tab => (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <input value={tab.label} onChange={e => updateLabel(tab.id, e.target.value)}
                style={{ ...S.input, flex: 1, padding: '6px 10px', fontSize: 13 }} />
              <button onClick={() => removeTab(tab.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...S.btnGhost }}>취소</button>
          <button onClick={() => onSave(localTabs)} style={{ ...S.btn() }}>저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 아이디어 추가 모달 ──────────────────────────────────────────────────
function AddIdeaModal({ tabs, defaultTabId, onClose, onSave }) {
  const [form, setForm] = useState({
    tab_id: defaultTabId || (tabs[0]?.id || ''),
    tool_id: '',
    type: 'idea',
    content: '',
    keyword: '',
    memo: '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 28, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#f0f0f0' }}>아이디어 / 키워드 추가</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={S.label}>탭</label>
            <select value={form.tab_id} onChange={e => set('tab_id', e.target.value)} style={{ ...S.input }}>
              {tabs.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>종류</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => set('type', k)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: form.type === k ? v.bg : '#1f1f1f',
                  color: form.type === k ? v.color : '#666',
                  outline: form.type === k ? `1px solid ${v.color}` : 'none',
                }}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>도구 (선택)</label>
            <select value={form.tool_id} onChange={e => set('tool_id', e.target.value)} style={{ ...S.input }}>
              <option value="">전체 공통</option>
              {TOOL_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>내용 *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="아이디어나 키워드를 입력하세요" rows={3} style={{ ...S.textarea }} />
          </div>
          {form.type === 'keyword' && (
            <div>
              <label style={S.label}>정확한 키워드명</label>
              <input value={form.keyword} onChange={e => set('keyword', e.target.value)}
                style={{ ...S.input }} placeholder="예: 유튜브 썸네일 다운로드" />
            </div>
          )}
          <div>
            <label style={S.label}>메모 (선택)</label>
            <input value={form.memo} onChange={e => set('memo', e.target.value)} style={{ ...S.input }} placeholder="추가 메모" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...S.btnGhost }}>취소</button>
          <button onClick={() => { if (form.content.trim()) onSave(form) }}
            disabled={!form.content.trim()}
            style={{ ...S.btn(), opacity: form.content.trim() ? 1 : 0.4 }}>저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 패널 ──────────────────────────────────────────────────────────
export default function ContentIdeaPanel({ adminToken }) {
  const [tabs, setTabs] = useState([
    { id: 'general',  icon: '💡', label: '공통 아이디어' },
    { id: 'tool',     icon: '🛠️', label: '도구별 글감' },
    { id: 'keyword',  icon: '🔑', label: '키워드 후보' },
    { id: 'schedule', icon: '📅', label: '작성 예정' },
  ])
  const [activeTab, setActiveTab] = useState('general')
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTabMgr, setShowTabMgr] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [filterTool, setFilterTool] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/content-ideas', { headers: { 'x-admin-token': adminToken } })
      const data = await res.json()
      if (Array.isArray(data.ideas)) setIdeas(data.ideas)
      if (Array.isArray(data.tabs)) setTabs(data.tabs)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveTabs = async (newTabs) => {
    setTabs(newTabs)
    setShowTabMgr(false)
    await fetch('/api/admin/content-ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ action: 'save_tabs', tabs: newTabs }),
    })
    if (!newTabs.find(t => t.id === activeTab)) setActiveTab(newTabs[0]?.id || '')
    showToast('탭 저장됨')
  }

  const addIdea = async (form) => {
    setShowAdd(false)
    const res = await fetch('/api/admin/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify(form),
    })
    if (res.ok) { showToast('✅ 추가됨'); load() }
  }

  const toggleStatus = async (id, current) => {
    const next = current === 'used' ? 'pending' : 'used'
    await fetch('/api/admin/content-ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ action: 'update_status', id, status: next }),
    })
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
  }

  const deleteIdea = async (id) => {
    if (!confirm('삭제할까요?')) return
    await fetch('/api/admin/content-ideas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ id }),
    })
    setIdeas(prev => prev.filter(i => i.id !== id))
    showToast('삭제됨')
  }

  const currentTab = tabs.find(t => t.id === activeTab)
  const visibleIdeas = ideas.filter(i => {
    if (i.tab_id !== activeTab) return false
    if (filterTool && i.tool_id !== filterTool) return false
    if (filterType && i.type !== filterType) return false
    if (filterStatus === 'pending' && i.status === 'used') return false
    if (filterStatus === 'used' && i.status !== 'used') return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0' }}>💡 글감 관리</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTabMgr(true)} style={{ ...S.btnGhost, padding: '8px 14px', fontSize: 13 }}>탭 관리</button>
          <button onClick={() => setShowAdd(true)} style={{ ...S.btn(), padding: '8px 16px', fontSize: 13 }}>+ 추가</button>
        </div>
      </div>

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid #2a2a2a' }}>
        {tabs.map(tab => {
          const cnt = ideas.filter(i => i.tab_id === tab.id && i.status !== 'used').length
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: isActive ? ACCENT : '#888',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {cnt > 0 && (
                <span style={{ fontSize: 11, background: '#e6394622', color: ACCENT, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterTool} onChange={e => setFilterTool(e.target.value)}
          style={{ ...S.input, width: 'auto', padding: '7px 12px', fontSize: 13 }}>
          <option value="">전체 도구</option>
          {TOOL_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ ...S.input, width: 'auto', padding: '7px 12px', fontSize: 13 }}>
          <option value="">전체 종류</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...S.input, width: 'auto', padding: '7px 12px', fontSize: 13 }}>
          <option value="">전체</option>
          <option value="pending">미사용</option>
          <option value="used">사용됨</option>
        </select>
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ color: '#555', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>불러오는 중...</div>
      ) : visibleIdeas.length === 0 ? (
        <div style={{ color: '#444', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {currentTab ? `${currentTab.icon} ${currentTab.label}` : '이 탭'}에 아이디어가 없습니다.
          <br /><br />
          <button onClick={() => setShowAdd(true)} style={{ ...S.btn(), fontSize: 13 }}>+ 첫 아이디어 추가하기</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleIdeas.map(idea => (
            <div key={idea.id} style={{
              background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10,
              padding: '14px 16px', opacity: idea.status === 'used' ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <Badge type={idea.type} />
                    {idea.tool_id && (
                      <span style={{ fontSize: 11, color: '#666', background: '#222', padding: '2px 7px', borderRadius: 5 }}>
                        {TOOL_OPTIONS.find(t => t.value === idea.tool_id)?.label || idea.tool_id}
                      </span>
                    )}
                    <StatusBadge status={idea.status} />
                    <span style={{ fontSize: 11, color: '#444', marginLeft: 'auto' }}>{fmtDate(idea.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#e0e0e0', lineHeight: 1.5, wordBreak: 'break-word' }}>{idea.content}</div>
                  {idea.keyword && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>🔑 {idea.keyword}</div>}
                  {idea.memo && <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' }}>📝 {idea.memo}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleStatus(idea.id, idea.status)}
                    title={idea.status === 'used' ? '미사용으로' : '사용 처리'}
                    style={{ background: 'none', border: '1px solid #333', borderRadius: 7, color: '#888', cursor: 'pointer', padding: '5px 9px', fontSize: 14 }}>
                    {idea.status === 'used' ? '↩' : '✓'}
                  </button>
                  <button onClick={() => deleteIdea(idea.id)} title="삭제"
                    style={{ background: 'none', border: '1px solid #333', borderRadius: 7, color: '#555', cursor: 'pointer', padding: '5px 9px', fontSize: 14 }}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTabMgr && <TabManagerModal tabs={tabs} onClose={() => setShowTabMgr(false)} onSave={saveTabs} />}
      {showAdd && <AddIdeaModal tabs={tabs} defaultTabId={activeTab} onClose={() => setShowAdd(false)} onSave={addIdea} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1f1f1f', border: '1px solid #333', borderRadius: 10,
          padding: '12px 22px', fontSize: 14, color: '#f0f0f0', zIndex: 9999,
        }}>{toast}</div>
      )}
    </div>
  )
}
