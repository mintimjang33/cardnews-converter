import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const DEFAULT_CATS = ['thumb-down', 'sound-down', 'clock-down', 'voice-down', 'text-down', 'sensor-game', 'general']

const S = {
  page: { minHeight: '100vh', background: '#0c0c0c', fontFamily: "'Outfit', sans-serif", color: '#f0f0f0', paddingBottom: 60 },
  wrap: { maxWidth: 700, margin: '0 auto', padding: '0 20px' },
  card: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 },
  cardSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  input: { background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#f0f0f0', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btn: (color = '#e63946') => ({ background: color, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }),
}

export default function BlogMenu() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [categories, setCategories] = useState([])
  const [newCat, setNewCat] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_token')) {
      setAuthed(true)
      loadCategories()
    }
  }, [])

  const doLogin = async () => {
    const res = await fetch('/api/settings/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    const data = await res.json()
    if (!res.ok) { setPwErr(data.error || '틀렸습니다'); return }
    sessionStorage.setItem('admin_token', data.token)
    setAuthed(true)
    loadCategories()
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/blog/categories', {
        headers: { 'x-admin-token': sessionStorage.getItem('admin_token') || '' },
      })
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {}
  }

  const addCategory = async () => {
    const label = newCat.trim()
    if (!label) return
    if (categories.find(c => c.label === label)) {
      setMsg('❌ 이미 있는 카테고리예요'); setTimeout(() => setMsg(''), 2500); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': sessionStorage.getItem('admin_token') || '' },
        body: JSON.stringify({ label }),
      })
      if (!res.ok) throw new Error()
      setNewCat('')
      setMsg('✅ 추가되었습니다')
      setTimeout(() => setMsg(''), 2500)
      loadCategories()
    } catch { setMsg('❌ 추가 실패'); setTimeout(() => setMsg(''), 2500) }
    setLoading(false)
  }

  const deleteCategory = async (id, label) => {
    if (!confirm(`"${label}" 카테고리를 삭제할까요?`)) return
    try {
      await fetch(`/api/blog/categories?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': sessionStorage.getItem('admin_token') || '' },
      })
      setMsg('✅ 삭제되었습니다')
      setTimeout(() => setMsg(''), 2500)
      loadCategories()
    } catch { setMsg('❌ 삭제 실패'); setTimeout(() => setMsg(''), 2500) }
  }

  if (!authed) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Head><title>블로그 메뉴 관리</title></Head>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: 40, width: 340 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>🔐 관리자 로그인</h2>
        <input type="password" placeholder="비밀번호" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          style={{ ...S.input, width: '100%', marginBottom: 10 }} />
        {pwErr && <p style={{ color: '#e63946', fontSize: 13, marginBottom: 8 }}>{pwErr}</p>}
        <button onClick={doLogin} style={{ ...S.btn(), width: '100%' }}>로그인</button>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Head><title>블로그 메뉴 관리</title></Head>

      {/* 헤더 */}
      <div style={{ background: '#161616', borderBottom: '1px solid #2a2a2a', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/admin" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>← 관리자</Link>
            <span style={{ color: '#333' }}>|</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>📂 블로그 메뉴 관리</span>
          </div>
          <button onClick={() => { sessionStorage.removeItem('admin_token'); setAuthed(false) }}
            style={{ ...S.btn('#333'), padding: '7px 14px', fontSize: 13 }}>로그아웃</button>
        </div>
      </div>

      <div style={{ ...S.wrap, paddingTop: 32 }}>

        {/* 기본 카테고리 안내 */}
        <div style={{ ...S.card, borderColor: '#1e3a2a' }}>
          <div style={S.cardTitle}>📌 기본 카테고리 (삭제 불가)</div>
          <div style={S.cardSub}>사이트별로 자동 생성된 기본 카테고리예요.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEFAULT_CATS.map(cat => (
              <span key={cat} style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: '#1a2a1a', border: '1px solid #2a4a2a', color: '#4ade80',
              }}>{cat}</span>
            ))}
          </div>
        </div>

        {/* 커스텀 카테고리 */}
        <div style={S.card}>
          <div style={S.cardTitle}>📂 커스텀 카테고리</div>
          <div style={S.cardSub}>블로그 글에서 사용할 카테고리를 추가/삭제할 수 있어요.</div>

          {/* 추가 입력 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="새 카테고리 이름 (예: 튜토리얼)"
              style={{ ...S.input, flex: 1 }}
            />
            <button onClick={addCategory} disabled={loading || !newCat.trim()} style={{ ...S.btn(), opacity: !newCat.trim() ? 0.4 : 1 }}>
              + 추가
            </button>
          </div>

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: msg.startsWith('✅') ? '#0a2a0a' : '#2a0a0a',
              color: msg.startsWith('✅') ? '#4ade80' : '#f87171',
            }}>{msg}</div>
          )}

          {/* 카테고리 목록 */}
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#555' }}>
              추가된 커스텀 카테고리가 없습니다
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px 7px 16px', borderRadius: 999,
                  background: '#1f1f1f', border: '1.5px solid #333',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>{cat.label}</span>
                  <button onClick={() => deleteCategory(cat.id, cat.label)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#666', fontSize: 16, lineHeight: 1, padding: '0 2px',
                    display: 'flex', alignItems: 'center',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e63946'}
                    onMouseLeave={e => e.currentTarget.style.color = '#666'}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 블로그 어드민 바로가기 */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/blog-admin" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: '#161616', border: '1px solid #2a2a2a',
            color: '#888', fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            📝 블로그 어드민으로 →
          </Link>
        </div>
      </div>
    </div>
  )
}
