/**
 * /api/admin/system-prompt
 * Claude 프로젝트 지침(시스템 프롬프트) 조회 / 저장
 *
 * GET  /api/admin/system-prompt?id=main|main2|reference|rss_sources|todo  → 현재 저장된 지침 반환 (인증 불필요 — MCP에서 호출)
 * POST /api/admin/system-prompt                                          → 지침 덮어쓰기 저장 (admin 인증 필요)
 *
 * id 파라미터로 탭(5종) 구분: main(본 지침) / main2(보조 지침·학습 메모) / reference(글쓰기 참고자료) / rss_sources(정보 소스) / todo(할일메모). 없거나 다섯 중 하나가 아니면 'main'.
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

const VALID_IDS = ['main', 'main2', 'reference', 'rss_sources', 'todo']

function resolveId(raw) {
  return VALID_IDS.includes(raw) ? raw : 'main'
}

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
    const id = resolveId(req.query.id)
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content, updated_at')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(200).json({ content: '', updated_at: '' })
    return res.status(200).json({ content: data.content, updated_at: data.updated_at })
  }

  // POST — admin 인증 필요
  if (req.method === 'POST') {
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_SECRET_TOKEN
    if (!isAdmin) return res.status(401).json({ error: '인증 필요' })

    const { content } = req.body || {}
    const id = resolveId(req.body?.id)
    if (typeof content !== 'string') return res.status(400).json({ error: 'content 필드 필요' })

    const { error } = await supabase
      .from('system_prompts')
      .upsert({ id, content, updated_at: nowKST() }, { onConflict: 'id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
