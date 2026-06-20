import { useState, useEffect } from 'react'
import Head from 'next/head'
import AdminSidebar from '../components/admin/AdminSidebar'
import LegalPanel from '../components/admin/LegalPanel'
import AdsensePanel from '../components/admin/AdsensePanel'
import BlogAdminPanel from '../components/admin/BlogAdminPanel'
import BlogMenuPanel from '../components/admin/BlogMenuPanel'
import ContentLogPanel from '../components/admin/ContentLogPanel'
import KeywordPanel from '../components/admin/KeywordPanel'
import { S, Toggle, Toast } from '../components/admin/AdminUI'

const TAB_LABELS = {
  settings: '🔧 서비스 설정',
  legal: '📜 약관 관리',
  adsense: '📢 광고 관리',
  blog_write: '✍️ 게시판 글쓰기',
  blog_admin: '📝 게시판 관리',
  blog_menu: '📋 게시판 메뉴관리',
  content_log: '🗂️ 발행 기록',
  keyword: '🔍 키워드 관리',
  password: '🔑 비밀번호 변경',
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/settings/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || '비밀번호가 틀렸습니다'); setTimeout(() => setErr(''), 2500) }
      else { sessionStorage.setItem('admin_token', data.token); onLogin(data.token) }
    } catch { setErr('서버 연결 실패') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: 40, width: 360 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: '#e63946', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>▶</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0' }}>Admin</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>DownTools 통합 관리자</p>
        </div>
        <form onSubmit={submit}>
          <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)}
            style={{ ...S.input, borderColor: err ? '#e63946' : '#333', marginBottom: 8 }} />
          {err && <p style={{ color: '#e63946', fontSize: 13, marginBottom: 8 }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ ...S.btn(), width: '100%', marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [adminToken, setAdminToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTabState] = useState('settings')
  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    try { sessionStorage.setItem('admin_active_tab', tab) } catch {}
  }
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [cooldownDur, setCooldownDur] = useState(12)
  const [adsOn, setAdsOn] = useState(true)
  const [saved, setSaved] = useState(false)

  const [terms, setTerms] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [termsEn, setTermsEn] = useState('')
  const [privacyEn, setPrivacyEn] = useState('')

  const [adSlots, setAdSlots] = useState([])

  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    const savedTab = sessionStorage.getItem('admin_active_tab')
    if (savedTab && TAB_LABELS[savedTab]) setActiveTabState(savedTab)
    if (token) { setAuthed(true); setAdminToken(token); loadSettings(token) }
    setLoading(false)
  }, [])

  const loadSettings = async (token) => {
    try {
      const res = await fetch('/api/settings/get', { headers: { 'x-admin-token': token } })
      const data = await res.json()
      if (data.cooldown !== undefined) setCooldownDur(data.cooldown)
      if (data.adsOn !== undefined) setAdsOn(data.adsOn)
      if (data.terms !== undefined) setTerms(data.terms)
      if (data.privacy !== undefined) setPrivacy(data.privacy)
      if (data.termsEn !== undefined && data.termsEn !== null) setTermsEn(data.termsEn)
      if (data.privacyEn !== undefined && data.privacyEn !== null) setPrivacyEn(data.privacyEn)
      if (data.adSlots !== undefined) setAdSlots(data.adSlots)
    } catch {}
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const saveSettings = async () => {
    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ cooldown: cooldownDur, adsOn }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch {}
  }

  const changePw = async () => {
    if (!newPw) { setPwMsg({ ok: false, msg: '새 비밀번호를 입력하세요' }); return }
    if (newPw !== newPwConfirm) { setPwMsg({ ok: false, msg: '비밀번호가 일치하지 않습니다' }); return }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ newPassword: newPw }),
      })
      if (!res.ok) throw new Error()
      setPwMsg({ ok: true, msg: '✅ 비밀번호가 변경되었습니다' })
      setNewPw(''); setNewPwConfirm('')
    } catch { setPwMsg({ ok: false, msg: '변경 실패' }) }
    setTimeout(() => setPwMsg(null), 3000)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_active_tab')
    setAuthed(false)
  }

  if (loading) return null
  if (!authed) return <LoginScreen onLogin={(t) => { setAuthed(true); setAdminToken(t); loadSettings(t) }} />

  return (
    <>
      <Head>
        <title>Admin - DownTools</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0c0c0c', fontFamily: "'Outfit', sans-serif", color: '#f0f0f0', display: 'flex' }}>
        <div style={{
          display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#161616', borderBottom: '1px solid #2a2a2a', padding: '14px 16px',
          alignItems: 'center', justifyContent: 'space-between',
        }} className="admin-mobile-bar">
          <button onClick={() => setMobileNavOpen(true)} style={{ background: 'none', border: 'none', color: '#f0f0f0', fontSize: 20, cursor: 'pointer' }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{TAB_LABELS[activeTab]}</span>
          <span style={{ width: 20 }} />
        </div>

        <style>{`
          @media (max-width: 880px) {
            .admin-desktop-sidebar { display: none !important; }
            .admin-mobile-bar { display: flex !important; }
            .admin-main { padding-top: 64px !important; }
          }
        `}</style>

        <div className="admin-desktop-sidebar">
          <AdminSidebar activeTab={activeTab} onNav={setActiveTab} onLogout={handleLogout} />
        </div>
        <AdminSidebar activeTab={activeTab} onNav={setActiveTab} onLogout={handleLogout}
          mobile open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        <main className="admin-main" style={{ flex: 1, minWidth: 0, padding: '32px 28px 60px' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>

            {activeTab === 'settings' && (
              <div style={S.card}>
                <div style={S.cardTitle}>🔧 서비스 기본 설정</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={S.label}>쿨다운 시간 (초) — 검색/다운로드 후 광고 노출 시간</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" min={0} max={60} value={cooldownDur}
                        onChange={e => setCooldownDur(Number(e.target.value))}
                        style={{ flex: 1 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e63946', minWidth: 40 }}>{cooldownDur}초</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>광고 전체 노출</div>
                      <div style={{ fontSize: 12, color: '#666' }}>OFF 시 사이트 전체 광고 영역이 숨겨집니다</div>
                    </div>
                    <Toggle value={adsOn} onChange={setAdsOn} />
                  </div>
                  <button onClick={saveSettings} style={{ ...S.btn(), alignSelf: 'flex-start' }}>
                    {saved ? '✅ 저장됨' : '저장하기'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'legal' && (
              <LegalPanel adminToken={adminToken}
                terms={terms} privacy={privacy} setTerms={setTerms} setPrivacy={setPrivacy}
                termsEn={termsEn} privacyEn={privacyEn} setTermsEn={setTermsEn} setPrivacyEn={setPrivacyEn}
                onSaved={() => showToast('✅ 저장되었습니다')} />
            )}

            {activeTab === 'adsense' && (
              <AdsensePanel adminToken={adminToken} adSlots={adSlots} setAdSlots={setAdSlots}
                onSaved={() => showToast('✅ 저장되었습니다')} />
            )}

            {(activeTab === 'blog_write' || activeTab === 'blog_admin') && (
              <BlogAdminPanel key={activeTab} adminToken={adminToken} initialView={activeTab === 'blog_write' ? 'write' : 'list'} />
            )}

            {activeTab === 'blog_menu' && (
              <BlogMenuPanel adminToken={adminToken} />
            )}

            {activeTab === 'content_log' && (
              <ContentLogPanel adminToken={adminToken} />
            )}

            {/* ── 키워드 관리 */}
            {activeTab === 'keyword' && (
              <KeywordPanel token={adminToken} />
            )}

            {activeTab === 'password' && (
              <div style={S.card}>
                <div style={S.cardTitle}>🔑 비밀번호 변경</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
                  <div>
                    <label style={S.label}>새 비밀번호</label>
                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={S.input} />
                  </div>
                  <div>
                    <label style={S.label}>새 비밀번호 확인</label>
                    <input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} style={S.input} />
                  </div>
                  {pwMsg && (
                    <p style={{ color: pwMsg.ok ? '#4ade80' : '#e63946', fontSize: 13 }}>{pwMsg.msg}</p>
                  )}
                  <button onClick={changePw} style={{ ...S.btn(), alignSelf: 'flex-start' }}>변경하기</button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <Toast msg={toast} />
    </>
  )
}
