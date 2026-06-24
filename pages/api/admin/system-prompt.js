/**
 * /api/admin/system-prompt
 * Claude 프로젝트 지침(시스템 프롬프트) 조회 / 저장
 *
 * GET  /api/admin/system-prompt              → 현재 저장된 지침 반환 (인증 불필요 — MCP에서 호출)
 * POST /api/admin/system-prompt              → 지침 덮어쓰기 저장 (admin 인증 필요)
 *
 * Supabase 테이블:
 *   create table if not exists system_prompts (
 *     id      text primary key default 'main',
 *     content text not null default '',
 *     updated_at timestamptz not null
 *   );
 *   insert into system_prompts (id, content, updated_at)
 *   values ('main', '', now())
 *   on conflict (id) do nothing;
 */

import { createClient } from '@supabase/supabase-js'

function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // GET — MCP에서 인증 없이 호출 가능
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content, updated_at')
      .eq('id', 'main')
      .single()

    if (error || !data) return res.status(404).json({ error: '지침이 없습니다' })
    return res.status(200).json({ content: data.content, updated_at: data.updated_at })
  }

  // POST — admin 인증 필요
  if (req.method === 'POST') {
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_SECRET_TOKEN
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

    const { content } = req.body || {}
    if (typeof content !== 'string') return res.status(400).json({ error: 'content 필드 필요' })

    const { error } = await supabase
      .from('system_prompts')
      .upsert({ id: 'main', content, updated_at: nowKST() }, { onConflict: 'id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
