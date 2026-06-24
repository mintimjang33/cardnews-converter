import { useState, useEffect, useCallback } from 'react'
import { S, Toast } from './AdminUI'

export default function SystemPromptPanel({ adminToken }) {
  const [content, setContent]     = useState('')
  const [original, setOriginal]   = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [copied, setCopied]       = useState(false)

  const token = () => adminToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_token') : '')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/system-prompt', {
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

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token() },
        body: JSON.stringify({ content }),
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
      {/* 헤더 카드 */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={S.cardTitle}>🤖 Claude 시스템 프롬프트</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              Claude 프로젝트 Instructions에 붙여넣을 지침을 여기서 관리해요.<br />
              MCP <code style={{ background: '#2a2a2a', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>get_system_prompt</code> 툴로 Claude가 직접 불러갈 수 있어요.
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

              <button onClick={copyAll} style={S.btnGhost}>
                {copied ? '✅ 복사됨!' : '📋 전체 복사'}
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
          <span>③ MCP 커넥터가 연결된 Claude는 대화 시작 시 자동으로 지침을 불러와요.</span>
          <span>④ <b style={{ color: '#f0f0f0' }}>📋 전체 복사</b>로 복사해서 Claude 프로젝트 Instructions에 직접 붙여넣는 것도 가능해요.</span>
        </div>
      </div>

      <Toast msg="" />
    </div>
  )
}
