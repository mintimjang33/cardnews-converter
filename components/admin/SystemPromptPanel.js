import { useState, useEffect, useCallback, useRef } from 'react'
import { S, Toast } from './AdminUI'

const TABS = [
  { id: 'main', label: '📘 본 지침' },
  { id: 'main2', label: '📗 보조 지침' },
  { id: 'reference', label: '📎 글쓰기 참고자료' },
  { id: 'rss_sources', label: '📡 정보 소스(RSS)' },
]

export default function SystemPromptPanel({ adminToken }) {
  const [tab, setTab]             = useState('main')
  const [content, setContent]     = useState('')
  const [original, setOriginal]   = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [copied, setCopied]       = useState(false)
  const fileInputRef = useRef(null)

  const token = () => adminToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_token') : '')

  const load = useCallback(async (targetTab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/system-prompt?id=${targetTab}`, {
        headers: { 'x-admin-token': token() },
      })
      if (res.ok) {
        const data = await res.json()
        setContent(data.content || '')
        setOriginal(data.content || '')
        setUpdatedAt(data.updated_at || '')
      }
    } catch { /* 무시 */ }
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [load, tab])

  const switchTab = (nextTab) => {
    if (nextTab === tab) return
    if (content !== original && !confirm('저장하지 않은 변경사항이 있어요. 탭을 바꾸면 사라져요. 계속할까요?')) return
    setTab(nextTab)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token() },
        body: JSON.stringify({ id: tab, content }),
      })
      if (!res.ok) throw new Error()
      setOriginal(content)
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
      setUpdatedAt(kst)
      setMsg('✅ 저장됐어요!')
    } catch {
      setMsg('❌ 저장 실패')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 2500)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadMd = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'system-prompt.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onFilePicked = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setContent(ev.target.result || '')
      setMsg('📁 파일 불러왔어요 — 내용 확인 후 저장을 눌러주세요')
      setTimeout(() => setMsg(''), 3000)
    }
    reader.onerror = () => {
      setMsg('❌ 파일을 읽지 못했어요')
      setTimeout(() => setMsg(''), 2500)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const isDirty = content !== original
  const charCount = content.length
  const lineCount = content.split('\n').length

  const fmtDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    } catch { return iso }
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 탭 전환 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: tab === t.id ? '1px solid #e63946' : '1px solid #2a2a2a',
              background: tab === t.id ? '#e6394622' : '#1f1f1f',
              color: tab === t.id ? '#e63946' : '#888',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 헤더 카드 */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={S.cardTitle}>🤖 Claude 시스템 프롬프트</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              Claude 프로젝트 Instructions에 붙여넣을 지침을 여기서 관리해요.<br />
              MCP <code style={{ background: '#2a2a2a', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>get_system_prompt</code> 툴로 Claude가 직접 불러갈 수 있어요.
              {tab === 'reference' && <><br /><b style={{ color: '#f0f0f0' }}>이 탭은 규칙이 아니라 참고용 예시 모음이에요</b> — Claude가 매 대화 자동으로 불러오진 않고, 명시적으로 요청했을 때만 봐요.</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {updatedAt && (
              <span style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>
                마지막 저장: {fmtDate(updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* 통계 바 */}
        {!loading && (
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: '글자수', value: charCount.toLocaleString() },
              { label: '줄수',   value: lineCount.toLocaleString() },
              { label: '상태',   value: isDirty ? '⚠️ 미저장' : '✅ 저장됨', color: isDirty ? '#f59e0b' : '#4ade80' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#1f1f1f', borderRadius: 8, padding: '8px 14px', minWidth: 90 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: color || '#f0f0f0' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 편집기 카드 */}
      <div style={S.card}>
        {loading ? (
          <div style={{ color: '#666', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>불러오는 중...</div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{
                ...S.textarea,
                minHeight: 520,
                fontSize: 13,
                lineHeight: 1.75,
                fontFamily: "'Fira Mono', 'Consolas', monospace",
              }}
              placeholder="Claude 프로젝트 지침(마크다운)을 여기에 붙여넣거나 직접 작성하세요..."
              spellCheck={false}
            />

            {/* 액션 버튼 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button
                onClick={save}
                disabled={saving || !isDirty}
                style={{
                  ...S.btn(),
                  opacity: (saving || !isDirty) ? 0.45 : 1,
                  cursor: (saving || !isDirty) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '저장 중...' : '💾 저장'}
              </button>

              <button onClick={() => fileInputRef.current?.click()} style={S.btnGhost}>
                📁 파일 업로드
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={onFilePicked}
                style={{ display: 'none' }}
              />
              <button onClick={copyAll} style={S.btnGhost}>
                {copied ? '✅ 복사됨!' : '📋 전체 복사'}
              </button>
              <button onClick={downloadMd} style={S.btnGhost}>
                ⬇️ MD 다운로드
              </button>

              {isDirty && (
                <button
                  onClick={() => setContent(original)}
                  style={{ ...S.btnGhost, color: '#e63946', borderColor: '#e63946' }}
                >
                  ↩ 되돌리기
                </button>
              )}
            </div>

            {msg && (
              <div style={{
                marginTop: 12, fontSize: 13, fontWeight: 600,
                color: msg.startsWith('✅') ? '#4ade80' : '#e63946',
              }}>{msg}</div>
            )}
          </>
        )}
      </div>

      {/* 사용 안내 카드 */}
      <div style={{ ...S.card, background: '#111' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 12 }}>💡 사용 방법</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>① 위 편집기에서 지침을 수정하고 <b style={{ color: '#f0f0f0' }}>💾 저장</b>을 누르세요.</span>
          <span>② Claude 프로젝트 Instructions에는 아래 한 줄만 남겨두세요:</span>
          <code style={{
            display: 'block', background: '#1f1f1f', border: '1px solid #2a2a2a',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#a5f3fc',
            marginTop: 4, marginBottom: 4, lineHeight: 1.6,
          }}>
            대화를 시작하면 즉시 get_system_prompt 툴을 호출해서 전체 지침을 로드하고, 그 지침대로만 행동하세요.
          </code>
          <span>③ MCP 커넥터가 연결된 Claude는 대화 시작 시 자동으로 지침(본 지침/보조 지침)을 불러와요. <b style={{ color: '#f0f0f0' }}>글쓰기 참고자료</b> 탭은 규칙이 아니라 예시 모음이라 자동으로는 안 불러오고, 필요할 때만 명시적으로 불러와요.</span>
          <span>④ <b style={{ color: '#f0f0f0' }}>📋 전체 복사</b>로 복사해서 Claude 프로젝트 Instructions에 직접 붙여넣는 것도 가능해요.</span>
        </div>
      </div>

      <Toast msg="" />
    </div>
  )
}
