import { useState } from 'react'
import { S } from './AdminUI'

export default function LegalPanel({
  adminToken,
  terms, privacy, setTerms, setPrivacy,
  termsEn, privacyEn, setTermsEn, setPrivacyEn,
  onSaved,
}) {
  const [doc, setDoc] = useState('terms')   // terms | privacy
  const [lang, setLang] = useState('ko')    // ko | en
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ terms, privacy, termsEn, privacyEn }),
      })
      onSaved?.()
    } catch {}
    setSaving(false)
  }

  // 현재 선택된 문서/언어에 해당하는 값과 setter
  const fieldMap = {
    'terms-ko':    { value: terms,     set: setTerms,     placeholder: '이용약관 본문을 입력하세요' },
    'terms-en':    { value: termsEn,   set: setTermsEn,   placeholder: '비워두면 기본 영문 이용약관이 /terms (en) 페이지에 표시됩니다' },
    'privacy-ko':  { value: privacy,   set: setPrivacy,   placeholder: '개인정보처리방침 본문을 입력하세요' },
    'privacy-en':  { value: privacyEn, set: setPrivacyEn, placeholder: '비워두면 기본 영문 개인정보처리방침이 /privacy (en) 페이지에 표시됩니다' },
  }
  const current = fieldMap[`${doc}-${lang}`]

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📜 약관 / 개인정보처리방침 관리</div>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 18 }}>
        본문을 수정하면 <strong>/terms</strong>, <strong>/privacy</strong> 페이지에 언어별로 그대로 반영됩니다.
        영어 본문을 비워두면 기본 제공되는 영문 약관이 표시됩니다.
      </p>

      {/* 문서 종류 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => setDoc('terms')} style={{
          ...S.btn(doc === 'terms' ? '#e63946' : '#1f1f1f'),
          color: doc === 'terms' ? '#fff' : '#888', padding: '8px 16px', fontSize: 13,
        }}>📜 이용약관</button>
        <button onClick={() => setDoc('privacy')} style={{
          ...S.btn(doc === 'privacy' ? '#e63946' : '#1f1f1f'),
          color: doc === 'privacy' ? '#fff' : '#888', padding: '8px 16px', fontSize: 13,
        }}>🔒 개인정보처리방침</button>
      </div>

      {/* 언어 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setLang('ko')} style={{
          ...S.btn(lang === 'ko' ? '#3b82f6' : '#1f1f1f'),
          color: lang === 'ko' ? '#fff' : '#888', padding: '6px 14px', fontSize: 12,
        }}>🇰🇷 한국어</button>
        <button onClick={() => setLang('en')} style={{
          ...S.btn(lang === 'en' ? '#3b82f6' : '#1f1f1f'),
          color: lang === 'en' ? '#fff' : '#888', padding: '6px 14px', fontSize: 12,
        }}>🇺🇸 English</button>
      </div>

      <textarea
        value={current.value}
        onChange={e => current.set(e.target.value)}
        rows={22}
        placeholder={current.placeholder}
        style={S.textarea}
      />

      {lang === 'en' && !current.value?.trim() && (
        <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
          ℹ️ 현재 영문 본문이 비어 있어 기본 영문 약관이 표시되고 있습니다.
        </p>
      )}

      <button onClick={save} disabled={saving} style={{ ...S.btn(), marginTop: 16, opacity: saving ? 0.6 : 1 }}>
        {saving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}
