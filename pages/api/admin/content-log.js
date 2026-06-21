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
//   target_keyword text,           -- 타겟 키워드 (예: "유튜브 썸네일 다운로드")
//   search_pc integer,             -- 네이버 PC 월간 검색수
//   search_mobile integer,         -- 네이버 모바일 월간 검색수
//   search_total integer,          -- PC + 모바일 합계
//   competition text,              -- 경쟁도 (높음/중간/낮음)
//   published_at date,             -- 실제 블로그 발행일 (선택, YYYY-MM-DD)
//   created_at timestamptz not null default now()
// );
//
// 기존 테이블에 컬럼 추가 (이미 테이블이 있는 경우):
// alter table content_log
//   add column if not exists target_keyword text,
//   add column if not exists search_pc integer,
//   add column if not exists search_mobile integer,
//   add column if not exists search_total integer,
//   add column if not exists competition text,
//   add column if not exists published_at date;
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
      target_keyword: body.targetKeyword || null,
      search_pc: body.searchPc != null ? Number(body.searchPc) : null,
      search_mobile: body.searchMobile != null ? Number(body.searchMobile) : null,
      search_total: body.searchTotal != null ? Number(body.searchTotal) : null,
      competition: body.competition || null,
      published_at: body.publishedAt || null,
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
