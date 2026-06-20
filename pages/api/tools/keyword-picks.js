/**
 * /api/tools/keyword-picks
 * 찜한 키워드 추가 / 삭제 / 조회
 *
 * GET    /api/tools/keyword-picks?tool_id=thumb-down   → 찜 목록
 * POST   /api/tools/keyword-picks                      → 찜 추가
 * DELETE /api/tools/keyword-picks?tool_id=x&keyword=y → 찜 삭제
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })

  // 조회
  if (req.method === 'GET') {
    const { tool_id } = req.query
    const q = supabase.from('keyword_picks').select('*').order('total', { ascending: false })
    if (tool_id) q.eq('tool_id', tool_id)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // 추가
  if (req.method === 'POST') {
    const { tool_id, keyword, pc, mobile, total, competition, hint, memo } = req.body
    if (!tool_id || !keyword) return res.status(400).json({ error: 'tool_id, keyword 필요' })
    const { data, error } = await supabase
      .from('keyword_picks')
      .upsert({ tool_id, keyword, pc, mobile, total, competition, hint, memo },
               { onConflict: 'tool_id,keyword' })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // 삭제
  if (req.method === 'DELETE') {
    const { tool_id, keyword } = req.query
    if (!tool_id || !keyword) return res.status(400).json({ error: 'tool_id, keyword 필요' })
    const { error } = await supabase
      .from('keyword_picks')
      .delete()
      .eq('tool_id', tool_id)
      .eq('keyword', keyword)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
