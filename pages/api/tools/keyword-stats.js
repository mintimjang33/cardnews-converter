import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })

  try {
    const { data, error } = await supabase
      .rpc('keyword_stats_summary')

    if (error) throw new Error(error.message)
    return res.status(200).json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
