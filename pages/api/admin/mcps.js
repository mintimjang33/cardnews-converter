import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function auth(req) {
  return req.headers['x-admin-token'] === process.env.ADMIN_SECRET_TOKEN
}

function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

// ── MCP Streamable HTTP 프로토콜로 JSON-RPC 요청 보내기
// 응답이 일반 JSON일 수도, text/event-stream(SSE)일 수도 있어서 둘 다 처리한다.
async function mcpRequest(url, sessionId, body) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const newSessionId = res.headers.get('mcp-session-id') || sessionId
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  let json = null
  if (contentType.includes('text/event-stream')) {
    // SSE 프레임("data: {...}") 중 마지막 JSON 데이터를 사용
    const dataLines = text.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim())
    for (const line of dataLines) {
      try { json = JSON.parse(line) } catch {}
    }
  } else {
    try { json = JSON.parse(text) } catch {}
  }
  return { json, sessionId: newSessionId, status: res.status, raw: text }
}

// ── MCP 서버에 initialize → notifications/initialized → tools/list 순서로 핸드셰이크 후 툴 목록 가져오기
async function fetchMcpTools(url) {
  const init = await mcpRequest(url, null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'downtools-admin-sync', version: '1.0.0' },
    },
  })
  if (init.json?.error) throw new Error(`initialize 실패: ${init.json.error.message || JSON.stringify(init.json.error)}`)
  if (!init.json?.result) throw new Error(`initialize 응답 이상 (status ${init.status}): ${init.raw.slice(0, 200)}`)

  const sessionId = init.sessionId

  // 알림(notification)은 응답 본문이 없을 수 있어 실패해도 무시
  try { await mcpRequest(url, sessionId, { jsonrpc: '2.0', method: 'notifications/initialized' }) } catch {}

  const list = await mcpRequest(url, sessionId, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  if (list.json?.error) throw new Error(`tools/list 실패: ${list.json.error.message || JSON.stringify(list.json.error)}`)
  const tools = list.json?.result?.tools
  if (!Array.isArray(tools)) throw new Error(`tools/list 응답 이상 (status ${list.status}): ${list.raw.slice(0, 200)}`)

  return tools.map(t => ({ name: t.name, description: t.description || '' }))
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: '인증 필요' })

  // ── GET: 서버 목록 + 각 서버의 툴 목록
  if (req.method === 'GET') {
    const { data: servers, error: se } = await supabase
      .from('mcp_connectors')
      .select('*')
      .order('created_at', { ascending: true })
    if (se) return res.status(500).json({ error: se.message })

    const { data: tools, error: te } = await supabase
      .from('mcp_tools')
      .select('*')
      .order('created_at', { ascending: true })
    if (te) return res.status(500).json({ error: te.message })

    const result = (servers || []).map(s => ({
      ...s,
      tools: (tools || []).filter(t => t.server_id === s.id),
    }))
    return res.json({ servers: result })
  }

  // ── POST: 서버 추가 or 툴 추가
  if (req.method === 'POST') {
    const { type, server_id, name, url, description } = req.body

    // 서버 추가
    if (type === 'server') {
      if (!name || !url) return res.status(400).json({ error: 'name, url 필수' })
      const row = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name, url,
        description: description || null,
        is_active: true,
        created_at: nowKST(),
      }
      const { error } = await supabase.from('mcp_connectors').insert([row])
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true, id: row.id })
    }

    // 툴 추가
    if (type === 'tool') {
      if (!server_id || !name) return res.status(400).json({ error: 'server_id, name 필수' })
      const row = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        server_id, name,
        description: description || null,
        is_active: true,
        created_at: nowKST(),
      }
      const { error } = await supabase.from('mcp_tools').insert([row])
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true, id: row.id })
    }

    return res.status(400).json({ error: 'type 필수 (server | tool)' })
  }

  // ── PATCH: 동기화 또는 서버 정보 수정
  if (req.method === 'PATCH' && req.body?.type === 'update_server') {
    const { id, name, url, description } = req.body
    if (!id) return res.status(400).json({ error: 'id 필수' })
    const patch = {}
    if (name !== undefined) patch.name = name
    if (url !== undefined) patch.url = url
    if (description !== undefined) patch.description = description
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: '수정할 내용이 없습니다' })
    const { error } = await supabase.from('mcp_connectors').update(patch).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  if (req.method === 'PATCH' && req.body?.type === 'sync') {
    const { server_id } = req.body
    if (!server_id) return res.status(400).json({ error: 'server_id 필수' })

    const { data: server, error: se } = await supabase
      .from('mcp_connectors').select('*').eq('id', server_id).single()
    if (se || !server) return res.status(404).json({ error: '서버를 찾을 수 없습니다' })

    let liveTools
    try {
      liveTools = await fetchMcpTools(server.url)
    } catch (e) {
      return res.status(502).json({ error: `MCP 서버 동기화 실패: ${e.message}` })
    }

    const { data: existing, error: te } = await supabase
      .from('mcp_tools').select('*').eq('server_id', server_id)
    if (te) return res.status(500).json({ error: te.message })

    const existingByName = new Map((existing || []).map(t => [t.name, t]))
    const liveNames = new Set(liveTools.map(t => t.name))

    let added = 0, updated = 0
    const upserts = []
    for (const t of liveTools) {
      const prev = existingByName.get(t.name)
      if (prev) {
        if (prev.description !== t.description) updated++
        upserts.push({ ...prev, description: t.description, updated_at: nowKST() })
      } else {
        added++
        upserts.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2) + added,
          server_id, name: t.name, description: t.description,
          group_name: '기타', is_active: true, created_at: nowKST(),
        })
      }
    }
    if (upserts.length > 0) {
      const { error: ue } = await supabase.from('mcp_tools').upsert(upserts, { onConflict: 'id' })
      if (ue) return res.status(500).json({ error: ue.message })
    }

    // DB에는 있지만 더 이상 서버에 없는 툴 — 자동 삭제하지 않고 목록만 알려줌 (그룹 분류 등 수동 정리 보호)
    const missing = (existing || []).filter(t => !liveNames.has(t.name)).map(t => t.name)

    return res.json({ ok: true, added, updated, missing, total: liveTools.length })
  }

  // ── DELETE: 서버 삭제 or 툴 삭제
  if (req.method === 'DELETE') {
    const { type, id } = req.body
    if (!id) return res.status(400).json({ error: 'id 필수' })

    const table = type === 'server' ? 'mcp_connectors' : 'mcp_tools'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
