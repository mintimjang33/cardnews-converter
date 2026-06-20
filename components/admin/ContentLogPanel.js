import { useState, useEffect, useCallback } from 'react'
import { S, Toast } from './AdminUI'

// 도구 목록 (검색 수요 기준 순서 — 사이트에 새 도구 추가 시 여기에도 추가)
const TOOLS = [
  { id: 'thumb-down',    label: '🖼 썸네일' },
  { id: 'sound-down',    label: '🔊 효과음' },
  { id: 'clock-down',    label: '⏱ 타이머' },
  { id: 'voice-down',    label: '🎤 보이스' },
  { id: 'text-down',     label: '📝 텍스트' },
  { id: 'cardnews-down', label: '📰 카드뉴스' },
]
const toolLabel = (id) => TOOLS.find(t => t.id === id)?.label || id

export default function ContentLogPanel({ adminToken }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTool, setFilterTool] = useState('all')
  const [toast, setToast] = useState('')

  // 수동 추가 폼 (보통은 Claude가 작성해주는 내용을 그대로 붙여넣는 용도)
  const [form, setForm] = useState({ tool: 'cardnews-down', angle: '', title: '', slug: '', memo: '' })
  const [saving, setSaving] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parseMsg, setParseMsg] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  // "도구: thumb-down\n키워드 각도: 다운로드 방법\n제목: ...\n슬러그: ..." 형태의
  // 4줄 텍스트를 붙여넣으면 자동으로 form 칸에 나눠 채워준다.
  const parsePastedLog = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const picked = { tool: '', angle: '', title: '', slug: '', memo: '' }
    const patterns = {
      tool: /^(도구|tool)\s*[:：]\s*(.+)$/i,
      angle: /^(키워드\s*각도|각도|angle)\s*[:：]\s*(.+)$/i,
      title: /^(제목|title)\s*[:：]\s*(.+)$/i,
      slug: /^(슬러그|slug)\s*[:：]\s*(.+)$/i,
      memo: /^(메모|비고|memo)\s*[:：]\s*(.+)$/i,
    }
    lines.forEach(line => {
      for (const key of Object.keys(patterns)) {
        const m = line.match(patterns[key])
        if (m) picked[key] = m[2].trim()
      }
    })
    return picked
  }

  const handlePasteParse = (text) => {
    setPasteText(text)
    if (!text.trim()) { setParseMsg(''); return }
    const picked = parsePastedLog(text)
    const found = Object.entries(picked).filter(([, v]) => v)
    if (found.length === 0) {
      setParseMsg('⚠️ 인식된 항목이 없습니다. "도구: ...", "제목: ..." 형식인지 확인해주세요.')
      return
    }
    setForm(f => ({
      tool: picked.tool ? (TOOLS.find(t => t.id === picked.tool)?.id || picked.tool) : f.tool,
      angle: picked.angle || f.angle,
      title: picked.title || f.title,
      slug: picked.slug || f.slug,
      memo: picked.memo || f.memo,
    }))
    const labels = { tool: '도구', angle: '각도', title: '제목', slug: '슬러그', memo: '메모' }
    setParseMsg(`✅ ${found.map(([k]) => labels[k]).join(', ')} 자동 입력됨 — 아래 내용 확인 후 "기록 추가"를 눌러주세요`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/content-log', { headers: { 'x-admin-token': adminToken } })
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      showToast('❌ 불러오기 실패')
    }
    setLoading(false)
  }, [adminToken])

  useEffect(() => { load() }, [load])

  const addLog = async () => {
    if (!form.tool || !form.angle.trim() || !form.title.trim() || !form.slug.trim()) {
      showToast('⚠️ 도구·키워드 각도·제목·슬러그는 필수입니다'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/content-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm({ tool: form.tool, angle: '', title: '', slug: '', memo: '' })
      setPasteText('')
      setParseMsg('')
      showToast('✅ 기록 추가됨')
      load()
    } catch {
      showToast('❌ 저장 실패')
    }
    setSaving(false)
  }

  const deleteLog = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return
    try {
      const res = await fetch(`/api/admin/content-log?id=${id}`, {
        method: 'DELETE', headers: { 'x-admin-token': adminToken },
      })
      if (!res.ok) throw new Error()
      showToast('🗑 삭제됨')
      load()
    } catch {
      showToast('❌ 삭제 실패')
    }
  }

  const filtered = filterTool === 'all' ? logs : logs.filter(l => l.tool === filterTool)

  return (
    <div>
      <Toast msg={toast} />

      <div style={S.card}>
        <div style={S.cardTitle}>📋 발행 기록 (관리자 전용)</div>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
          공개 블로그에는 노출되지 않는 내부 기록입니다. Claude가 글을 작성할 때마다
          어떤 도구를, 어떤 키워드 각도로 다뤘는지 제목·슬러그와 함께 여기에 남겨두면
          다음 글 작성 시 중복을 피하는 데 사용됩니다. 아래 붙여넣기 칸에 Claude가 준
          4줄(도구/키워드 각도/제목/슬러그)을 그대로 붙여넣으면 자동으로 입력됩니다.
        </p>

        {/* 붙여넣기 자동 입력 */}
        <div style={{ marginBottom: 18 }}>
          <label style={S.label}>📋 Claude가 준 발행 기록 4줄을 여기에 붙여넣으세요</label>
          <textarea
            value={pasteText}
            onChange={e => handlePasteParse(e.target.value)}
            placeholder={'도구: thumb-down\n키워드 각도: 다운로드 방법\n제목: 유튜브 썸네일 무료 다운로드 방법, 가입 없이 3초만에\n슬러그: youtube-thumbnail-download-free'}
            rows={4}
            style={{ ...S.textarea, marginBottom: 6 }}
          />
          {parseMsg && (
            <div style={{ fontSize: 12, color: parseMsg.startsWith('✅') ? '#4ade80' : '#fbbf24' }}>{parseMsg}</div>
          )}
        </div>

        {/* 수동 추가 폼 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>도구</label>
            <select value={form.tool} onChange={e => setForm(f => ({ ...f, tool: e.target.value }))} style={S.input}>
              {TOOLS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>키워드 각도</label>
            <input value={form.angle} onChange={e => setForm(f => ({ ...f, angle: e.target.value }))}
              placeholder="예: 다운로드 방법" style={S.input} />
          </div>
          <div>
            <label style={S.label}>제목</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="글 제목" style={S.input} />
          </div>
          <div>
            <label style={S.label}>슬러그</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="youtube-thumbnail-download" style={S.input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>메모 (선택)</label>
            <input value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="비고" style={S.input} />
          </div>
        </div>
        <button onClick={addLog} disabled={saving} style={{ ...S.btn(), opacity: saving ? 0.6 : 1 }}>
          {saving ? '저장 중...' : '+ 기록 추가'}
        </button>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={S.cardTitle}>📜 기록 목록 ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['all', '전체'], ...TOOLS.map(t => [t.id, t.label])].map(([key, label]) => (
              <button key={key} onClick={() => setFilterTool(key)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: filterTool === key ? 700 : 500,
                  border: `1.5px solid ${filterTool === key ? '#e63946' : '#2a2a2a'}`,
                  background: filterTool === key ? '#2a0a0a' : '#161616',
                  color: filterTool === key ? '#e63946' : '#888', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}>{label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: '#161616', borderRadius: 12, border: '1px solid #2a2a2a', color: '#555' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>아직 기록이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(log => (
              <div key={log.id} style={{ ...S.row, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888', background: '#1f1f1f', borderRadius: 4, padding: '2px 8px', border: '1px solid #2a2a2a' }}>
                      {toolLabel(log.tool)}
                    </span>
                    <span style={{ fontSize: 11, color: '#e63946' }}>{log.angle}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>{log.title}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    /blog/{log.slug}
                    {log.memo && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {log.memo}</span>}
                    <span style={{ marginLeft: 8, opacity: 0.5 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleDateString('ko-KR') : ''}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteLog(log.id)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #7f1d1d', background: '#2a0a0a', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
