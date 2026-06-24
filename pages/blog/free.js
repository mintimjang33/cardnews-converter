import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { AdSlot } from '../../components/AdSlot'
import { findAdSlot } from '../../lib/adSlots'

const PAGE_SIZE = 20

// 비밀번호 경고 모달
function SecretWarningModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 12, color: '#111' }}>
          비밀글 작성 안내
        </h3>
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, textAlign: 'center', marginBottom: 24 }}>
          이곳은 <strong>회원가입 없이 무료</strong>로 이용할 수 있는 공간입니다.<br />
          개인 정보를 저장하지 않기 때문에<br />
          <strong style={{ color: '#e63946' }}>비밀번호를 잊으면 글을 다시 볼 수 없습니다.</strong><br /><br />
          비밀번호를 반드시 별도로 보관해 주세요!
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
            background: '#f9fafb', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>취소</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: 'none',
            background: '#e63946', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>확인, 작성할게요</button>
        </div>
      </div>
    </div>
  )
}

// 비밀번호 입력 모달 (비밀글 열람)
function PasswordModal({ post, onSuccess, onCancel }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (pw.length !== 4) { setError('비밀번호는 4자리입니다'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/blog/verify-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: post.slug, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '비밀번호가 틀렸습니다'); setLoading(false); return }
      onSuccess(data)
    } catch { setError('오류가 발생했습니다') }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, maxWidth: 360, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', marginBottom: 6, color: '#111' }}>비밀글입니다</h3>
        <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 }}>비밀번호 4자리를 입력하세요</p>
        <input
          type="password" maxLength={4} value={pw}
          onChange={e => { setPw(e.target.value.replace(/\D/g, '')); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="0000"
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
            fontSize: 20, textAlign: 'center', letterSpacing: 8, outline: 'none',
            boxSizing: 'border-box', marginBottom: 8,
          }}
          autoFocus
        />
        {error && <p style={{ color: '#e63946', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e5e7eb',
            background: '#f9fafb', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 1, padding: 12, borderRadius: 10, border: 'none',
            background: '#e63946', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>{loading ? '확인 중...' : '확인'}</button>
        </div>
      </div>
    </div>
  )
}

// 글쓰기 폼
function WriteForm({ onClose, onSuccess }) {
  const [showWarning, setShowWarning] = useState(false)
  const [warningConfirmed, setWarningConfirmed] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', author_name: '', is_secret: false, secret_password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSecretToggle = (val) => {
    if (val && !warningConfirmed) {
      setShowWarning(true)
      return
    }
    setForm(f => ({ ...f, is_secret: val }))
  }

  const handleWarningConfirm = () => {
    setShowWarning(false)
    setWarningConfirmed(true)
    setForm(f => ({ ...f, is_secret: true }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('제목을 입력해주세요'); return }
    if (!form.content.trim()) { setError('내용을 입력해주세요'); return }
    if (form.is_secret && form.secret_password.replace(/\D/g, '').length !== 4) {
      setError('비밀번호는 숫자 4자리입니다'); return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: 'free',
          title: form.title.trim(),
          content: form.content.trim(),
          author_name: form.author_name.trim() || '익명',
          is_secret: form.is_secret,
          secret_password: form.is_secret ? form.secret_password.replace(/\D/g, '') : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '저장 실패'); setSaving(false); return }
      onSuccess(data)
    } catch { setError('오류가 발생했습니다') }
    setSaving(false)
  }

  return (
    <>
      {showWarning && (
        <SecretWarningModal
          onConfirm={handleWarningConfirm}
          onCancel={() => setShowWarning(false)}
        />
      )}
      <div style={{
        background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16,
        padding: 28, marginBottom: 28,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#111' }}>✏️ 글쓰기</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="제목" maxLength={100}
            style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none' }} />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="내용을 입력하세요" rows={6} maxLength={2000}
            style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
              placeholder="닉네임 (선택, 기본: 익명)" maxLength={20}
              style={{ flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={form.is_secret}
                onChange={e => handleSecretToggle(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              🔒 비밀글
            </label>
            {form.is_secret && (
              <input
                type="password" value={form.secret_password}
                onChange={e => setForm(f => ({ ...f, secret_password: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="비밀번호 4자리"
                maxLength={4}
                style={{ width: 140, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e63946', fontSize: 14, outline: 'none', letterSpacing: 4, textAlign: 'center' }}
              />
            )}
          </div>
          {error && <p style={{ color: '#e63946', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb',
              background: '#f9fafb', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>취소</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#e63946', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? '등록 중...' : '등록'}</button>
          </div>
        </div>
      </div>
    </>
  )
}

// 글 상세 뷰
function PostDetail({ post, onClose }) {
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16,
      padding: 28, marginBottom: 28,
    }}>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer',
        marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
      }}>← 목록으로</button>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 10 }}>{post.title}</h2>
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#888', marginBottom: 20, flexWrap: 'wrap' }}>
        <span>{post.author_name || '익명'}</span>
        <span>{post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}</span>
      </div>
      <div style={{ fontSize: 15, color: '#222', lineHeight: 1.9, whiteSpace: 'pre-wrap', borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
        {post.content}
      </div>
    </div>
  )
}

export default function FreeBoardPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showWrite, setShowWrite] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [pwModal, setPwModal] = useState(null) // 비밀번호 입력 중인 post
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const fetchPosts = useCallback(async (offset, append) => {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const res = await fetch(`/api/blog/posts?post_type=free&limit=${PAGE_SIZE}&offset=${offset}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setPosts(prev => append ? [...prev, ...list] : list)
      setHasMore(list.length === PAGE_SIZE)
    } catch {
      if (!append) setPosts([])
    }
    if (append) setLoadingMore(false); else setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts(0, false)
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setSettingsLoaded(true))
  }, [fetchPosts])

  const handlePostClick = (post) => {
    if (post.is_secret) {
      setPwModal(post)
    } else {
      setSelectedPost(post)
    }
  }

  const handleWriteSuccess = () => {
    setShowWrite(false)
    fetchPosts(0, false)
  }

  return (
    <div className="light-theme">
      <Head>
        <title>자유게시판 - Down Tools</title>
        <meta name="description" content="자유롭게 이야기 나누는 공간입니다" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header siteName="자유게시판" siteHref="/blog/free" />

      {settingsLoaded && adsOn && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111'} slotData={findAdSlot(adSlots, 'home_top')} number={1} label="광고" />
        </div>
      )}

      {pwModal && (
        <PasswordModal
          post={pwModal}
          onSuccess={(data) => { setPwModal(null); setSelectedPost(data) }}
          onCancel={() => setPwModal(null)}
        />
      )}

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111' }}>💬 자유게시판</h1>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>자유롭게 이야기 나눠요. 회원가입 없이 누구나 작성 가능합니다.</p>
          </div>
          {!showWrite && !selectedPost && (
            <button onClick={() => setShowWrite(true)} style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: '#e63946', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>✏️ 글쓰기</button>
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          {showWrite && !selectedPost && (
            <WriteForm onClose={() => setShowWrite(false)} onSuccess={handleWriteSuccess} />
          )}

          {selectedPost ? (
            <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />
          ) : (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>불러오는 중...</div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <p>아직 작성된 글이 없어요. 첫 글을 남겨보세요!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* 헤더 */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 100px',
                    padding: '10px 16px', borderBottom: '2px solid #e5e7eb',
                    fontSize: 12, fontWeight: 700, color: '#888',
                  }}>
                    <span>제목</span>
                    <span style={{ textAlign: 'center' }}>작성자</span>
                    <span style={{ textAlign: 'right' }}>날짜</span>
                  </div>
                  {posts.map(post => (
                    <div key={post.id}
                      onClick={() => handlePostClick(post)}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 80px 100px',
                        padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {post.is_secret && <span style={{ fontSize: 13 }}>🔒</span>}
                        <span style={{
                          fontSize: 15, fontWeight: 600, color: '#111',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{post.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', textAlign: 'center', alignSelf: 'center' }}>
                        {post.author_name || '익명'}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa', textAlign: 'right', alignSelf: 'center' }}>
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && hasMore && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button onClick={() => fetchPosts(posts.length, true)} disabled={loadingMore}
                    style={{
                      padding: '10px 28px', borderRadius: 999, border: '1.5px solid #e5e7eb',
                      background: '#fff', color: '#666', fontSize: 14, fontWeight: 600,
                      cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1,
                    }}>{loadingMore ? '불러오는 중...' : '더 보기'}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer siteName="Down Tools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </div>
  )
}
