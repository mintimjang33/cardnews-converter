/**
 * /api/tools/keyword-golden
 * "황금키워드" 목록 — 검색량은 높고 경쟁은 낮은 키워드를 hint 구분 없이 전체에서 찾는다.
 *
 * GET /api/tools/keyword-golden?competition=낮음&limit=100
 *
 * competition을 비우면 기본값 "낮음"으로 조회합니다 (네이버 API가 내려주는 경쟁도 표기:
 * 낮음 / 중간 / 높음). 정렬은 total(합계 검색량) 내림차순이라, 위쪽일수록 더 좋은 후보입니다.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })

  const { competition = '낮음', limit = '100' } = req.query

  try {
    let q = supabase
      .from('keyword_stats')
      .select('hint, keyword, pc, mobile, total, competition')
      .order('total', { ascending: false })
      .limit(Number(limit))

    if (competition !== 'all') q = q.eq('competition', competition)

    const { data, error } = await q
    if (error) throw new Error(error.message)

    return res.status(200).json({ results: data || [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
