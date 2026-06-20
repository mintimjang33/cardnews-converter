import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// content_log 테이블 (Supabase에 최초 1회 생성 필요):
//
// create table content_log (
//   id text primary key,
//   tool text not null,            -- 예: thumb-down, cardnews-down ...
//   angle text not null,           -- 키워드 각도, 예: "다운로드 방법"
//   title text not null,           -- 글 제목
//   slug text not null,            -- URL 슬러그
//   memo text,                     -- 비고 (선택)
//   created_at timestamptz not null default now()
// );
//
// 이 테이블은 실제 글 본문을 저장하지 않습니다 (blog_posts와 별개).
// Claude가 글을 작성·발행할 때마다 "무엇을 어떤 각도로 썼는지"만 가볍게 기록해
// 다음 글 작성 시 중복을 피하기 위한 관리자 전용 로그입니다.

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN
  if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

  // GET - 목록 조회 (도구별 필터 가능)
  if (req.method === 'GET') {
    const { tool, limit = 200, offset = 0 } = req.query
    let q = supabase.from('content_log').select('*').order('created_at', { ascending: false })
    if (tool) q = q.eq('tool', tool)
    q = q.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // POST - 기록 추가
  if (req.method === 'POST') {
    const body = req.body
    if (!body.tool || !body.angle || !body.title || !body.slug) {
      return res.status(400).json({ error: 'tool, angle, title, slug는 필수입니다' })
    }
    const row = {
      id: genId(),
      tool: body.tool,
      angle: body.angle,
      title: body.title,
      slug: body.slug,
      memo: body.memo || null,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('content_log').insert([row]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE - 기록 삭제
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id 필요' })
    const { error } = await supabase.from('content_log').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
