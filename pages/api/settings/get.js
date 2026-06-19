import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULTS = {
  cooldown: 12,
  adsOn: true,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) throw error
    const map = {}
    for (const row of data || []) map[row.key] = row.value
    res.status(200).json({
      cooldown: map['site:cooldown'] ?? DEFAULTS.cooldown,
      adsOn:    map['site:ads_on']   ?? DEFAULTS.adsOn,
    })
  } catch (err) {
    res.status(200).json(DEFAULTS)
  }
}
