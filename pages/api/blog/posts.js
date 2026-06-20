import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN

  // 예약 발행 시간이 지난 글은 조회 시점에 자동으로 published 전환
  // (Vercel Hobby 플랜은 cron이 하루 1회로 제한되므로, 방문자가 들어올 때마다
  //  여기서 "지나간 예약"을 처리해서 즉시 반영되게 함)
  try {
    const nowIso = new Date().toISOString()
    await supabase
      .from('blog_posts')
      .update({ status: 'published', published_at: nowIso })
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
  } catch {
    // 자동발행 처리 실패는 조회 자체를 막지 않음 (다음 요청에서 재시도됨)
  }

  // GET
  if (req.method === 'GET') {
    const { slug, category, limit = 20, offset = 0 } = req.query
    if (slug) {
      let q = supabase.from('blog_posts').select('*').eq('slug', slug)
      if (!isAdmin) q = q.eq('status', 'published')
      const { data, error } = await q.single()
      if (error || !data) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(data)
    }
    let q = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('status', 'published')
    if (category) q = q.eq('category', category)
    q = q.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // POST - 생성
  if (req.method === 'POST') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const body = req.body
    const status = body.status || 'draft'
    const nowIso = new Date().toISOString()
    const row = {
      id: genId(),
      type: 'blog',
      title: body.title,
      slug: body.slug,
      summary: body.summary || null,
      content: body.content,
      category: body.category || 'general',
      tags: Array.isArray(body.tags) ? body.tags : [],
      cover_image: body.cover_image || null,
      author: body.author || null,
      status,
      scheduled_at: status === 'scheduled' ? (body.scheduled_at || null) : null,
      published_at: status === 'published' ? (body.published_at || nowIso) : (body.published_at || null),
      created_at: nowIso,
      updated_at: nowIso,
    }
    const { data, error } = await supabase.from('blog_posts').insert([row]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // PUT - 수정
  if (req.method === 'PUT') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const { id, ...body } = req.body
    if (!id) return res.status(400).json({ error: 'id 필요' })
    const status = body.status || 'draft'
    const updateRow = {
      title: body.title,
      slug: body.slug,
      summary: body.summary || null,
      content: body.content,
      category: body.category || 'general',
      tags: Array.isArray(body.tags) ? body.tags : [],
      cover_image: body.cover_image || null,
      author: body.author || null,
      status,
      scheduled_at: status === 'scheduled' ? (body.scheduled_at || null) : null,
      published_at: body.published_at || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('blog_posts')
      .update(updateRow)
      .eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE
  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const { id } = req.query
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
