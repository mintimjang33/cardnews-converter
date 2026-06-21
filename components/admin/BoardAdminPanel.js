import { useState, useEffect, useCallback } from 'react'
import { S, Toast } from './AdminUI'

const TYPE_LABEL = { free: '자유게시판', request: '부탁해요' }

export default function BoardAdminPanel({ adminToken, postType }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/blog/posts?post_type=${postType}&limit=100`, {
        headers: { 'x-admin-token': adminToken },
      })
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch { showToast('❌ 불러오기 실패') }
    setLoading(false)
  }, [adminToken, postType])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('이 글을 삭제할까요?')) return
    try {
      const res = await fetch(`/api/blog/posts?id=${id}`, {
        method: 'DELETE', headers: { 'x-admin-token': adminToken },
      })
      if (!res.ok) throw new Error()
      showToast('🗑 삭제됨')
      setPosts(p => p.filter(x => x.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch { showToast('❌ 삭제 실패') }
  }

  return (
    <div>
      <Toast msg={toast} />
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={S.cardTitle}>{postType === 'free' ? '💬' : '📬'} {TYPE_LABEL[postType]} 관리</div>
          <button onClick={load} style={{ ...S.btn('sm'), fontSize: 12 }}>🔄 새로고침</button>
        </div>

        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', color: '#71717a', fontSize: 14,
              cursor: 'pointer', marginBottom: 16, padding: 0,
            }}>← 목록으로</button>
            <div style={{ background: '#161616', borderRadius: 10, padding: 20, border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {selected.is_secret && <span style={{ fontSize: 12, color: '#facc15', background: '#1c1c00', borderRadius: 4, padding: '2px 8px', border: '1px solid #854d0e' }}>🔒 비밀글</span>}
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', margin: 0 }}>{selected.title}</h3>
              </div>
              <div style={{ fontSize: 12, color: '#52525b', marginBottom: 16 }}>
                {selected.author_name || '익명'} · {selected.created_at ? new Date(selected.created_at).toLocaleString('ko-KR') : ''}
              </div>
              <div style={{ fontSize: 14, color: '#d4d4d4', lineHeight: 1.8, whiteSpace: 'pre-wrap', borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
                {selected.content}
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => handleDelete(selected.id)} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #7f1d1d',
                  background: '#2a0a0a', color: '#f87171', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}>🗑 삭제</button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#52525b' }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#52525b' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            아직 글이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px',
              padding: '8px 12px', borderBottom: '1px solid #2a2a2a',
              fontSize: 11, fontWeight: 700, color: '#52525b',
            }}>
              <span>제목</span>
              <span style={{ textAlign: 'center' }}>작성자</span>
              <span style={{ textAlign: 'right' }}>날짜</span>
              <span></span>
            </div>
            {posts.map(post => (
              <div key={post.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px',
                padding: '12px', borderBottom: '1px solid #1f1f1f',
                alignItems: 'center',
              }}>
                <div
                  onClick={() => setSelected(post)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}
                >
                  {post.is_secret && <span style={{ fontSize: 12 }}>🔒</span>}
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: '#f0f0f0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{post.title}</span>
                </div>
                <div style={{ fontSize: 12, color: '#71717a', textAlign: 'center' }}>{post.author_name || '익명'}</div>
                <div style={{ fontSize: 11, color: '#52525b', textAlign: 'right' }}>
                  {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => handleDelete(post.id)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #7f1d1d',
                    background: '#2a0a0a', color: '#f87171', fontSize: 11,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
