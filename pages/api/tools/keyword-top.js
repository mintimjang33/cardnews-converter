/**
 * /api/tools/keyword-top
 * 도구별 keyword_stats TOP 키워드 조회
 *
 * GET /api/tools/keyword-top?tool_id=thumb-down&limit=30
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

  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })

  const { tool_id, hint: hintParam, limit = '30' } = req.query
  const hint = hintParam || TOOL_HINTS[tool_id]
  if (!hint) return res.status(400).json({ error: 'hint 또는 tool_id 필요' })

  try {
    // TOP 키워드 조회
    const { data: topData, error: topError } = await supabase
      .from('keyword_stats')
      .select('keyword, pc, mobile, total, competition')
      .eq('hint', hint)
      .order('total', { ascending: false })
      .limit(Number(limit))

    if (topError) throw new Error(topError.message)

    // 찜한 키워드 목록 조회 (별표 표시용)
    const { data: picksData } = await supabase
      .from('keyword_picks')
      .select('keyword')
      .eq('tool_id', hint)

    const pickedSet = new Set((picksData || []).map(p => p.keyword))

    const results = (topData || []).map(item => ({
      ...item,
      picked: pickedSet.has(item.keyword),
    }))

    return res.status(200).json({ results })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
