import { createClient } from '@supabase/supabase-js'

/** 현재 시각을 KST(UTC+9) 기준 ISO 문자열로 반환 */
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

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
  try {
    const nowIso = nowKST()
    await supabase
      .from('blog_posts')
      .update({ status: 'published', published_at: nowIso })
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
  } catch {}

  // GET
  if (req.method === 'GET') {
    const { slug, category, post_type, limit = 20, offset = 0 } = req.query
    if (slug) {
      let q = supabase.from('blog_posts').select('*').eq('slug', slug)
      if (!isAdmin) q = q.eq('status', 'published')
      const { data, error } = await q.single()
      if (error || !data) return res.status(404).json({ error: 'Not found' })
      // 비밀글은 content 제외하고 반환 (별도 검증 API에서 content 제공)
      if (!isAdmin && data.is_secret) {
        const { content, secret_password, ...safeData } = data
        return res.status(200).json({ ...safeData, is_secret: true, content: null })
      }
      return res.status(200).json(data)
    }
    let q = supabase.from('blog_posts').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('status', 'published')
    if (category) q = q.eq('category', category)
    // post_type 필터: 기본은 blog만 (자유게시판/부탁해요는 별도)
    if (post_type) {
      q = q.eq('post_type', post_type)
    } else {
      q = q.eq('post_type', 'blog')
    }
    q = q.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    // 목록에서는 secret_password 필드 제거
    const safeList = (data || []).map(({ secret_password, ...rest }) => rest)
    return res.status(200).json(safeList)
  }

  // POST - 생성
  if (req.method === 'POST') {
    const body = req.body
    const postType = body.post_type || 'blog'

    // 자유게시판/부탁해요는 누구나 작성 가능, 블로그는 admin만
    if (postType === 'blog' && !isAdmin) {
      return res.status(401).json({ error: '인증 필요' })
    }

    const nowIso = nowKST()
    const status = postType === 'blog' ? (body.status || 'draft') : 'published'

    // slug 자동 생성 (자유게시판/부탁해요)
    const slug = body.slug || `${postType}-${genId()}`

    const row = {
      id: genId(),
      type: 'blog',
      post_type: postType,
      title: body.title,
      slug,
      summary: body.summary || null,
      content: body.content || '',
      category: body.category || postType,
      tags: Array.isArray(body.tags) ? body.tags : [],
      cover_image: body.cover_image || null,
      author: body.author || null,
      author_name: body.author_name || null,
      is_secret: body.is_secret || false,
      secret_password: body.is_secret ? (body.secret_password || null) : null,
      status,
      scheduled_at: status === 'scheduled' ? (body.scheduled_at || null) : null,
      published_at: status === 'published' ? nowIso : null,
      created_at: nowIso,
      updated_at: nowIso,
    }
    const { data, error } = await supabase.from('blog_posts').insert([row]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    const { secret_password: _pw, ...safeData } = data
    return res.status(200).json(safeData)
  }

  // PUT - 수정 (admin only)
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
      category: body.category || 'blog',
      tags: Array.isArray(body.tags) ? body.tags : [],
      cover_image: body.cover_image || null,
      author: body.author || null,
      status,
      scheduled_at: status === 'scheduled' ? (body.scheduled_at || null) : null,
      published_at: (body.published_at && body.published_at !== '') ? body.published_at : undefined,
      updated_at: nowKST(),
    }
    const { data, error } = await supabase.from('blog_posts')
      .update(updateRow).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE (admin only)
  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const { id } = req.query
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
