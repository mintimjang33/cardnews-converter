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
    // hint별 최신 collected_at 조회
    const { data, error } = await supabase
      .from('keyword_stats')
      .select('hint, collected_at')

    if (error) throw new Error(error.message)

    // hint별 그룹핑: 최신 날짜 + 개수
    const hintMap = {}
    for (const row of data || []) {
      const h = row.hint
      if (!hintMap[h]) {
        hintMap[h] = { collected_at: row.collected_at, count: 0 }
      } else {
        // 더 최신 날짜로 갱신
        if (new Date(row.collected_at) > new Date(hintMap[h].collected_at)) {
          hintMap[h].collected_at = row.collected_at
        }
      }
      hintMap[h].count++
    }

    const result = Object.entries(hintMap)
      .map(([hint, stat]) => ({ hint, ...stat }))
      .sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
