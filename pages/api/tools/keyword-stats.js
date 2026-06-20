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

const TOOL_HINTS = {
  'thumb-down':    '썸네일',
  'sound-down':    '효과음',
  'clock-down':    '타이머',
  'voice-down':    '음성타이핑',
  'text-down':     '글자수세기',
  'cardnews-down': '카드뉴스',
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token   = req.headers['x-admin-token']
  const isAdmin = token === process.env.ADMIN_SECRET_TOKEN
  if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

  try {
    const result = {}

    for (const [toolId, hint] of Object.entries(TOOL_HINTS)) {
      const { data, error } = await supabase
        .from('keyword_stats')
        .select('collected_at')
        .eq('hint', hint)
        .order('collected_at', { ascending: false })
        .limit(1)

      if (error) {
        result[toolId] = { collected_at: null, count: 0 }
        continue
      }

      // 해당 hint의 키워드 총 개수
      const { count } = await supabase
        .from('keyword_stats')
        .select('*', { count: 'exact', head: true })
        .eq('hint', hint)

      result[toolId] = {
        collected_at: data?.[0]?.collected_at || null,
        count: count || 0,
      }
    }

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
