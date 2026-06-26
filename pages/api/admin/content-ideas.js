import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function auth(req) {
  const token = req.headers['x-admin-token']
  return token && token === process.env.ADMIN_TOKEN
}

function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

const TABS_KEY = 'content_idea_tabs'

const DEFAULT_TABS = [
  { id: 'general',  icon: '💡', label: '공통 아이디어' },
  { id: 'tool',     icon: '🛠️', label: '도구별 글감' },
  { id: 'keyword',  icon: '🔑', label: '키워드 후보' },
  { id: 'schedule', icon: '📅', label: '작성 예정' },
]

async function getTabs() {
  const { data } = await supabase.from('settings').select('value').eq('key', TABS_KEY).single()
  return data?.value || DEFAULT_TABS
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: '인증 필요' })

  if (req.method === 'GET') {
    const [tabs, { data: ideas, error }] = await Promise.all([
      getTabs(),
      supabase.from('content_ideas').select('*').order('created_at', { ascending: false }),
    ])
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ tabs, ideas: ideas || [] })
  }

  if (req.method === 'POST') {
    const { tab_id, tool_id, type, content, keyword, memo } = req.body
    if (!tab_id || !content) return res.status(400).json({ error: 'tab_id, content 필수' })
    const row = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      tab_id,
      tool_id: tool_id || null,
      type: type || 'idea',
      content,
      keyword: keyword || null,
      memo: memo || null,
      status: 'pending',
      created_at: nowKST(),
    }
    const { error } = await supabase.from('content_ideas').insert([row])
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true, id: row.id })
  }

  if (req.method === 'PATCH') {
    const { action } = req.body
    if (action === 'save_tabs') {
      await supabase.from('settings').upsert(
        { key: TABS_KEY, value: req.body.tabs, updated_at: nowKST() },
        { onConflict: 'key' }
      )
      return res.json({ ok: true })
    }
    if (action === 'update_status') {
      const { id, status } = req.body
      const { error } = await supabase
        .from('content_ideas').update({ status, updated_at: nowKST() }).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }
    return res.status(400).json({ error: '알 수 없는 action' })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id 필수' })
    const { error } = await supabase.from('content_ideas').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
