import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 비밀글 비밀번호 검증 → 맞으면 content 반환
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, password } = req.body
  if (!slug || !password) return res.status(400).json({ error: '필수값 누락' })

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) return res.status(404).json({ error: '글을 찾을 수 없습니다' })
  if (!data.is_secret) return res.status(400).json({ error: '비밀글이 아닙니다' })
  if (data.secret_password !== String(password)) {
    return res.status(403).json({ error: '비밀번호가 틀렸습니다' })
  }

  const { secret_password, ...safeData } = data
  return res.status(200).json(safeData)
}
