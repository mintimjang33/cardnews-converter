import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN

  // GET
  if (req.method === 'GET') {
    const { slug, category, site, limit = 20, offset = 0 } = req.query
    if (slug) {
      let q = supabase.from('blog_posts').select('*').eq('slug', slug)
      if (!isAdmin) q = q.eq('published', true)
      const { data, error } = await q.single()
      if (error || !data) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(data)
    }
    let q = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('published', true)
    if (category) q = q.eq('category', category)
    if (site) q = q.eq('site', site)
    q = q.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // POST - 생성
  if (req.method === 'POST') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const post = req.body
    const { data, error } = await supabase.from('blog_posts').insert([{
      ...post,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // PUT - 수정
  if (req.method === 'PUT') {
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })
    const { id, ...rest } = req.body
    const { data, error } = await supabase.from('blog_posts')
      .update({ ...rest, updated_at: new Date().toISOString() })
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
