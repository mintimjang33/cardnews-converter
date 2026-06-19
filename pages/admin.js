import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const BLOG_CATEGORIES = [
  'thumb-down', 'sound-down', 'clock-down', 'voice-down', 'text-down', 'sensor-game', 'general'
]

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 50, height: 28, borderRadius: 14,
      background: value ? '#e63946' : '#333',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, background: '#fff',
        position: 'absolute', top: 3, left: value ? 25 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}

const S = {
  card: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  input: {
    background: '#1f1f1f', border: '1px solid #333', borderRadius: 8,
    padding: '10px 14px', color: '#f0f0f0', fontFamily: "'Outfit', sans-serif",
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: '#1f1f1f', border: '1px solid #333', borderRadius: 8,
    padding: '10px 14px', color: '#f0f0f0', fontFamily: 'monospace',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
    resize: 'vertical', lineHeight: 1.7,
  },
  btn: (color = '#e63946') => ({
    background: color, color: '#fff', border: 'none', borderRadius: 9,
    padding: '10px 22px', fontFamily: "'Outfit', sans-serif",
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  }),
  label: { color: '#888', fontSize: 12, marginBottom: 5, display: 'block', fontWeight: 600 },
  row: { background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 16px', marginBottom: 8 },
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
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Unified Tools 통합 관리자</p>
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
  const [activeTab, setActiveTab] = useState('settings')

  // 설정
  const [cooldownDur, setCooldownDur] = useState(12)
  const [adsOn, setAdsOn] = useState(true)
  const [saved, setSaved] = useState(false)

  // 블로그
  const [blogPosts, setBlogPosts] = useState([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [blogMsg, setBlogMsg] = useState('')
  const [blogForm, setBlogForm] = useState({
    title: '', slug: '', summary: '', content: '', category: 'general',
    tags: '', thumbnail: '', published: true, author: '관리자',
  })
  const [filterCat, setFilterCat] = useState('all')

  // 비밀번호
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (token) { setAuthed(true); setAdminToken(token); loadSettings(token) }
    setLoading(false)
  }, [])

  const loadSettings = async (token) => {
    try {
      const res = await fetch('/api/settings/get', { headers: { 'x-admin-token': token } })
      const data = await res.json()
      if (data.cooldown) setCooldownDur(data.cooldown)
      if (data.adsOn !== undefined) setAdsOn(data.adsOn)
    } catch {}
  }

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

  const fetchBlogPosts = useCallback(async () => {
    setBlogLoading(true)
    try {
      const res = await fetch('/api/blog/posts?limit=50', { headers: { 'x-admin-token': adminToken } })
      const data = await res.json()
      setBlogPosts(Array.isArray(data) ? data : [])
    } catch {}
    setBlogLoading(false)
  }, [adminToken])

  useEffect(() => { if (authed && activeTab === 'blog') fetchBlogPosts() }, [authed, activeTab, fetchBlogPosts])

  const handleBlogSubmit = async () => {
    if (!blogForm.title || !blogForm.content) { setBlogMsg('제목과 내용은 필수입니다'); setTimeout(() => setBlogMsg(''), 3000); return }
    setBlogLoading(true)
    try {
      const slug = blogForm.slug || blogForm.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36)
      const body = {
        ...blogForm,
        slug,
        tags: blogForm.tags ? blogForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      const method = editingPost ? 'PUT' : 'POST'
      if (editingPost) body.id = editingPost.id
      const res = await fetch('/api/blog/posts', {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setBlogMsg(editingPost ? '✅ 수정 완료' : '✅ 발행 완료')
      setTimeout(() => setBlogMsg(''), 3000)
      setBlogForm({ title: '', slug: '', summary: '', content: '', category: 'general', tags: '', thumbnail: '', published: true, author: '관리자' })
      setEditingPost(null)
      fetchBlogPosts()
    } catch { setBlogMsg('❌ 저장 실패'); setTimeout(() => setBlogMsg(''), 3000) }
    setBlogLoading(false)
  }

  const handleBlogEdit = (post) => {
    setEditingPost(post)
    setBlogForm({
      title: post.title || '', slug: post.slug || '', summary: post.summary || '',
      content: post.content || '', category: post.category || 'general',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      thumbnail: post.thumbnail || '', published: !!post.published, author: post.author || '관리자',
    })
  }

  const handleBlogDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await fetch(`/api/blog/posts?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } })
    fetchBlogPosts()
  }

  const handleTogglePublished = async (post) => {
    await fetch('/api/blog/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ id: post.id, published: !post.published }),
    })
    fetchBlogPosts()
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

  if (loading) return null
  if (!authed) return <LoginScreen onLogin={(t) => { setAuthed(true); setAdminToken(t); loadSettings(t) }} />

  const filteredPosts = filterCat === 'all' ? blogPosts : blogPosts.filter(p => p.category === filterCat)

  const TABS = [
    { id: 'settings', label: '⚙️ 사이트 설정' },
    { id: 'blog', label: '📝 블로그 관리' },
    { id: 'password', label: '🔑 비밀번호' },
  ]

  return (
    <>
      <Head>
        <title>Admin - Unified Tools</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0c0c0c', fontFamily: "'Outfit', sans-serif", color: '#f0f0f0', paddingBottom: 60 }}>
        {/* 헤더 */}
        <div style={{ background: '#161616', borderBottom: '1px solid #2a2a2a', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: '#e63946', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>▶</div>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Admin Panel</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href="/" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>← 사이트로</a>
              <button onClick={() => { sessionStorage.removeItem('admin_token'); setAuthed(false) }}
                style={{ ...S.btn('#333'), padding: '7px 16px', fontSize: 13 }}>로그아웃</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #2a2a2a', paddingBottom: 0 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 14, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                color: activeTab === tab.id ? '#e63946' : '#666',
                borderBottom: `2px solid ${activeTab === tab.id ? '#e63946' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── 사이트 설정 탭 */}
          {activeTab === 'settings' && (
            <>
              <div style={S.card}>
                <div style={S.cardTitle}>⚙️ 기본 설정</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* 쿨다운 */}
                  <div>
                    <label style={S.label}>쿨다운 시간 (초) — 검색/다운로드 후 광고 노출 시간</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" min={0} max={60} value={cooldownDur}
                        onChange={e => setCooldownDur(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#e63946' }} />
                      <span style={{ fontWeight: 700, fontSize: 18, minWidth: 40, textAlign: 'center' }}>{cooldownDur}s</span>
                    </div>
                  </div>
                  {/* 광고 ON/OFF */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>광고 노출</div>
                      <div style={{ color: '#666', fontSize: 13 }}>전체 사이트 광고를 ON/OFF 합니다</div>
                    </div>
                    <Toggle value={adsOn} onChange={setAdsOn} />
                  </div>
                </div>
                <div style={{ marginTop: 24 }}>
                  <button onClick={saveSettings} style={S.btn()}>
                    {saved ? '✅ 저장 완료' : '저장하기'}
                  </button>
                </div>
              </div>

              {/* 환경변수 안내 */}
              <div style={S.card}>
                <div style={S.cardTitle}>🔑 환경변수 설정 (Vercel)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { key: 'SUPABASE_URL', desc: 'Supabase 프로젝트 URL', ex: 'https://xxxx.supabase.co' },
                    { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Supabase 서비스 롤 키 (서버 전용)', ex: 'eyJhbGciOiJIUzI1...' },
                    { key: 'NEXT_PUBLIC_ADSENSE_CLIENT', desc: 'Google AdSense 클라이언트 ID', ex: 'ca-pub-XXXXXXXXXX' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_TOP', desc: '상단 광고 슬롯 ID', ex: '1234567890' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_COOLDOWN', desc: '쿨다운 광고 슬롯 ID', ex: '1234567891' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_MIDDLE', desc: '중간 광고 슬롯 ID', ex: '1234567892' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_FOOTER', desc: '하단 광고 슬롯 ID', ex: '1234567893' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_LEFT', desc: '왼쪽 사이드바 슬롯 ID', ex: '1234567894' },
                    { key: 'NEXT_PUBLIC_AD_SLOT_RIGHT', desc: '오른쪽 사이드바 슬롯 ID', ex: '1234567895' },
                    { key: 'NEXT_PUBLIC_FREESOUND_API_KEY', desc: 'Freesound API 키 (효과음)', ex: 'freesound.org에서 발급' },
                    { key: 'NEXT_PUBLIC_ADMIN_PASSWORD', desc: '기본 관리자 비밀번호', ex: 'admin1234' },
                    { key: 'ADMIN_SECRET_TOKEN', desc: '세션 토큰 (랜덤 문자열)', ex: 'random-secret-string' },
                  ].map(({ key, desc, ex }) => (
                    <div key={key} style={S.row}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#f0f0f0', fontFamily: 'monospace', marginBottom: 4 }}>{key}</div>
                      <div style={{ color: '#888', fontSize: 12, marginBottom: 3 }}>{desc}</div>
                      <div style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>예: {ex}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supabase SQL */}
              <div style={S.card}>
                <div style={S.cardTitle}>🗄️ Supabase 테이블 생성 SQL</div>
                <pre style={{ background: '#0a0a0a', padding: 16, borderRadius: 10, fontSize: 12, color: '#aaa', overflow: 'auto', lineHeight: 1.7 }}>{`-- 설정 테이블
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 블로그 포스트 테이블
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  content TEXT,
  thumbnail TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT DEFAULT '관리자',
  published BOOLEAN DEFAULT true,
  site TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 비활성화 (관리자만 사용)
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts DISABLE ROW LEVEL SECURITY;`}</pre>
              </div>
            </>
          )}

          {/* ── 블로그 관리 탭 */}
          {activeTab === 'blog' && (
            <>
              {/* 글쓰기 폼 */}
              <div style={S.card}>
                <div style={S.cardTitle}>{editingPost ? '✏️ 글 수정' : '✍️ 새 글 작성'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={S.label}>제목 *</label>
                      <input value={blogForm.title} onChange={e => setBlogForm(v => ({ ...v, title: e.target.value }))} placeholder="글 제목" style={S.input} />
                    </div>
                    <div>
                      <label style={S.label}>URL 슬러그</label>
                      <input value={blogForm.slug} onChange={e => setBlogForm(v => ({ ...v, slug: e.target.value }))} placeholder="url-slug (비워두면 자동생성)" style={S.input} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={S.label}>카테고리</label>
                      <select value={blogForm.category} onChange={e => setBlogForm(v => ({ ...v, category: e.target.value }))}
                        style={{ ...S.input, background: '#1f1f1f' }}>
                        {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>태그 (쉼표 구분)</label>
                      <input value={blogForm.tags} onChange={e => setBlogForm(v => ({ ...v, tags: e.target.value }))} placeholder="태그1, 태그2, 태그3" style={S.input} />
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>썸네일 이미지 URL</label>
                    <input value={blogForm.thumbnail} onChange={e => setBlogForm(v => ({ ...v, thumbnail: e.target.value }))} placeholder="https://..." style={S.input} />
                  </div>
                  <div>
                    <label style={S.label}>요약 (SEO description)</label>
                    <textarea value={blogForm.summary} onChange={e => setBlogForm(v => ({ ...v, summary: e.target.value }))}
                      placeholder="검색결과에 표시될 요약 문구 (160자 이내)" rows={2} style={S.textarea} />
                  </div>
                  <div>
                    <label style={S.label}>본문 (마크다운) *</label>
                    <textarea value={blogForm.content} onChange={e => setBlogForm(v => ({ ...v, content: e.target.value }))}
                      placeholder="## 소제목&#10;&#10;본문 내용을 마크다운으로 작성하세요.&#10;&#10;- 항목 1&#10;- 항목 2&#10;&#10;**굵게** *기울임*"
                      rows={18} style={S.textarea} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Toggle value={blogForm.published} onChange={v => setBlogForm(p => ({ ...p, published: v })) } />
                      <span style={{ fontSize: 14, color: blogForm.published ? '#f0f0f0' : '#666' }}>
                        {blogForm.published ? '✅ 발행' : '📝 임시저장'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {editingPost && (
                        <button onClick={() => { setEditingPost(null); setBlogForm({ title: '', slug: '', summary: '', content: '', category: 'general', tags: '', thumbnail: '', published: true, author: '관리자' }) }}
                          style={{ ...S.btn('#333'), padding: '10px 18px' }}>취소</button>
                      )}
                      <button onClick={handleBlogSubmit} disabled={blogLoading} style={{ ...S.btn(), opacity: blogLoading ? 0.6 : 1 }}>
                        {blogLoading ? '저장 중...' : editingPost ? '수정 완료' : '🚀 발행하기'}
                      </button>
                    </div>
                  </div>
                  {blogMsg && <div style={{ padding: '10px 14px', borderRadius: 8, background: blogMsg.startsWith('✅') ? '#0a2a0a' : '#2a0a0a', color: blogMsg.startsWith('✅') ? '#4ade80' : '#f87171', fontSize: 13 }}>{blogMsg}</div>}
                </div>
              </div>

              {/* 글 목록 */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div style={S.cardTitle}>📋 글 목록 ({filteredPosts.length})</div>
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    style={{ ...S.input, width: 'auto', padding: '7px 12px', fontSize: 13 }}>
                    <option value="all">전체 카테고리</option>
                    {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {blogLoading ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#555' }}>불러오는 중...</div>
                ) : filteredPosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#555' }}>글이 없습니다</div>
                ) : filteredPosts.map(post => (
                  <div key={post.id} style={{ ...S.row, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: post.published ? '#0a2a0a' : '#2a2a0a', color: post.published ? '#4ade80' : '#facc15' }}>
                          {post.published ? '✅ 발행' : '📝 임시'}
                        </span>
                        {post.category && <span style={{ fontSize: 10, color: '#666', background: '#1a1a1a', padding: '2px 7px', borderRadius: 4 }}>{post.category}</span>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''} · /{post.slug}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleTogglePublished(post)}
                        style={{ ...S.btn(post.published ? '#333' : '#16a34a'), padding: '6px 12px', fontSize: 12 }}>
                        {post.published ? '내리기' : '발행'}
                      </button>
                      <button onClick={() => handleBlogEdit(post)}
                        style={{ ...S.btn('#2563eb'), padding: '6px 12px', fontSize: 12 }}>수정</button>
                      <button onClick={() => handleBlogDelete(post.id)}
                        style={{ ...S.btn('#7f1d1d'), padding: '6px 12px', fontSize: 12 }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 비밀번호 탭 */}
          {activeTab === 'password' && (
            <div style={S.card}>
              <div style={S.cardTitle}>🔑 비밀번호 변경</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}>
                <div>
                  <label style={S.label}>새 비밀번호</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>새 비밀번호 확인</label>
                  <input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} style={S.input} />
                </div>
                <button onClick={changePw} style={S.btn()}>변경하기</button>
                {pwMsg && <p style={{ fontSize: 13, color: pwMsg.ok ? '#4ade80' : '#f87171' }}>{pwMsg.msg}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Supabase SQL (admin 페이지에서 참고용)
// CREATE TABLE blog_categories (
//   id TEXT PRIMARY KEY,
//   label TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE blog_categories DISABLE ROW LEVEL SECURITY;
