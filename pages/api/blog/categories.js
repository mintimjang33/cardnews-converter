import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN

  if (req.method === 'GET') {
    const { data } = await supabase.from('blog_categories').select('*').order('label')
    return res.status(200).json(data || [])
  }

  if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

  if (req.method === 'POST') {
    const { label } = req.body
    if (!label) return res.status(400).json({ error: '카테고리명 필요' })
    const { data, error } = await supabase.from('blog_categories').insert([{
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      label,
      created_at: new Date().toISOString(),
    }]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id 필요' })
    await supabase.from('blog_categories').delete().eq('id', id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
