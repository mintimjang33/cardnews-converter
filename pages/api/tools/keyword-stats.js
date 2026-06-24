import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })


  // ?mode=today → 오늘 실시간 조회 기록 반환 (합계 높은 순, 수집된 키워드 제외)
  if (req.query.mode === 'today') {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('keyword_stats')
        .select('hint, keyword, pc, mobile, total, competition, doc_count, created_at')
        .gte('created_at', todayStart.toISOString())
        .order('total', { ascending: false })
      if (error) throw new Error(error.message)

      const { data: picks } = await supabase.from('keyword_picks').select('tool_id, keyword')
      const pickedSet = new Set((picks || []).map(p => `${p.tool_id}:${p.keyword}`))

      // 수집된(찜한) 키워드 제외
      const rows = (data || [])
        .filter(r => !pickedSet.has(`${r.hint}:${r.keyword}`))
        .map(r => ({ ...r, picked: false }))
      return res.status(200).json(rows)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  try {
    const { data, error } = await supabase
      .rpc('keyword_stats_summary')

    if (error) throw new Error(error.message)
    return res.status(200).json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
