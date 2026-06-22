import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try { return createClient(url, key) } catch { return null }
}

function todayKey() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = req.headers['x-admin-token']
  if (!process.env.ADMIN_SECRET_TOKEN || token !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: '인증 실패' })
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(200).json({ call_count: 0, cost_usd: 0 })

  const today = todayKey()
  const { data } = await supabase.from('spelling_usage')
    .select('cost_usd, call_count').eq('date', today).single()

  res.status(200).json({
    call_count: data?.call_count ?? 0,
    cost_usd: data?.cost_usd ?? 0,
    date: today,
  })
}
