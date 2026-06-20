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
      .from('keyword_stats')
      .select('hint, collected_at')

    if (error) throw new Error(error.message)

    // JS에서 hint별 집계
    const map = {}
    for (const row of data || []) {
      const h = row.hint
      if (!map[h]) {
        map[h] = { hint: h, count: 0, collected_at: row.collected_at }
      }
      map[h].count++
      if (new Date(row.collected_at) > new Date(map[h].collected_at)) {
        map[h].collected_at = row.collected_at
      }
    }

    const result = Object.values(map)
      .sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
