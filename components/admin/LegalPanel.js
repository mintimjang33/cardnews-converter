import { useState } from 'react'
import { S } from './AdminUI'

export default function LegalPanel({ adminToken, terms, privacy, setTerms, setPrivacy, onSaved }) {
  const [subtab, setSubtab] = useState('terms')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ terms, privacy }),
      })
      onSaved?.()
    } catch {}
    setSaving(false)
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📜 약관 / 개인정보처리방침 관리</div>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 18 }}>
        본문을 수정하면 <strong>/terms</strong>, <strong>/privacy</strong> 페이지에 그대로 반영됩니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSubtab('terms')} style={{
          ...S.btn(subtab === 'terms' ? '#e63946' : '#1f1f1f'),
          color: subtab === 'terms' ? '#fff' : '#888', padding: '8px 16px', fontSize: 13,
        }}>📜 이용약관</button>
        <button onClick={() => setSubtab('privacy')} style={{
          ...S.btn(subtab === 'privacy' ? '#e63946' : '#1f1f1f'),
          color: subtab === 'privacy' ? '#fff' : '#888', padding: '8px 16px', fontSize: 13,
        }}>🔒 개인정보처리방침</button>
      </div>

      {subtab === 'terms' ? (
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={22}
          placeholder="이용약관 본문을 입력하세요" style={S.textarea} />
      ) : (
        <textarea value={privacy} onChange={e => setPrivacy(e.target.value)} rows={22}
          placeholder="개인정보처리방침 본문을 입력하세요" style={S.textarea} />
      )}

      <button onClick={save} disabled={saving} style={{ ...S.btn(), marginTop: 16, opacity: saving ? 0.6 : 1 }}>
        {saving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}
