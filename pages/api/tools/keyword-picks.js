/**
 * /api/tools/keyword-picks
 * 찜한 키워드 추가 / 삭제 / 조회 / 사용 처리
 *
 * GET    /api/tools/keyword-picks?tool_id=thumb-down            → 찜 목록
 * GET    /api/tools/keyword-picks?status=pending|used            → 미사용/사용됨만 필터링
 * POST   /api/tools/keyword-picks                                → 찜 추가 (upsert, used_at는 건드리지 않음)
 * PATCH  /api/tools/keyword-picks                                → 사용 처리 / 되돌리기
 * DELETE /api/tools/keyword-picks?tool_id=x&keyword=y           → 찜 완전 삭제
 *
 * used_at / used_in_title / used_in_slug 컬럼이 필요합니다 (최초 1회 추가):
 *   alter table keyword_picks
 *     add column if not exists used_at timestamptz,
 *     add column if not exists used_in_title text,
 *     add column if not exists used_in_slug text;
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
    const { tool_id, status } = req.query
    let q = supabase.from('keyword_picks').select('*').order('total', { ascending: false })
    if (tool_id) q = q.eq('tool_id', tool_id)
    if (status === 'used') q = q.not('used_at', 'is', null)
    if (status === 'pending') q = q.is('used_at', null)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // 추가 (찜) — used_at은 절대 건드리지 않음, 이미 사용 처리된 키워드를 다시 찜해도 사용 기록은 유지됨
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

  // 사용 처리 / 되돌리기
  if (req.method === 'PATCH') {
    const { tool_id, keyword, unmark, used_in_title, used_in_slug } = req.body
    if (!tool_id || !keyword) return res.status(400).json({ error: 'tool_id, keyword 필요' })
    const patch = unmark
      ? { used_at: null, used_in_title: null, used_in_slug: null }
      : { used_at: new Date().toISOString(), used_in_title: used_in_title || null, used_in_slug: used_in_slug || null }
    const { data, error } = await supabase
      .from('keyword_picks')
      .update(patch)
      .eq('tool_id', tool_id)
      .eq('keyword', keyword)
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
