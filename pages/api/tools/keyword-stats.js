/**
 * /api/tools/keyword-stats
 * 도구별 keyword_stats 최신 수집일 + 키워드 수 반환
 *
 * 응답:
 * {
 *   "thumb-down":    { "collected_at": "2026-06-21T...", "count": 604 },
 *   "sound-down":    { "collected_at": null, "count": 0 },
 *   ...
 * }
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token   = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN
  if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

  try {
    // Supabase에서 hint별 최신 수집일 + 키워드 수 집계
    const { data, error } = await supabase
      .from('keyword_stats')
      .select('hint, collected_at')
      .order('collected_at', { ascending: false })

    if (error) throw new Error(error.message)

    // hint별로 그룹핑
    const hintMap = {}
    for (const row of data || []) {
      const h = row.hint
      if (!hintMap[h]) {
        hintMap[h] = { collected_at: row.collected_at, count: 0 }
      }
      hintMap[h].count++
    }

    // hint 목록 배열로 반환 (최신순 정렬)
    const result = Object.entries(hintMap)
      .map(([hint, stat]) => ({ hint, ...stat }))
      .sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
